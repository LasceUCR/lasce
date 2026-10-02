"""What every reader of NOAA's NGDC GOES archive shares.

The archive at ``BASE_URL`` is a tree of plain Apache directory listings, one
tree per spacecraft and product. SUVI (:mod:`app.clients.suvi`) and EXIS
(:mod:`app.clients.exis`) differ in how their files are named and how often
they appear, but not in how a listing is read or a file is fetched, so that
part lives here once.
"""

from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

BASE_URL = "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes"
SPACECRAFT = (16, 17, 18, 19)
DEFAULT_SPACECRAFT = 19
MAX_LISTING_BYTES = 8 * 1024 * 1024


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
