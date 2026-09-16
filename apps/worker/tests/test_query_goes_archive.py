import io
import tarfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import httpx
import numpy as np
import pytest
from netCDF4 import Dataset

from app.models.jobs import QueryGoesArchivePayload
from app.processors import query_goes_archive as archive

NAME = "OR_EXIS-L1b-SFXR_G18_s20250051120000_e20250051120599_c20250051121000.nc"


def test_samples_observations_without_interpolation_and_rejects_ambiguous_series() -> None:
    start = datetime(2025, 1, 5, 11, 20, tzinfo=UTC)
    rows = [((start + timedelta(seconds=i)).isoformat(), float(i), 18) for i in range(400)]
    result = archive.build_result(query(), rows)
    assert len(result["points"]) == 360
    assert result["sampled"] is True
    assert result["points"][0]["value"] == 0
    assert result["points"][-1]["value"] == 399
    assert all(point["value"].is_integer() for point in result["points"])
    assert len(archive.build_result(query(), [rows[0], rows[0]])["points"]) == 1
    with pytest.raises(ValueError, match="satellite"):
        archive.build_result(query(), [rows[0], (rows[1][0], 1, 19)])
    with pytest.raises(ValueError, match="Conflicting"):
        archive.build_result(query(), [rows[0], (rows[0][0], 100, 18)])


def test_orders_whole_seconds_before_fractional_observations() -> None:
    result = archive.build_result(
        query(),
        [
            ("2025-01-05T11:20:00.100000Z", 2, 18),
            ("2025-01-05T11:20:00Z", 1, 18),
        ],
    )
    assert [point["value"] for point in result["points"]] == [1, 2]


def query(**changes: Any) -> QueryGoesArchivePayload:
    return QueryGoesArchivePayload.model_validate(
        {
            "product": "SFXR",
            "parameter": "0.1-0.8nm",
            "date": "2025-01-05",
            "startTime": "11:20",
            "endTime": "11:21",
            **changes,
        }
    )


def netcdf(tmp_path: Path, product: str = "SFXR", parameter: str = "0.1-0.8nm") -> bytes:
    path = tmp_path / f"{product}.nc"
    payload = query(product=product, parameter=parameter)
    variable, quality, indices, units = archive.selected_variable(payload)
    with Dataset(path, "w") as dataset:
        dataset.platform_ID = "G18"
        dataset.dataset_name = (
            f"OR_{archive.PRODUCT_PATHS[product].split('/')[0]}-L1b-{product}_G18"
        )
        dataset.createDimension("report", 6)
        dataset.createDimension("sensor", 2)
        dataset.createDimension("telescope", 5)
        dataset.createDimension("energy", 11)
        dataset.createDimension("sample", 1)
        dataset.createDimension("coordinate", 3)
        time_dims = ("report",)
        dims = time_dims
        time_name = "time"
        if product == "GEOF":
            time_dims = ("report", "sample")
            dims = (*time_dims, "coordinate") if indices else time_dims
            time_name = "OB_time"
        elif product == "MPSH":
            time_name = "L1a_SciData_TimeStamp"
            dims = ("report", "telescope", "energy")
        elif product == "SGPS":
            time_dims = ("report", "sensor")
            dims = (*time_dims, "energy") if len(indices) == 2 else time_dims
            time_name = "L1a_SciData_TimeStamp"
        times = dataset.createVariable(time_name, "f8", time_dims)
        times.units = "seconds since 2025-01-05 11:20:00"
        times[:] = np.asarray([-1, 0, 1, 2, 119.9, 120]).reshape((6,) + (1,) * (len(time_dims) - 1))
        quality_dims = time_dims if product == "GEOF" else dims
        flags = dataset.createVariable(quality, "u8", quality_dims)
        flags.flag_masks = np.asarray([63, 1, 2, 4, 8, 16, 32], dtype="u8")
        flags[:] = 0
        flags[3] = 1
        if product == "SFXR":
            for channel, value in ((1, 10), (2, 20)):
                data = dataset.createVariable(f"irradiance_{variable}{channel}", "f4", dims)
                data.units = units
                data[:] = value
            primary = dataset.createVariable(f"primary_{variable}", "u1", dims)
            primary[:] = [0, 0, 1, 0, 0, 0]
            dataset.createVariable("invalid_flags", "u1", dims)[:] = 0
        else:
            data = dataset.createVariable(variable, "f4", dims, fill_value=-9999)
            data.units = units
            data[:] = 10
            if indices:
                data[(Ellipsis, *indices)] = 20
            data[2] = -9999
    return path.read_bytes()


def test_xray_selects_primary_detector_and_filters_quality_and_half_open_interval(
    tmp_path: Path,
) -> None:
    rows = archive.read_netcdf(netcdf(tmp_path), query())
    assert [row[1] for row in rows] == [10, 20, 10]
    assert rows[0][0] == "2025-01-05T11:20:00Z"
    assert rows[-1][0] == "2025-01-05T11:21:59.900000Z"
    assert {row[2] for row in rows} == {18}


@pytest.mark.parametrize(
    ("product", "parameter"),
    [
        ("SFEU", "304"),
        ("SFEU", "mgii_index"),
        ("GEOF", "total"),
        ("GEOF", "EPN-y"),
        ("MPSH", "electron:T3:E8"),
        ("MPSH", "proton:T5:E11"),
        ("SGPS", "plus:P11"),
        ("SGPS", "minus:P2B"),
        ("SGPS", "plus:P8BF"),
    ],
)
def test_reads_explicit_channel_without_averaging_sensors(
    tmp_path: Path,
    product: str,
    parameter: str,
) -> None:
    payload = query(product=product, parameter=parameter)
    rows = archive.read_netcdf(netcdf(tmp_path, product, parameter), payload)
    assert len(rows) == 2
    expected = 20 if archive.selected_variable(payload)[2] else 10
    assert [row[1] for row in rows] == [expected, expected]


def test_rejects_wrong_units_and_corrupt_netcdf(tmp_path: Path) -> None:
    netcdf(tmp_path)
    with Dataset(tmp_path / "SFXR.nc", "a") as dataset:
        dataset.variables["irradiance_xrsb1"].units = "counts"
    with pytest.raises(ValueError, match="units"):
        archive.read_netcdf((tmp_path / "SFXR.nc").read_bytes(), query())
    with pytest.raises(OSError):
        archive.read_netcdf(b"invalid", query())


@pytest.mark.parametrize(
    "changes",
    [
        {"startTime": "11:21"},
        {"product": "SGPS", "parameter": ">=10 MeV"},
        {"product": "MPSH", "parameter": "electron:T6:E1"},
        {"product": "MPSH", "parameter": "electron:T1:E11"},
    ],
)
def test_rejects_invalid_time_or_historical_selector(changes: dict[str, str]) -> None:
    with pytest.raises(ValueError):
        archive.bounds(query(**changes))
        archive.selected_variable(query(**changes))


def listing(*hrefs: str) -> bytes:
    return (
        "<d:multistatus xmlns:d='DAV:'>"
        + "".join(
            f"<d:response><d:href>{href}</d:href><d:propstat><d:prop/>"
            "<d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>"
            for href in hrefs
        )
        + "</d:multistatus>"
    ).encode()


def test_listing_accepts_only_direct_files_in_the_public_directory() -> None:
    directory = archive.BASE_URL + "EXIS/SFXR/20250105/"
    good = directory + NAME
    xml = listing(
        good,
        good,
        "https://example.com/other.nc",
        directory + "../other.nc",
        directory + "nested%2Fother.nc",
        directory + "other.nc?download=1",
    )
    assert archive.list_files(xml, directory) == [good]
    with pytest.raises(ValueError):
        archive.list_files(b"<html/>", directory)
    with pytest.raises(ValueError, match="readable"):
        archive.list_files(listing(good).replace(b"200 OK", b"403 Forbidden"), directory)


def compressed(content: bytes) -> bytes:
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:gz") as tar:
        member = tarfile.TarInfo("20250105/" + NAME)
        member.size = len(content)
        tar.addfile(member, io.BytesIO(content))
    return output.getvalue()


def test_reads_only_matching_tar_members_without_extracting(tmp_path: Path) -> None:
    content = netcdf(tmp_path)
    assert archive.read_tar(compressed(content), query()) == archive.read_netcdf(content, query())
    assert archive.read_tar(compressed(content), query(startTime="12:00", endTime="12:01")) == []


@pytest.mark.asyncio
@pytest.mark.parametrize("packed", [False, True])
async def test_queries_historical_directory_or_compressed_day(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    packed: bool,
) -> None:
    content = netcdf(tmp_path)
    directory = archive.BASE_URL + "EXIS/SFXR/20250105/"
    requested: list[tuple[str, str]] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requested.append((request.method, str(request.url)))
        if request.method == "PROPFIND":
            return httpx.Response(404 if packed else 207, content=listing(directory + NAME))
        if request.method == "HEAD":
            return httpx.Response(200)
        return httpx.Response(200, content=compressed(content) if packed else content)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    monkeypatch.setattr(archive.httpx, "AsyncClient", lambda **_kwargs: client)
    job = AsyncMock()
    result = await archive.run(query(), job)
    assert len(result["points"]) == 3
    assert result["satellite"] == 18
    assert result["sampled"] is False
    assert all(url.startswith(archive.BASE_URL) for _, url in requested)
    job.updateProgress.assert_called_with(100)


@pytest.mark.asyncio
async def test_missing_day_returns_empty_but_transport_errors_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client_factory = httpx.AsyncClient
    for status in (404, 503):
        client = client_factory(
            transport=httpx.MockTransport(lambda _r, code=status: httpx.Response(code))
        )
        monkeypatch.setattr(
            archive.httpx, "AsyncClient", lambda selected=client, **_kwargs: selected
        )
        if status == 404:
            result = await archive.run(query(), AsyncMock())
            assert result["points"] == []
        else:
            with pytest.raises(httpx.HTTPStatusError):
                await archive.run(query(), AsyncMock())
