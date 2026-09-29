"""EXIS L1b daily files from NOAA's public GOES archive.

Unlike SUVI, which the archive publishes frame by frame, EXIS is published as
**one aggregated NetCDF per product per UTC day**, in one directory per month::

    goes19/l1b/exis-l1b-sfxr/2026/09/ops_exis-l1b-sfxr_g19_d20260927_v0-0-0.nc

Three things about that layout shape this client:

- A day's file appears roughly a day later (around 04:20 UTC the next
  morning), so "the newest file" is usually yesterday's, never today's.
- A window of days can cross a month boundary, and then two month directories
  have to be listed — the monthly version of SUVI's midnight trap.
- A day already published can be **republished** later, under the same name
  and with a newer ``Last-Modified``, or under a higher ``_vX-Y-Z``. The name
  alone therefore does not say whether a file has changed;
  :meth:`ExisDownloader.modified_at` asks the server.
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
# A day is 5 MB (SFXR) to 9 MB (SFEU); the ceiling only guards against a surprise.
MAX_FILE_BYTES = 32 * 1024 * 1024
EXTENSION = ".nc"

FILE_PATTERN = re.compile(r"^ops_exis-l1b-(sfeu|sfxr)_g(\d{2})_d(\d{8})_v(\d+)-(\d+)-(\d+)\.nc$")


class ExisProduct(StrEnum):
    """An EXIS L1b product, named as the rest of the system names it."""

    SFEU = "SFEU"
    SFXR = "SFXR"

    @property
    def url_segment(self) -> str:
        """The archive directory for this product."""
        return f"exis-l1b-{self.value.lower()}"


@dataclass(frozen=True)
class ExisFile:
    """One archived day of one product, described by its name alone."""

    name: str
    url: str
    product: ExisProduct
    spacecraft: int
    day: date
    version: tuple[int, int, int]

    @property
    def version_label(self) -> str:
        return "-".join(str(part) for part in self.version)


@dataclass(frozen=True)
class ExisDownload:
    """A daily file together with its bytes."""

    file: ExisFile
    content: bytes


def parse_file_name(name: str, url: str = "") -> ExisFile | None:
    """Describe an archive file name, or return ``None`` if it is not one.

    Anything unrecognised is skipped rather than raised on: a directory listing
    also carries sort links, parent links and occasional stray files.
    """
    match = FILE_PATTERN.fullmatch(name)
    if match is None:
        return None
    try:
        day = datetime.strptime(match[3], "%Y%m%d").date()
    except ValueError:
        return None
    return ExisFile(
        name=name,
        url=url or name,
        product=ExisProduct(match[1].upper()),
        spacecraft=int(match[2]),
        day=day,
        version=(int(match[4]), int(match[5]), int(match[6])),
    )


def month_urls(product: ExisProduct, spacecraft: int, start: date, end: date) -> list[str]:
    """One directory URL per month the window touches, oldest first.

    A window that crosses the first of a month spans two directories, and both
    have to be listed or the older half of the window is silently invisible.
    """
    if start > end:
        raise ValueError("The start of the window must not follow its end")
    urls = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        urls.append(
            f"{BASE_URL}/goes{spacecraft}/l1b/{product.url_segment}/{year:04d}/{month:02d}/"
        )
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return urls


def newest_versions(files: list[ExisFile]) -> list[ExisFile]:
    """The highest version of each day, most recent day first."""
    best: dict[date, ExisFile] = {}
    for file in files:
        current = best.get(file.day)
        if current is None or file.version > current.version:
            best[file.day] = file
    return sorted(best.values(), key=lambda file: file.day, reverse=True)


class ExisDownloader:
    """Reads the NOAA EXIS archive for one GOES spacecraft.

    The caller owns the HTTP client, so a processor can keep its timeouts in
    one place.
    """

    def __init__(self, client: httpx.AsyncClient, spacecraft: int = DEFAULT_SPACECRAFT) -> None:
        ngdc.check_spacecraft(spacecraft)
        self._client = client
        self.spacecraft = spacecraft

    async def list_recent(
        self,
        product: ExisProduct,
        lookback_days: int = DEFAULT_LOOKBACK_DAYS,
        today: date | None = None,
    ) -> list[ExisFile]:
        """The files of the last ``lookback_days`` days before ``today``, most
        recent day first and one (the highest version) per day.

        Nothing is downloaded here.
        """
        if lookback_days < 1:
            raise ValueError("The lookback must be at least one day")
        end = today or datetime.now(UTC).date()
        start = end - timedelta(days=lookback_days)
        return await self._list(product, start, end)

    async def list_day(self, product: ExisProduct, day: date) -> list[ExisFile]:
        """The file for one specific ``day``, as a list of zero or one."""
        return await self._list(product, day, day)

    async def modified_at(self, file: ExisFile) -> datetime | None:
        """The server's ``Last-Modified`` for ``file``, or ``None`` if it sent none.

        This is what tells a republished day apart from one already ingested;
        the name stays the same when NOAA reprocesses a day in place.
        """
        response = await self._client.head(file.url)
        response.raise_for_status()
        header = response.headers.get("last-modified")
        if not header:
            return None
        try:
            return parsedate_to_datetime(header).astimezone(UTC)
        except (TypeError, ValueError):
            return None

    async def fetch(self, file: ExisFile) -> ExisDownload:
        """Download one file already found by :meth:`list_recent` or :meth:`list_day`."""
        content = await ngdc.fetch_capped(self._client, file.url, MAX_FILE_BYTES)
        # Only a listing may answer "missing"; a file we just listed must exist.
        if content is None:  # pragma: no cover - fetch_capped only returns None on request
            raise ValueError(f"EXIS file disappeared from the archive: {file.url}")
        return ExisDownload(file=file, content=content)

    async def _list(self, product: ExisProduct, start: date, end: date) -> list[ExisFile]:
        listings = await asyncio.gather(
            *(self._list_month(url) for url in month_urls(product, self.spacecraft, start, end))
        )
        return newest_versions(
            [
                file
                for listing in listings
                for file in listing
                if file.product is product
                and file.spacecraft == self.spacecraft
                and start <= file.day <= end
            ]
        )

    async def _list_month(self, directory: str) -> list[ExisFile]:
        listing = await ngdc.fetch_capped(
            self._client, directory, MAX_LISTING_BYTES, missing_is_empty=True
        )
        if listing is None:
            return []
        files = []
        for url in ngdc.parse_listing(listing.decode("utf-8", "replace"), directory, EXTENSION):
            file = parse_file_name(url.rsplit("/", 1)[-1], url)
            if file is not None:
                files.append(file)
        return files
