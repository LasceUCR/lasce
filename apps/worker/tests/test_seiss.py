"""The SEISS daily archive client, exercised without touching the network.

The file names follow the real GOES-19 archive, where one file holds one day
and lives in a per-month directory: ``l1b/seis-l1b-ehis`` for EHIS and
``l2/data/sgps-l2-avg1m`` for SGPS. Most cases use EHIS; what differs per
product (directory and file name) is checked for every product.
"""

from datetime import UTC, date, datetime
from typing import Any

import httpx
import pytest

from app.clients import seiss
from app.clients.seiss import (
    SeissDownloader,
    SeissFile,
    SeissProduct,
    month_urls,
    parse_file_name,
)

EHIS = SeissProduct.EHIS
SGPS = SeissProduct.SGPS

FILE = "ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc"
ROOT = "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/goes19/"
SEPTEMBER = f"{ROOT}l1b/seis-l1b-ehis/2026/09/"
OCTOBER = f"{ROOT}l1b/seis-l1b-ehis/2026/10/"


def name(day: date, version: str = "0-0-2", spacecraft: int = 19) -> str:
    return f"ops_seis-l1b-ehis_g{spacecraft}_d{day:%Y%m%d}_v{version}.nc"


def listing(*names: str) -> str:
    links = "".join(f'<a href="{entry}">{entry}</a>' for entry in names)
    return f'<html><body><a href="?C=M;O=A">sort</a><a href="../">Parent</a>{links}</body></html>'


def downloader(
    handler: Any, spacecraft: int = 19, product: SeissProduct = EHIS
) -> tuple[SeissDownloader, list[str]]:
    requested: list[str] = []

    def recording(request: httpx.Request) -> httpx.Response:
        requested.append(f"{request.method} {request.url}")
        response: httpx.Response = handler(request)
        return response

    client = httpx.AsyncClient(transport=httpx.MockTransport(recording))
    return SeissDownloader(client, product, spacecraft=spacecraft), requested


def test_file_name_gives_the_spacecraft_day_and_version() -> None:
    file = parse_file_name(EHIS, FILE, f"{OCTOBER}{FILE}")
    assert file == SeissFile(
        name=FILE,
        url=f"{OCTOBER}{FILE}",
        product=EHIS,
        spacecraft=19,
        day=date(2026, 10, 14),
        version=(0, 0, 2),
    )
    assert file.version_label == "0-0-2"
    assert parse_file_name(EHIS, FILE) == SeissFile(
        FILE, FILE, EHIS, 19, date(2026, 10, 14), (0, 0, 2)
    )


def test_an_sgps_file_name_is_read_from_its_l2_name() -> None:
    sgps = "sci_sgps-l2-avg1m_g19_d20261027_v3-0-3.nc"
    file = parse_file_name(SGPS, sgps)
    assert file is not None
    assert (file.product, file.day, file.version_label) == (SGPS, date(2026, 10, 27), "3-0-3")
    # Each product reads only its own files.
    assert parse_file_name(EHIS, sgps) is None
    assert parse_file_name(SGPS, FILE) is None


@pytest.mark.parametrize(
    ("product", "directory"),
    [(EHIS, "l1b/seis-l1b-ehis"), (SGPS, "l2/data/sgps-l2-avg1m")],
)
def test_each_product_lists_its_own_archive_directory(
    product: SeissProduct, directory: str
) -> None:
    assert month_urls(product, 19, date(2026, 10, 1), date(2026, 10, 2)) == [
        f"{ROOT}{directory}/2026/10/"
    ]


@pytest.mark.parametrize(
    "candidate",
    [
        "ops_seis-l1b-mpsl_g19_d20261014_v0-0-2.nc",
        "dn_magn-l2-avg1m_g19_d20261014_v2-0-4.nc",
        "ops_seis-l1b-ehis_g19_d20261340_v0-0-2.nc",
        "ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc.md5",
        "OR_SEIS-L1b-EHIS_G19_s20262870004020_e20262870009010_c20262870010030.nc",
    ],
)
def test_anything_that_is_not_a_daily_ehis_file_is_skipped(candidate: str) -> None:
    assert parse_file_name(EHIS, candidate) is None


def test_a_window_crossing_a_month_lists_both_months() -> None:
    assert month_urls(EHIS, 19, date(2026, 9, 29), date(2026, 10, 2)) == [SEPTEMBER, OCTOBER]


def test_a_window_crossing_the_year_rolls_the_year_over() -> None:
    urls = month_urls(EHIS, 18, date(2025, 12, 30), date(2026, 1, 1))
    assert [url.rsplit("/seis-l1b-ehis/", 1)[1] for url in urls] == ["2025/12/", "2026/01/"]
    assert urls[0].startswith(f"{ROOT.replace('goes19', 'goes18')}l1b/")


def test_a_backwards_window_is_rejected() -> None:
    with pytest.raises(ValueError, match="start"):
        month_urls(EHIS, 19, date(2026, 10, 2), date(2026, 10, 1))


async def test_recent_files_span_both_months_keep_the_newest_version_and_the_window() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url == SEPTEMBER:
            return httpx.Response(
                200,
                text=listing(
                    name(date(2026, 9, 20)),  # before the window
                    name(date(2026, 9, 30), "0-0-1"),
                    name(date(2026, 9, 30), "0-0-2"),
                    name(date(2026, 9, 30), spacecraft=18),  # another spacecraft
                    "notes.txt",
                ),
            )
        if url == OCTOBER:
            return httpx.Response(200, text=listing(name(date(2026, 10, 1))))
        return httpx.Response(500)

    client, requested = downloader(handler)
    files = await client.list_recent(3, today=date(2026, 10, 2))

    assert [(file.day, file.version_label) for file in files] == [
        (date(2026, 10, 1), "0-0-2"),
        (date(2026, 9, 30), "0-0-2"),
    ]
    assert files[0].url == f"{OCTOBER}{name(date(2026, 10, 1))}"
    assert requested == [f"GET {SEPTEMBER}", f"GET {OCTOBER}"]


async def test_a_month_the_archive_does_not_have_is_empty_not_an_error() -> None:
    client, _ = downloader(lambda _: httpx.Response(404))
    assert await client.list_recent(2, today=date(2026, 10, 2)) == []


async def test_list_day_returns_only_that_day() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=listing(name(date(2026, 10, 13)), name(date(2026, 10, 14))))

    client, requested = downloader(handler)
    files = await client.list_day(date(2026, 10, 13))
    assert [file.day for file in files] == [date(2026, 10, 13)]
    assert requested == [f"GET {OCTOBER}"]


async def test_the_lookback_must_cover_at_least_one_day() -> None:
    client, _ = downloader(lambda _: httpx.Response(200))
    with pytest.raises(ValueError, match="lookback"):
        await client.list_recent(0)


def test_an_unknown_spacecraft_is_rejected() -> None:
    with pytest.raises(ValueError, match="Invalid GOES spacecraft"):
        SeissDownloader(httpx.AsyncClient(), EHIS, spacecraft=15)


@pytest.mark.parametrize(
    ("headers", "expected"),
    [
        (
            {"Last-Modified": "Thu, 15 Oct 2026 04:31:27 GMT"},
            datetime(2026, 10, 15, 4, 31, 27, tzinfo=UTC),
        ),
        ({}, None),
        ({"Last-Modified": "not a date"}, None),
    ],
)
async def test_modified_at_reads_the_servers_last_modified(
    headers: dict[str, str], expected: datetime | None
) -> None:
    client, requested = downloader(lambda _: httpx.Response(200, headers=headers))
    file = parse_file_name(EHIS, FILE, f"{OCTOBER}{FILE}")
    assert file is not None
    assert await client.modified_at(file) == expected
    assert requested == [f"HEAD {OCTOBER}{FILE}"]


async def test_modified_at_raises_for_a_missing_file() -> None:
    client, _ = downloader(lambda _: httpx.Response(404))
    file = parse_file_name(EHIS, FILE, f"{OCTOBER}{FILE}")
    assert file is not None
    with pytest.raises(httpx.HTTPStatusError):
        await client.modified_at(file)


async def test_fetch_downloads_the_file() -> None:
    client, _ = downloader(lambda _: httpx.Response(200, content=b"netcdf"))
    file = parse_file_name(EHIS, FILE, f"{OCTOBER}{FILE}")
    assert file is not None
    download = await client.fetch(file)
    assert download.file is file
    assert download.content == b"netcdf"


async def test_fetch_gives_up_on_an_oversized_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(seiss, "MAX_FILE_BYTES", 4)
    client, _ = downloader(lambda _: httpx.Response(200, content=b"far too large"))
    file = parse_file_name(EHIS, FILE, f"{OCTOBER}{FILE}")
    assert file is not None
    with pytest.raises(ValueError, match="size limit"):
        await client.fetch(file)
