"""SUVI L1b files from NOAA's public GOES archive.

The archive exposes one Apache directory listing per UTC day and channel, so
finding the most recent image means listing the days a time window touches and
reading the timestamps out of the file names. Listing is cheap; only the files
the caller asks for are downloaded.

Two things about the archive are easy to get wrong:

- The URL segment and the channel token inside the file name do not agree for
  two channels. GOES-19 writes ``Fe093`` into files that live under
  ``suvi-l1b-fe094``, and ``He303`` into ``suvi-l1b-he304``. :class:`SuviChannel`
  carries both spellings so a download can be matched against what was asked.
- Exposure length is derivable from the name: the start and end stamps are one
  second apart for a long exposure and equal for a short one. There is no need
  to open the FITS file to tell them apart.
"""

import asyncio
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Literal

import httpx

from app.clients import ngdc
from app.clients.ngdc import BASE_URL, DEFAULT_SPACECRAFT, MAX_LISTING_BYTES

DEFAULT_LOOKBACK = timedelta(minutes=10)
# A compressed L1b frame is 1-2 MB; the ceiling only guards against a surprise.
MAX_FILE_BYTES = 16 * 1024 * 1024
EXTENSION = ".fits.gz"

Exposure = Literal["long", "short"]
ExposureFilter = Literal["long", "short", "both"]

FILE_PATTERN = re.compile(
    r"^OR_SUVI-L1b-([A-Za-z]{2}\d{3})_G(\d{2})_s(\d{14})_e(\d{14})_c(\d{14})\.fits\.gz$"
)


class SuviChannel(StrEnum):
    """A SUVI passband, named as the file names spell it."""

    FE093 = "Fe093"
    FE131 = "Fe131"
    FE171 = "Fe171"
    FE195 = "Fe195"
    FE284 = "Fe284"
    HE303 = "He303"

    @property
    def url_segment(self) -> str:
        """The archive directory for this channel.

        Fe093 and He303 are stored under the wavelengths the earlier GOES
        spacecraft used, which is why this is a lookup rather than the value
        lowercased.
        """
        return f"suvi-l1b-{_URL_SEGMENTS[self]}"


_URL_SEGMENTS = {
    SuviChannel.FE093: "fe094",
    SuviChannel.FE131: "fe131",
    SuviChannel.FE171: "fe171",
    SuviChannel.FE195: "fe195",
    SuviChannel.FE284: "fe284",
    SuviChannel.HE303: "he304",
}


@dataclass(frozen=True)
class SuviFile:
    """One archived frame, described by its name alone."""

    name: str
    url: str
    channel: SuviChannel
    spacecraft: int
    start: datetime
    end: datetime
    exposure: Exposure


@dataclass(frozen=True)
class SuviDownload:
    """A frame together with its bytes."""

    file: SuviFile
    content: bytes


def _instant(stamp: str) -> datetime:
    """Decode ``YYYYJJJHHMMSSt``, where the last digit is tenths of a second."""
    return datetime.strptime(stamp[:-1], "%Y%j%H%M%S").replace(tzinfo=UTC) + timedelta(
        milliseconds=int(stamp[-1]) * 100
    )


def parse_file_name(name: str, url: str = "") -> SuviFile | None:
    """Describe an archive file name, or return ``None`` if it is not one.

    Anything unrecognised is skipped rather than raised on: a directory listing
    also carries sort links, parent links and occasional stray files.
    """
    match = FILE_PATTERN.fullmatch(name)
    if match is None:
        return None
    try:
        channel = SuviChannel(match[1])
    except ValueError:
        return None
    try:
        start, end = _instant(match[3]), _instant(match[4])
    except ValueError:
        return None
    seconds = round((end - start).total_seconds())
    if seconds not in (0, 1):
        return None
    return SuviFile(
        name=name,
        url=url or name,
        channel=channel,
        spacecraft=int(match[2]),
        start=start,
        end=end,
        exposure="long" if seconds == 1 else "short",
    )


def parse_listing(html: str, directory: str) -> list[str]:
    """Absolute URLs of the ``.fits.gz`` files directly inside ``directory``."""
    return ngdc.parse_listing(html, directory, EXTENSION)


def day_urls(channel: SuviChannel, spacecraft: int, start: datetime, end: datetime) -> list[str]:
    """One directory URL per UTC day the window touches, oldest first.

    A window that crosses midnight spans two directories, and both have to be
    listed or the older half of the window is silently invisible.
    """
    if start > end:
        raise ValueError("The start of the window must not follow its end")
    days = []
    day = start.astimezone(UTC).date()
    last = end.astimezone(UTC).date()
    while day <= last:
        days.append(f"{BASE_URL}/goes{spacecraft}/l1b/{channel.url_segment}/{day:%Y/%m/%d}/")
        day += timedelta(days=1)
    return days


class SuviDownloader:
    """Reads the NOAA archive for one GOES spacecraft.

    The caller owns the HTTP client, so a processor can share one client across
    several channels and keep its timeouts in one place.
    """

    def __init__(self, client: httpx.AsyncClient, spacecraft: int = DEFAULT_SPACECRAFT) -> None:
        ngdc.check_spacecraft(spacecraft)
        self._client = client
        self.spacecraft = spacecraft

    async def list_recent(
        self,
        channel: SuviChannel,
        lookback: timedelta = DEFAULT_LOOKBACK,
        exposure: ExposureFilter = "long",
        now: datetime | None = None,
    ) -> list[SuviFile]:
        """Frames observed within ``lookback`` of ``now``, most recent first.

        Nothing is downloaded here.
        """
        if lookback <= timedelta(0):
            raise ValueError("The lookback must be a positive duration")
        end = (now or datetime.now(UTC)).astimezone(UTC)
        start = end - lookback
        listings = await asyncio.gather(
            *(self._list_day(url) for url in day_urls(channel, self.spacecraft, start, end))
        )
        files = [
            file
            for listing in listings
            for file in listing
            if file.channel is channel
            and start <= file.start <= end
            and (exposure == "both" or file.exposure == exposure)
        ]
        return sorted(files, key=lambda file: (file.start, file.name), reverse=True)

    async def download(
        self,
        channel: SuviChannel,
        lookback: timedelta = DEFAULT_LOOKBACK,
        exposure: ExposureFilter = "long",
        limit: int = 1,
        now: datetime | None = None,
    ) -> list[SuviDownload]:
        """Download the ``limit`` most recent frames in the window.

        ``limit=1`` is the common case: the latest image of one channel.
        """
        if limit < 1:
            raise ValueError("The limit must be at least one file")
        files = await self.list_recent(channel, lookback, exposure, now)
        return list(await asyncio.gather(*(self.fetch(file) for file in files[:limit])))

    async def fetch(self, file: SuviFile) -> SuviDownload:
        """Download one frame already found by :meth:`list_recent`."""
        content = await self._fetch(file.url)
        # Only a listing may answer "missing"; a frame we just listed must exist.
        if content is None:
            raise ValueError(f"SUVI frame disappeared from the archive: {file.url}")
        return SuviDownload(file=file, content=content)

    async def _list_day(self, directory: str) -> list[SuviFile]:
        listing = await self._fetch(directory, MAX_LISTING_BYTES, missing_is_empty=True)
        if listing is None:
            return []
        files = []
        for url in parse_listing(listing.decode("utf-8", "replace"), directory):
            file = parse_file_name(url.rsplit("/", 1)[-1], url)
            if file is not None:
                files.append(file)
        return files

    async def _fetch(
        self, url: str, limit: int = MAX_FILE_BYTES, missing_is_empty: bool = False
    ) -> bytes | None:
        return await ngdc.fetch_capped(self._client, url, limit, missing_is_empty)
