"""The EXIS archive client, exercised without touching the network.

The file names follow the real GOES-19 archive, where one file holds one day
of one product and lives in a per-month directory.
"""

from datetime import UTC, date, datetime
from typing import Any

import httpx
import pytest

from app.clients import exis
from app.clients.exis import (
    ExisDownloader,
    ExisFile,
    ExisProduct,
    month_urls,
    newest_versions,
    parse_file_name,
)

SFXR = "ops_exis-l1b-sfxr_g19_d20260927_v0-0-0.nc"
SFEU = "ops_exis-l1b-sfeu_g19_d20260927_v0-0-0.nc"
ROOT = "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/goes19/l1b/"
SEPTEMBER = f"{ROOT}exis-l1b-sfxr/2026/09/"
OCTOBER = f"{ROOT}exis-l1b-sfxr/2026/10/"


def name(day: date, version: str = "0-0-0", product: str = "sfxr", spacecraft: int = 19) -> str:
    return f"ops_exis-l1b-{product}_g{spacecraft}_d{day:%Y%m%d}_v{version}.nc"


def listing(*names: str) -> str:
    links = "".join(f'<a href="{entry}">{entry}</a>' for entry in names)
    return f'<html><body><a href="?C=M;O=A">sort</a><a href="../">Parent</a>{links}</body></html>'


def downloader(handler: Any, spacecraft: int = 19) -> tuple[ExisDownloader, list[str]]:
    requested: list[str] = []

    def recording(request: httpx.Request) -> httpx.Response:
        requested.append(f"{request.method} {request.url}")
        response: httpx.Response = handler(request)
        return response

    client = httpx.AsyncClient(transport=httpx.MockTransport(recording))
    return ExisDownloader(client, spacecraft=spacecraft), requested


def test_file_name_gives_the_product_spacecraft_day_and_version() -> None:
    file = parse_file_name(SFXR, f"{SEPTEMBER}{SFXR}")
    assert file == ExisFile(
        name=SFXR,
        url=f"{SEPTEMBER}{SFXR}",
        product=ExisProduct.SFXR,
        spacecraft=19,
        day=date(2026, 9, 27),
        version=(0, 0, 0),
    )
    assert file.version_label == "0-0-0"

    euv = parse_file_name(SFEU)
    assert euv is not None
    assert euv.product is ExisProduct.SFEU
    assert euv.url == SFEU


@pytest.mark.parametrize(
    "candidate",
    [
        "OR_SUVI-L1b-Fe093_G19_s20262610242071_e20262610242081_c20262610242247.fits.gz",
        "ops_exis-l1b-sfxr_g19_d20261340_v0-0-0.nc",
        "ops_exis-l1b-mpsh_g19_d20260927_v0-0-0.nc",
        "ops_exis-l1b-sfxr_g19_d20260927_v0-0-0.nc.md5",
    ],
)
def test_anything_that_is_not_a_daily_exis_file_is_skipped(candidate: str) -> None:
    assert parse_file_name(candidate) is None


def test_product_knows_its_archive_directory() -> None:
    assert ExisProduct.SFEU.url_segment == "exis-l1b-sfeu"
    assert ExisProduct.SFXR.url_segment == "exis-l1b-sfxr"


def test_a_window_crossing_a_month_lists_both_months() -> None:
    urls = month_urls(ExisProduct.SFXR, 19, date(2026, 9, 29), date(2026, 10, 2))
    assert urls == [SEPTEMBER, OCTOBER]


def test_a_window_crossing_the_year_rolls_the_year_over() -> None:
    urls = month_urls(ExisProduct.SFEU, 18, date(2025, 12, 30), date(2026, 1, 1))
    assert [url.rsplit("/l1b/", 1)[1] for url in urls] == [
        "exis-l1b-sfeu/2025/12/",
        "exis-l1b-sfeu/2026/01/",
    ]


def test_a_backwards_window_is_rejected() -> None:
    with pytest.raises(ValueError, match="start"):
        month_urls(ExisProduct.SFXR, 19, date(2026, 9, 2), date(2026, 9, 1))


def test_only_the_highest_version_of_each_day_survives_newest_day_first() -> None:
    files = [
        parse_file_name(name(date(2026, 9, 26))),
        parse_file_name(name(date(2026, 9, 27), "0-0-0")),
        parse_file_name(name(date(2026, 9, 27), "1-0-2")),
        parse_file_name(name(date(2026, 9, 27), "0-9-9")),
    ]
    newest = newest_versions([file for file in files if file is not None])
    assert [(file.day.day, file.version_label) for file in newest] == [(27, "1-0-2"), (26, "0-0-0")]


async def test_recent_files_span_both_months_and_stay_inside_the_window() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url == SEPTEMBER:
            return httpx.Response(
                200,
                text=listing(
                    name(date(2026, 9, 20)),  # before the window
                    name(date(2026, 9, 29)),
                    name(date(2026, 9, 30)),
                    name(date(2026, 9, 30), product="sfeu"),  # another product
                    name(date(2026, 9, 30), spacecraft=18),  # another spacecraft
                    "notes.txt",
                ),
            )
        if url == OCTOBER:
            return httpx.Response(200, text=listing(name(date(2026, 10, 1))))
        return httpx.Response(500)

    client, requested = downloader(handler)
    files = await client.list_recent(ExisProduct.SFXR, 3, today=date(2026, 10, 2))

    assert [file.day for file in files] == [date(2026, 10, 1), date(2026, 9, 30), date(2026, 9, 29)]
    assert files[0].url == f"{OCTOBER}{name(date(2026, 10, 1))}"
    assert requested == [f"GET {SEPTEMBER}", f"GET {OCTOBER}"]


async def test_a_month_the_archive_does_not_have_is_empty_not_an_error() -> None:
    client, _ = downloader(lambda _: httpx.Response(404))
    assert await client.list_recent(ExisProduct.SFXR, 2, today=date(2026, 9, 29)) == []


async def test_a_listing_never_reaches_outside_its_own_directory() -> None:
    other = f"{ROOT}exis-l1b-sfeu/2026/09/{name(date(2026, 9, 27))}"
    nested = f"{SEPTEMBER}sub/{name(date(2026, 9, 27))}"
    client, _ = downloader(lambda _: httpx.Response(200, text=listing(other, nested)))
    assert await client.list_day(ExisProduct.SFXR, date(2026, 9, 27)) == []


async def test_list_day_returns_only_that_day() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=listing(name(date(2026, 9, 26)), name(date(2026, 9, 27))))

    client, requested = downloader(handler)
    files = await client.list_day(ExisProduct.SFXR, date(2026, 9, 26))
    assert [file.day for file in files] == [date(2026, 9, 26)]
    assert requested == [f"GET {SEPTEMBER}"]


async def test_the_lookback_must_cover_at_least_one_day() -> None:
    client, _ = downloader(lambda _: httpx.Response(200))
    with pytest.raises(ValueError, match="lookback"):
        await client.list_recent(ExisProduct.SFXR, 0)


def test_an_unknown_spacecraft_is_rejected() -> None:
    with pytest.raises(ValueError, match="Invalid GOES spacecraft"):
        ExisDownloader(httpx.AsyncClient(), spacecraft=15)


@pytest.mark.parametrize(
    ("headers", "expected"),
    [
        (
            {"Last-Modified": "Mon, 28 Sep 2026 04:17:28 GMT"},
            datetime(2026, 9, 28, 4, 17, 28, tzinfo=UTC),
        ),
        ({}, None),
        ({"Last-Modified": "not a date"}, None),
    ],
)
async def test_modified_at_reads_the_servers_last_modified(
    headers: dict[str, str], expected: datetime | None
) -> None:
    client, requested = downloader(lambda _: httpx.Response(200, headers=headers))
    file = parse_file_name(SFXR, f"{SEPTEMBER}{SFXR}")
    assert file is not None
    assert await client.modified_at(file) == expected
    assert requested == [f"HEAD {SEPTEMBER}{SFXR}"]


async def test_modified_at_raises_for_a_missing_file() -> None:
    client, _ = downloader(lambda _: httpx.Response(404))
    file = parse_file_name(SFXR, f"{SEPTEMBER}{SFXR}")
    assert file is not None
    with pytest.raises(httpx.HTTPStatusError):
        await client.modified_at(file)


async def test_fetch_downloads_the_file() -> None:
    client, _ = downloader(lambda _: httpx.Response(200, content=b"netcdf"))
    file = parse_file_name(SFXR, f"{SEPTEMBER}{SFXR}")
    assert file is not None
    download = await client.fetch(file)
    assert download.file is file
    assert download.content == b"netcdf"


async def test_fetch_gives_up_on_an_oversized_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(exis, "MAX_FILE_BYTES", 4)
    client, _ = downloader(lambda _: httpx.Response(200, content=b"far too large"))
    file = parse_file_name(SFXR, f"{SEPTEMBER}{SFXR}")
    assert file is not None
    with pytest.raises(ValueError, match="size limit"):
        await client.fetch(file)
