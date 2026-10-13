"""The SUVI archive client, exercised without touching the network.

The file names are real ones from the GOES-19 archive, because the whole point
of :func:`parse_file_name` is that the archive's own spelling decides what a
frame is.
"""

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from app.clients.suvi import (
    SuviChannel,
    SuviDownloader,
    day_urls,
    parse_file_name,
    parse_listing,
)

LONG = "OR_SUVI-L1b-Fe093_G19_s20262610242071_e20262610242081_c20262610242247.fits.gz"
SHORT = "OR_SUVI-L1b-Fe093_G19_s20262610242508_e20262610242508_c20262610243076.fits.gz"
HELIUM = "OR_SUVI-L1b-He303_G19_s20262590000407_e20262590000417_c20262590000579.fits.gz"
OLD = "OR_SUVI-L1b-Fe093_G19_s20262610200071_e20262610200081_c20262610200247.fits.gz"
DIRECTORY = (
    "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/goes19/l1b/"
    "suvi-l1b-fe094/2026/09/18/"
)
NOW = datetime(2026, 9, 18, 2, 45, tzinfo=UTC)


def test_file_name_gives_the_observation_time_to_the_tenth_of_a_second() -> None:
    file = parse_file_name(LONG)
    assert file is not None
    assert file.channel is SuviChannel.FE093
    assert file.spacecraft == 19
    assert file.start == datetime(2026, 9, 18, 2, 42, 7, 100_000, tzinfo=UTC)
    assert file.end == datetime(2026, 9, 18, 2, 42, 8, 100_000, tzinfo=UTC)


def test_exposure_length_comes_from_the_stamps_alone() -> None:
    long_file, short_file = parse_file_name(LONG), parse_file_name(SHORT)
    assert long_file is not None and long_file.exposure == "long"
    assert short_file is not None and short_file.exposure == "short"


@pytest.mark.parametrize(
    "name",
    [
        "OR_EXIS-L1b-SFXR_G18_s20250051120000_e20250051120599_c20250051121000.nc",
        LONG.replace(".fits.gz", ".fits"),
        LONG[:-20],
        "?C=N;O=D",
        LONG.replace("Fe093", "Fe999"),
        # An end stamp ten seconds after the start is neither exposure length.
        LONG.replace("e20262610242081", "e20262610242171"),
    ],
)
def test_names_that_are_not_suvi_frames_are_skipped(name: str) -> None:
    assert parse_file_name(name) is None


def test_a_parsed_frame_remembers_the_url_it_was_found_at() -> None:
    file = parse_file_name(LONG, DIRECTORY + LONG)
    assert file is not None
    assert file.url == DIRECTORY + LONG


def test_listing_keeps_only_frames_directly_inside_the_directory() -> None:
    html = f"""
    <html><body>
    <a href="?C=N;O=D">Name</a>
    <a href="/platforms/">Parent Directory</a>
    <a href="{LONG}">{LONG}</a>
    <a href="{SHORT}">{SHORT}</a>
    <a href="nested/{LONG}">nested</a>
    <a href="../2026/09/17/{LONG}">yesterday</a>
    <a href="README.txt">README.txt</a>
    </body></html>
    """
    assert parse_listing(html, DIRECTORY) == [DIRECTORY + LONG, DIRECTORY + SHORT]


def test_a_listing_with_no_frames_yields_nothing() -> None:
    assert parse_listing("<html><body>empty</body></html>", DIRECTORY) == []


def test_a_window_crossing_midnight_lists_both_days() -> None:
    end = datetime(2026, 9, 18, 0, 5, tzinfo=UTC)
    assert day_urls(SuviChannel.FE093, 19, end - timedelta(minutes=10), end) == [
        DIRECTORY.replace("/2026/09/18/", "/2026/09/17/"),
        DIRECTORY,
    ]


def test_channels_whose_directory_differs_from_their_name_are_mapped() -> None:
    moment = datetime(2026, 9, 18, 12, tzinfo=UTC)
    assert day_urls(SuviChannel.FE093, 19, moment, moment)[0].endswith(
        "/suvi-l1b-fe094/2026/09/18/"
    )
    assert day_urls(SuviChannel.HE303, 19, moment, moment)[0].endswith(
        "/suvi-l1b-he304/2026/09/18/"
    )
    assert day_urls(SuviChannel.FE171, 16, moment, moment)[0].endswith(
        "/goes16/l1b/suvi-l1b-fe171/2026/09/18/"
    )


def test_a_window_that_runs_backwards_is_rejected() -> None:
    moment = datetime(2026, 9, 18, 12, tzinfo=UTC)
    with pytest.raises(ValueError, match="start of the window"):
        day_urls(SuviChannel.FE093, 19, moment, moment - timedelta(minutes=1))


def archive(*names: str) -> tuple[httpx.AsyncClient, list[str]]:
    """A client serving one directory listing, recording every URL requested."""
    requested: list[str] = []
    listing = "".join(f'<a href="{name}">{name}</a>' for name in names)

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        requested.append(url)
        if url.endswith("/"):
            return httpx.Response(200, text=f"<html><body>{listing}</body></html>")
        if url.endswith(".fits.gz"):
            return httpx.Response(200, content=b"fits-bytes")
        return httpx.Response(404)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler)), requested


def test_a_spacecraft_that_is_not_a_goes_satellite_is_rejected() -> None:
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(404)))
    with pytest.raises(ValueError, match="Invalid GOES spacecraft"):
        SuviDownloader(client, spacecraft=15)


async def test_listing_is_newest_first_and_excludes_frames_before_the_window() -> None:
    client, _ = archive(LONG, SHORT, OLD)
    async with client:
        files = await SuviDownloader(client).list_recent(
            SuviChannel.FE093, timedelta(minutes=10), exposure="both", now=NOW
        )
    # OLD was observed at 02:00, outside a ten minute window ending at 02:45.
    assert [file.name for file in files] == [SHORT, LONG]


async def test_only_the_requested_exposure_is_returned() -> None:
    client, _ = archive(LONG, SHORT)
    async with client:
        downloader = SuviDownloader(client)
        long_files = await downloader.list_recent(SuviChannel.FE093, now=NOW)
        short_files = await downloader.list_recent(SuviChannel.FE093, exposure="short", now=NOW)
    assert [file.name for file in long_files] == [LONG]
    assert [file.name for file in short_files] == [SHORT]


async def test_another_channel_in_the_same_listing_is_ignored() -> None:
    client, _ = archive(LONG, HELIUM)
    async with client:
        files = await SuviDownloader(client).list_recent(
            SuviChannel.FE093, exposure="both", now=NOW
        )
    assert [file.name for file in files] == [LONG]


async def test_download_fetches_only_the_newest_frame_by_default() -> None:
    client, requested = archive(LONG, SHORT)
    async with client:
        downloads = await SuviDownloader(client).download(
            SuviChannel.FE093, exposure="both", now=NOW
        )
    assert [download.file.name for download in downloads] == [SHORT]
    assert downloads[0].content == b"fits-bytes"
    assert [url for url in requested if url.endswith(".fits.gz")] == [DIRECTORY + SHORT]


async def test_an_empty_window_downloads_nothing() -> None:
    client, requested = archive(OLD)
    async with client:
        assert await SuviDownloader(client).download(SuviChannel.FE093, now=NOW) == []
    assert not [url for url in requested if url.endswith(".fits.gz")]


async def test_a_day_the_archive_does_not_have_is_skipped() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/09/17/"):
            return httpx.Response(404)
        return httpx.Response(200, text=f'<a href="{LONG}">{LONG}</a>')

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        files = await SuviDownloader(client).list_recent(
            SuviChannel.FE093, timedelta(hours=6), now=datetime(2026, 9, 18, 3, tzinfo=UTC)
        )
    assert [file.name for file in files] == [LONG]


async def test_an_archive_error_that_is_not_a_missing_day_fails_the_job() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(503))
    ) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await SuviDownloader(client).list_recent(SuviChannel.FE093, now=NOW)


async def test_a_lookback_or_limit_that_selects_nothing_is_rejected() -> None:
    client, _ = archive(LONG)
    async with client:
        downloader = SuviDownloader(client)
        with pytest.raises(ValueError, match="positive duration"):
            await downloader.list_recent(SuviChannel.FE093, timedelta(0), now=NOW)
        with pytest.raises(ValueError, match="at least one file"):
            await downloader.download(SuviChannel.FE093, limit=0, now=NOW)
