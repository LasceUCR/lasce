"""What every reader of NOAA's NGDC GOES archive shares.

The archive at ``BASE_URL`` is a tree of plain Apache directory listings, one
tree per spacecraft and product. SUVI (:mod:`app.clients.suvi`), EXIS
(:mod:`app.clients.exis`), MAG (:mod:`app.clients.mag`) and EHIS
(:mod:`app.clients.ehis`) differ in how their files are named and how often
they appear, but not in how a listing is read or a file is fetched, so that
part lives here once. EXIS, MAG and EHIS are all daily products filed by
month, so their month walk lives here too.
"""

from collections.abc import Sequence
from datetime import date
from html.parser import HTMLParser
from typing import Protocol
from urllib.parse import urljoin, urlparse

import httpx

BASE_URL = "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes"
SPACECRAFT = (16, 17, 18, 19)
DEFAULT_SPACECRAFT = 19
MAX_LISTING_BYTES = 8 * 1024 * 1024


class DailyFile(Protocol):
    """A file the archive publishes once per UTC day, possibly in several versions."""

    @property
    def day(self) -> date: ...

    @property
    def version(self) -> tuple[int, int, int]: ...


def month_directories(product_root: str, start: date, end: date) -> list[str]:
    """One ``product_root/YYYY/MM/`` URL per month the window touches, oldest first.

    Daily products (EXIS, MAG, EHIS) are filed in one directory per month. A window
    that crosses the first of a month spans two directories, and both have to
    be listed or the older half of the window is silently invisible.
    """
    if start > end:
        raise ValueError("The start of the window must not follow its end")
    urls = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        urls.append(f"{product_root}/{year:04d}/{month:02d}/")
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return urls


def newest_versions[F: DailyFile](files: Sequence[F]) -> list[F]:
    """The highest version of each day, most recent day first."""
    best: dict[date, F] = {}
    for file in files:
        current = best.get(file.day)
        if current is None or file.version > current.version:
            best[file.day] = file
    return sorted(best.values(), key=lambda file: file.day, reverse=True)


def check_spacecraft(spacecraft: int) -> None:
    """Raise ``ValueError`` for a GOES number the archive has no directory for."""
    if spacecraft not in SPACECRAFT:
        valid = ", ".join(str(number) for number in SPACECRAFT)
        raise ValueError(f"Invalid GOES spacecraft: {spacecraft}. Valid values are: {valid}.")


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        for name, value in attrs:
            if name == "href" and value:
                self.hrefs.append(value)


def parse_listing(html: str, directory: str, extension: str) -> list[str]:
    """Absolute URLs of the ``extension`` files directly inside ``directory``."""
    parser = _LinkParser()
    parser.feed(html)
    files = []
    for href in parser.hrefs:
        url = urljoin(directory, href)
        # Restrict fetches to direct children of the directory being listed.
        if not url.startswith(directory) or urlparse(url).query:
            continue
        child = url[len(directory) :]
        if not child or "/" in child or not child.endswith(extension):
            continue
        files.append(url)
    return sorted(set(files))


async def fetch_capped(
    client: httpx.AsyncClient, url: str, limit: int, missing_is_empty: bool = False
) -> bytes | None:
    """Read a URL, stopping as soon as it goes over ``limit``.

    Streaming means an oversized response is abandoned rather than read into
    memory first. ``missing_is_empty`` covers a directory the archive does not
    have, which is a normal answer rather than a failure.
    """
    data = bytearray()
    async with client.stream("GET", url) as response:
        if missing_is_empty and response.status_code == 404:
            return None
        response.raise_for_status()
        async for chunk in response.aiter_bytes():
            data.extend(chunk)
            if len(data) > limit:
                raise ValueError(f"Archive response exceeds the size limit: {url}")
    return bytes(data)
