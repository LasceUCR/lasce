"""The NGDC archive helpers SUVI and EXIS share, tested on their own.

These were extracted from the SUVI client. ``test_suvi.py`` still pins the
behaviour through ``SuviDownloader``; this file pins it at the shared seam, so
a change made for EXIS cannot quietly change what SUVI fetches.
"""

import httpx
import pytest

from app.clients import ngdc

DIRECTORY = f"{ngdc.BASE_URL}/goes19/l1b/exis-l1b-sfxr/2026/09/"


def client(transport: httpx.MockTransport) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=transport)


def test_listing_keeps_direct_children_with_the_requested_extension() -> None:
    html = "".join(
        f'<a href="{href}">x</a>'
        for href in (
            "b.nc",
            "a.nc",
            "a.nc",  # listed twice
            "frame.fits.gz",  # another extension
            "sub/c.nc",  # not a direct child
            "../d.nc",  # outside the directory
            "?C=M;O=A",  # a sort link
            "e.nc?download=1",  # a query string
            "https://elsewhere.test/f.nc",  # another host
            "",
        )
    )

    assert ngdc.parse_listing(html, DIRECTORY, ".nc") == [DIRECTORY + "a.nc", DIRECTORY + "b.nc"]
    assert ngdc.parse_listing(html, DIRECTORY, ".fits.gz") == [DIRECTORY + "frame.fits.gz"]


@pytest.mark.parametrize("spacecraft", [15, 20])
def test_a_spacecraft_the_archive_has_no_tree_for_is_rejected(spacecraft: int) -> None:
    with pytest.raises(ValueError, match="Valid values are: 16, 17, 18, 19"):
        ngdc.check_spacecraft(spacecraft)


@pytest.mark.parametrize("spacecraft", ngdc.SPACECRAFT)
def test_every_goes_r_spacecraft_is_accepted(spacecraft: int) -> None:
    ngdc.check_spacecraft(spacecraft)


async def test_a_response_within_the_limit_is_returned_whole() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(200, content=b"0123456789"))
    async with client(transport) as http:
        assert await ngdc.fetch_capped(http, DIRECTORY, 10) == b"0123456789"


async def test_a_response_over_the_limit_is_abandoned() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(200, content=b"0123456789!"))
    async with client(transport) as http:
        with pytest.raises(ValueError, match="exceeds the size limit"):
            await ngdc.fetch_capped(http, DIRECTORY, 10)


async def test_a_missing_directory_is_empty_only_when_asked() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(404))
    async with client(transport) as http:
        assert await ngdc.fetch_capped(http, DIRECTORY, 10, missing_is_empty=True) is None
        with pytest.raises(httpx.HTTPStatusError):
            await ngdc.fetch_capped(http, DIRECTORY, 10)


async def test_a_server_error_fails_even_when_missing_is_empty() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(503))
    async with client(transport) as http:
        with pytest.raises(httpx.HTTPStatusError):
            await ngdc.fetch_capped(http, DIRECTORY, 10, missing_is_empty=True)
