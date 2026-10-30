"""SEISS daily files from NOAA's public GOES archive.

The ``seiss-pipeline`` ingests one SEISS product per run. Each is published,
like EXIS (:mod:`app.clients.exis`) and MAG (:mod:`app.clients.mag`), as one
NetCDF per UTC day, in one directory per month, about a day late (around
04:30 UTC the next morning)::

    goes19/l1b/seis-l1b-ehis/2026/10/ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc
    goes19/l2/data/sgps-l2-avg1m/2026/10/sci_sgps-l2-avg1m_g19_d20261027_v3-0-3.nc
    goes19/l2/data/mpsh-l2-avg1m_science/2026/10/sci_mpsh-l2-avg1m_g19_d20261027_v2-0-3.nc

So the same three things shape this client: the newest file is usually
yesterday's, a window can cross a month boundary, and a day can be
republished under the same name (newer ``Last-Modified``) or a higher
``_vX-Y-Z``. The month walk and version selection live in
:mod:`app.clients.ngdc`, shared with EXIS and MAG.

The products differ only in where they live and how they are named:

- **EHIS** has no L2 product, so its L1b daily aggregation (5-minute fluxes,
  about 300 KB a day) is read.
- **SGPS** is read from NOAA's L2 one-minute averages (0.4 to 2.5 MB a day).
- **MPSH** is read from NOAA's L2 one-minute averages too (about 1 MB a day),
  from ``mpsh-l2-avg1m_science``: the directory without the suffix stopped
  being updated in January 2026.

MPS-LO is absent on purpose: NOAA publishes no L2 one-minute product for it,
only a ~220 MB L1b day. See `docs/seiss-pipeline.md`.
"""

import asyncio
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from email.utils import parsedate_to_datetime
from enum import StrEnum

import httpx

from app.clients import ngdc
from app.clients.ngdc import BASE_URL, DEFAULT_SPACECRAFT, MAX_LISTING_BYTES

DEFAULT_LOOKBACK_DAYS = 3
# The largest day seen is 2.5 MB (SGPS, late 2024); the ceiling only guards against a surprise.
MAX_FILE_BYTES = 16 * 1024 * 1024
EXTENSION = ".nc"


class SeissProduct(StrEnum):
    """A SEISS product, named as the rest of the system names it."""

    EHIS = "EHIS"
    SGPS = "SGPS"
    MPSH = "MPSH"

    @property
    def directory(self) -> str:
        """The archive directory below ``goes{NN}/``."""
        return _DIRECTORIES[self]

    @property
    def file_pattern(self) -> re.Pattern[str]:
        """The daily file name: spacecraft, ``YYYYMMDD`` and the three version parts."""
        return _FILE_PATTERNS[self]


_DIRECTORIES = {
    SeissProduct.EHIS: "l1b/seis-l1b-ehis",
    SeissProduct.SGPS: "l2/data/sgps-l2-avg1m",
    SeissProduct.MPSH: "l2/data/mpsh-l2-avg1m_science",
}

_FILE_PATTERNS = {
    SeissProduct.EHIS: re.compile(r"^ops_seis-l1b-ehis_g(\d{2})_d(\d{8})_v(\d+)-(\d+)-(\d+)\.nc$"),
    SeissProduct.SGPS: re.compile(r"^sci_sgps-l2-avg1m_g(\d{2})_d(\d{8})_v(\d+)-(\d+)-(\d+)\.nc$"),
    SeissProduct.MPSH: re.compile(r"^sci_mpsh-l2-avg1m_g(\d{2})_d(\d{8})_v(\d+)-(\d+)-(\d+)\.nc$"),
}


@dataclass(frozen=True)
class SeissFile:
    """One archived day of one product, described by its name alone."""

    name: str
    url: str
    product: SeissProduct
    spacecraft: int
    day: date
    version: tuple[int, int, int]

    @property
    def version_label(self) -> str:
        return "-".join(str(part) for part in self.version)


@dataclass(frozen=True)
class SeissDownload:
    """A daily file together with its bytes."""

    file: SeissFile
    content: bytes


def parse_file_name(product: SeissProduct, name: str, url: str = "") -> SeissFile | None:
    """Describe an archive file name of ``product``, or return ``None`` if it is not one.

    Anything unrecognised is skipped rather than raised on: a directory listing
    also carries sort links, parent links and occasional stray files.
    """
    match = product.file_pattern.fullmatch(name)
    if match is None:
        return None
    try:
        day = datetime.strptime(match[2], "%Y%m%d").date()
    except ValueError:
        return None
    return SeissFile(
        name=name,
        url=url or name,
        product=product,
        spacecraft=int(match[1]),
        day=day,
        version=(int(match[3]), int(match[4]), int(match[5])),
    )


def month_urls(product: SeissProduct, spacecraft: int, start: date, end: date) -> list[str]:
    """One directory URL per month the window touches, oldest first."""
    return ngdc.month_directories(f"{BASE_URL}/goes{spacecraft}/{product.directory}", start, end)


class SeissDownloader:
    """Reads the NOAA daily archive of one SEISS product for one GOES spacecraft.

    The caller owns the HTTP client, so a processor can keep its timeouts in
    one place.
    """

    def __init__(
        self,
        client: httpx.AsyncClient,
        product: SeissProduct,
        spacecraft: int = DEFAULT_SPACECRAFT,
    ) -> None:
        ngdc.check_spacecraft(spacecraft)
        self._client = client
        self.product = product
        self.spacecraft = spacecraft

    async def list_recent(
        self, lookback_days: int = DEFAULT_LOOKBACK_DAYS, today: date | None = None
    ) -> list[SeissFile]:
        """The files of the last ``lookback_days`` days before ``today``, most
        recent day first and one (the highest version) per day.

        Nothing is downloaded here.
        """
        if lookback_days < 1:
            raise ValueError("The lookback must be at least one day")
        end = today or datetime.now(UTC).date()
        start = end - timedelta(days=lookback_days)
        return await self._list(start, end)

    async def list_day(self, day: date) -> list[SeissFile]:
        """The file for one specific ``day``, as a list of zero or one."""
        return await self._list(day, day)

    async def modified_at(self, file: SeissFile) -> datetime | None:
        """The server's ``Last-Modified`` for ``file``, or ``None`` if it sent none."""
        response = await self._client.head(file.url)
        response.raise_for_status()
        header = response.headers.get("last-modified")
        if not header:
            return None
        try:
            return parsedate_to_datetime(header).astimezone(UTC)
        except (TypeError, ValueError):
            return None

    async def fetch(self, file: SeissFile) -> SeissDownload:
        """Download one file already found by :meth:`list_recent` or :meth:`list_day`."""
        content = await ngdc.fetch_capped(self._client, file.url, MAX_FILE_BYTES)
        # Only a listing may answer "missing"; a file we just listed must exist.
        if content is None:  # pragma: no cover - fetch_capped only returns None on request
            raise ValueError(f"SEISS file disappeared from the archive: {file.url}")
        return SeissDownload(file=file, content=content)

    async def _list(self, start: date, end: date) -> list[SeissFile]:
        listings = await asyncio.gather(
            *(
                self._list_month(url)
                for url in month_urls(self.product, self.spacecraft, start, end)
            )
        )
        return ngdc.newest_versions(
            [
                file
                for listing in listings
                for file in listing
                if file.spacecraft == self.spacecraft and start <= file.day <= end
            ]
        )

    async def _list_month(self, directory: str) -> list[SeissFile]:
        listing = await ngdc.fetch_capped(
            self._client, directory, MAX_LISTING_BYTES, missing_is_empty=True
        )
        if listing is None:
            return []
        files = []
        for url in ngdc.parse_listing(listing.decode("utf-8", "replace"), directory, EXTENSION):
            file = parse_file_name(self.product, url.rsplit("/", 1)[-1], url)
            if file is not None:
                files.append(file)
        return files
