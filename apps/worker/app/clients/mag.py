"""MAG L2 geomagnetic field files from NOAA's public GOES archive.

The ``mag-pipeline`` ingests ``magn-l2-avg1m``: the magnetometer's field
averaged over one minute, in every coordinate frame NOAA computes. Like EXIS
(:mod:`app.clients.exis`), it is published as **one NetCDF per UTC day**, in
one directory per month, about a day late (around 04:00 UTC the next morning)::

    goes19/l2/data/magn-l2-avg1m/2026/10/dn_magn-l2-avg1m_g19_d20261014_v2-0-4.nc

So the same three things shape this client: the newest file is usually
yesterday's, a window can cross a month boundary, and a day can be
republished under the same name (newer ``Last-Modified``) or a higher
``_vX-Y-Z``. The month walk and version selection live in
:mod:`app.clients.ngdc`, shared with EXIS.

The 1-minute product was chosen over the 10 Hz L1b ``mag-l1b-flat`` (about
150 MB a day) because ``/datos`` never charts more than 360 points: 1 440
readings a day already exceed what a chart shows, at 1 % of the download.
"""

import asyncio
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from email.utils import parsedate_to_datetime

import httpx

from app.clients import ngdc
from app.clients.ngdc import BASE_URL, DEFAULT_SPACECRAFT, MAX_LISTING_BYTES

DEFAULT_LOOKBACK_DAYS = 3
# A day is about 1.2 MB; the ceiling only guards against a surprise.
MAX_FILE_BYTES = 8 * 1024 * 1024
EXTENSION = ".nc"
PRODUCT_SEGMENT = "magn-l2-avg1m"

FILE_PATTERN = re.compile(r"^dn_magn-l2-avg1m_g(\d{2})_d(\d{8})_v(\d+)-(\d+)-(\d+)\.nc$")


@dataclass(frozen=True)
class MagFile:
    """One archived day, described by its name alone."""

    name: str
    url: str
    spacecraft: int
    day: date
    version: tuple[int, int, int]

    @property
    def version_label(self) -> str:
        return "-".join(str(part) for part in self.version)


@dataclass(frozen=True)
class MagDownload:
    """A daily file together with its bytes."""

    file: MagFile
    content: bytes


def parse_file_name(name: str, url: str = "") -> MagFile | None:
    """Describe an archive file name, or return ``None`` if it is not one.

    Anything unrecognised is skipped rather than raised on: a directory listing
    also carries sort links, parent links and occasional stray files.
    """
    match = FILE_PATTERN.fullmatch(name)
    if match is None:
        return None
    try:
        day = datetime.strptime(match[2], "%Y%m%d").date()
    except ValueError:
        return None
    return MagFile(
        name=name,
        url=url or name,
        spacecraft=int(match[1]),
        day=day,
        version=(int(match[3]), int(match[4]), int(match[5])),
    )


def month_urls(spacecraft: int, start: date, end: date) -> list[str]:
    """One directory URL per month the window touches, oldest first."""
    return ngdc.month_directories(
        f"{BASE_URL}/goes{spacecraft}/l2/data/{PRODUCT_SEGMENT}", start, end
    )


class MagDownloader:
    """Reads the NOAA MAG 1-minute archive for one GOES spacecraft.

    The caller owns the HTTP client, so a processor can keep its timeouts in
    one place.
    """

    def __init__(self, client: httpx.AsyncClient, spacecraft: int = DEFAULT_SPACECRAFT) -> None:
        ngdc.check_spacecraft(spacecraft)
        self._client = client
        self.spacecraft = spacecraft

    async def list_recent(
        self, lookback_days: int = DEFAULT_LOOKBACK_DAYS, today: date | None = None
    ) -> list[MagFile]:
        """The files of the last ``lookback_days`` days before ``today``, most
        recent day first and one (the highest version) per day.

        Nothing is downloaded here.
        """
        if lookback_days < 1:
            raise ValueError("The lookback must be at least one day")
        end = today or datetime.now(UTC).date()
        start = end - timedelta(days=lookback_days)
        return await self._list(start, end)

    async def list_day(self, day: date) -> list[MagFile]:
        """The file for one specific ``day``, as a list of zero or one."""
        return await self._list(day, day)

    async def modified_at(self, file: MagFile) -> datetime | None:
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

    async def fetch(self, file: MagFile) -> MagDownload:
        """Download one file already found by :meth:`list_recent` or :meth:`list_day`."""
        content = await ngdc.fetch_capped(self._client, file.url, MAX_FILE_BYTES)
        # Only a listing may answer "missing"; a file we just listed must exist.
        if content is None:  # pragma: no cover - fetch_capped only returns None on request
            raise ValueError(f"MAG file disappeared from the archive: {file.url}")
        return MagDownload(file=file, content=content)

    async def _list(self, start: date, end: date) -> list[MagFile]:
        listings = await asyncio.gather(
            *(self._list_month(url) for url in month_urls(self.spacecraft, start, end))
        )
        return ngdc.newest_versions(
            [
                file
                for listing in listings
                for file in listing
                if file.spacecraft == self.spacecraft and start <= file.day <= end
            ]
        )

    async def _list_month(self, directory: str) -> list[MagFile]:
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
