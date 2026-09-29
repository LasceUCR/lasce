"""Unit tests for :mod:`app.services.exis_readings`.

The fixtures are tiny NetCDF files written with the same variable names,
units, fill values and ``flag_masks`` layout as the real daily files in
NOAA's archive (checked against ``ops_exis-l1b-sf{eu,xr}_g19_d20260927``), so
the decoder runs against the real library on a real file shape. Persistence
is tested against fakes of the two things it talks to: ``session_scope``
(Postgres) and ``influx.write`` (InfluxDB).
"""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import numpy as np
import pytest
from netCDF4 import Dataset
from sqlalchemy.dialects import postgresql

from app.clients.exis import ExisProduct, parse_file_name
from app.services import exis_readings
from app.services.exis_readings import CHANNELS, ExisDecoded, ExisReadings, build_points, decode

FILE_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
DAY = datetime(2026, 9, 27, tzinfo=UTC)
EPOCH = datetime(2000, 1, 1, 12, tzinfo=UTC)
TIME_UNITS = "seconds since 2000-01-01 12:00:00"
FLAG_MASKS = np.asarray([63, 1, 2, 4, 8, 16, 32], dtype="u8")


def seconds(offset: float) -> float:
    """``DAY`` plus ``offset`` seconds, in the file's own time units."""
    return (DAY - EPOCH).total_seconds() + offset


def _base(dataset: Any, title: str, reports: int, spacecraft: int) -> None:
    dataset.platform_ID = f"G{spacecraft}"
    dataset.title = title
    dataset.input_file_count = np.int32(2881)
    dataset.LUT_ranges = np.asarray([1.5, 2.5])
    dataset.not_a_number = np.float64("nan")
    dataset.createDimension("report_number", reports)


def sfxr_netcdf(tmp_path: Path, spacecraft: int = 19) -> bytes:
    """Six 1 s reports, each dropped (or not) for one documented reason."""
    path = tmp_path / "sfxr.nc"
    with Dataset(path, "w") as dataset:
        _base(dataset, "EXIS XRS L1b Solar Flux: X-Ray", 6, spacecraft)
        dims = ("report_number",)
        time = dataset.createVariable("time", "f8", dims, fill_value=-999.0)
        time.units = TIME_UNITS
        time[:] = [seconds(offset) for offset in range(6)]
        for band, first, second in (("xrsa", 1e-8, 2e-8), ("xrsb", 1e-6, 2e-6)):
            for detector, value in ((1, first), (2, second)):
                data = dataset.createVariable(
                    f"irradiance_{band}{detector}", "f4", dims, fill_value=-999.0
                )
                data.units = "W m-2"
                data[:] = value
            dataset.createVariable(f"primary_{band}", "u1", dims, fill_value=255)
        # Report 1 takes XRS-A from the solar-maximum detector; report 5 has no primary.
        dataset.variables["primary_xrsa"][:] = [0, 1, 0, 0, 0, 255]
        dataset.variables["primary_xrsb"][:] = [0, 0, 0, 0, 0, 0]
        # Report 4 of XRS-B reads negative, which is not an irradiance.
        dataset.variables["irradiance_xrsb1"][4] = -5e-7
        # Report 2 is distrusted by the instrument itself.
        dataset.createVariable("invalid_flags", "u1", dims, fill_value=255)[:] = [0, 0, 1, 0, 0, 0]
        quality = dataset.createVariable("quality_flags", "u4", dims, fill_value=4294967295)
        quality.flag_masks = FLAG_MASKS.astype("u4")
        # Report 3 carries a bad-quality bit.
        quality[:] = [0, 0, 0, 1, 0, 0]
    return path.read_bytes()


def sfeu_netcdf(tmp_path: Path, units: str = "W m-2") -> bytes:
    """Four 30 s reports of every EUV line and the Mg II index."""
    path = tmp_path / "sfeu.nc"
    with Dataset(path, "w") as dataset:
        _base(dataset, "EXIS L1b Solar Flux: EUV", 4, 19)
        dims = ("report_number",)
        time = dataset.createVariable("time", "f8", dims, fill_value=-999.0)
        time.units = TIME_UNITS
        time[:] = [seconds(15), seconds(45), seconds(75), -999.0]  # report 3 has no time
        for index, channel in enumerate(CHANNELS[ExisProduct.SFEU]):
            data = dataset.createVariable(channel.variable, "f4", dims, fill_value=-999.0)
            data.units = "1" if channel.code == "mgii_index" else units
            data[:] = index + 1
        dataset.variables["avgIrradiance304"][1] = -999.0  # fill
        quality = dataset.createVariable("qualityFlags", "u8", dims, fill_value=2**64 - 1)
        quality.flag_masks = FLAG_MASKS
        quality[:] = [0, 0, 4, 0]  # report 2 is degraded
    return path.read_bytes()


def exis_file(product: str = "sfxr") -> Any:
    name = f"ops_exis-l1b-{product}_g19_d20260927_v0-0-2.nc"
    file = parse_file_name(name, f"https://archive.test/{name}")
    assert file is not None
    return file


def test_xrs_takes_the_primary_detector_and_drops_every_bad_report(tmp_path: Path) -> None:
    decoded = decode(sfxr_netcdf(tmp_path), ExisProduct.SFXR, 19)

    assert decoded.satellite == "G19"
    xrsa = decoded.series["0.05-0.4nm"]
    xrsb = decoded.series["0.1-0.8nm"]
    assert [stamp for stamp, _ in xrsa] == [
        DAY,
        DAY + timedelta(seconds=1),
        DAY + timedelta(seconds=4),
    ]
    assert [value for _, value in xrsa] == pytest.approx([1e-8, 2e-8, 1e-8])
    assert [stamp for stamp, _ in xrsb] == [
        DAY,
        DAY + timedelta(seconds=1),
        DAY + timedelta(seconds=5),
    ]
    assert [value for _, value in xrsb] == pytest.approx([1e-6, 1e-6, 1e-6])
    assert decoded.point_count == {"0.05-0.4nm": 3, "0.1-0.8nm": 3}
    assert decoded.first_observed_at == DAY
    assert decoded.last_observed_at == DAY + timedelta(seconds=5)
    # Plain datetimes, not cftime's subclass: they go straight to a database driver.
    assert all(type(stamp) is datetime for stamp, _ in xrsa + xrsb)


def test_euv_decodes_every_line_and_the_mg_ii_index(tmp_path: Path) -> None:
    decoded = decode(sfeu_netcdf(tmp_path), ExisProduct.SFEU, 19)

    assert set(decoded.series) == {channel.code for channel in CHANNELS[ExisProduct.SFEU]}
    both = [DAY + timedelta(seconds=15), DAY + timedelta(seconds=45)]
    for index, channel in enumerate(CHANNELS[ExisProduct.SFEU]):
        points = decoded.series[channel.code]
        expected = both[:1] if channel.code == "304" else both
        assert [stamp for stamp, _ in points] == expected
        assert {value for _, value in points} == {index + 1}


def test_global_attributes_are_kept_as_json_values(tmp_path: Path) -> None:
    attributes = decode(sfeu_netcdf(tmp_path), ExisProduct.SFEU, 19).attributes

    assert attributes["platform_ID"] == "G19"
    assert attributes["input_file_count"] == 2881
    assert attributes["LUT_ranges"] == [1.5, 2.5]
    assert attributes["not_a_number"] is None


def test_a_file_from_another_spacecraft_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="GOES-19"):
        decode(sfxr_netcdf(tmp_path, spacecraft=18), ExisProduct.SFXR, 19)


def test_a_file_of_the_other_product_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="SFEU"):
        decode(sfxr_netcdf(tmp_path), ExisProduct.SFEU, 19)


def test_unexpected_units_are_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="units"):
        decode(sfeu_netcdf(tmp_path, units="W m-2 nm-1"), ExisProduct.SFEU, 19)


def test_a_channel_with_no_good_report_is_empty_not_missing(tmp_path: Path) -> None:
    path = tmp_path / "sfxr.nc"
    path.write_bytes(sfxr_netcdf(tmp_path))
    with Dataset(path, "a") as dataset:
        dataset.variables["quality_flags"][:] = 1
    decoded = decode(path.read_bytes(), ExisProduct.SFXR, 19)

    assert decoded.series == {"0.05-0.4nm": [], "0.1-0.8nm": []}
    assert decoded.first_observed_at is None
    assert decoded.last_observed_at is None


def test_one_point_per_reading_tagged_by_satellite_product_and_channel() -> None:
    decoded = ExisDecoded(
        satellite="G19",
        series={"0.1-0.8nm": [(DAY, 1e-6), (DAY + timedelta(seconds=1), 2e-6)], "0.05-0.4nm": []},
    )
    lines = [point.to_line_protocol() for point in build_points(ExisProduct.SFXR, decoded)]

    assert len(lines) == 2
    tags, fields, stamp = lines[0].split(" ")
    assert tags.startswith(f"{exis_readings.MEASUREMENT},")
    assert {"satellite=G19", "product=SFXR", "channel=0.1-0.8nm"} <= set(tags.split(",")[1:])
    assert fields == "value=1e-06"
    assert int(stamp) == int(DAY.timestamp()) * 10**9


class _FakeResult:
    def __init__(self, value: Any) -> None:
        self._value = value

    def scalar_one(self) -> Any:
        return self._value

    def scalar_one_or_none(self) -> Any:
        return self._value


class _FakeSession:
    def __init__(self, value: Any, log: list[str]) -> None:
        self._value = value
        self._log = log
        self.executed: list[Any] = []

    async def execute(self, stmt: Any) -> _FakeResult:
        self._log.append("postgres")
        self.executed.append(stmt)
        return _FakeResult(self._value)


def fake_database(monkeypatch: pytest.MonkeyPatch, value: Any, log: list[str]) -> _FakeSession:
    session = _FakeSession(value, log)

    @asynccontextmanager
    async def fake_session_scope() -> AsyncIterator[_FakeSession]:
        yield session

    monkeypatch.setattr(exis_readings, "session_scope", fake_session_scope)
    return session


async def test_persist_writes_every_batch_before_the_catalogue_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order: list[str] = []
    session = fake_database(monkeypatch, FILE_ID, order)
    monkeypatch.setattr(exis_readings, "BATCH_SIZE", 2)
    influx = AsyncMock()
    influx.write.side_effect = lambda points: order.append(f"influx:{len(points)}")
    decoded = ExisDecoded(
        satellite="G19",
        series={
            "0.05-0.4nm": [(DAY + timedelta(seconds=offset), 1e-8) for offset in range(3)],
            "0.1-0.8nm": [(DAY, 1e-6), (DAY + timedelta(seconds=9), 1e-6)],
        },
        attributes={"title": "EXIS XRS L1b Solar Flux: X-Ray"},
    )
    modified = datetime(2026, 9, 28, 4, 17, 28, tzinfo=UTC)

    file_id = await ExisReadings(influx=influx).persist(decoded, exis_file(), modified)

    assert file_id == FILE_ID
    assert order == ["influx:2", "influx:2", "influx:1", "postgres"]
    (stmt,) = session.executed
    row = stmt.compile(dialect=postgresql.dialect()).params
    assert row["satellite"] == "G19"
    assert row["product"] == "SFXR"
    assert row["day"] == date(2026, 9, 27)
    assert row["version"] == "0-0-2"
    assert row["source_modified_at"] == modified
    assert row["first_observed_at"] == DAY
    assert row["last_observed_at"] == DAY + timedelta(seconds=9)
    assert row["point_count"] == {"0.05-0.4nm": 3, "0.1-0.8nm": 2}


async def test_a_failed_influx_write_leaves_no_catalogue_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order: list[str] = []
    session = fake_database(monkeypatch, FILE_ID, order)
    influx = AsyncMock()
    influx.write.side_effect = RuntimeError("influx is down")
    decoded = ExisDecoded(satellite="G19", series={"0.1-0.8nm": [(DAY, 1e-6)]})

    with pytest.raises(RuntimeError):
        await ExisReadings(influx=influx).persist(decoded, exis_file(), None)
    assert session.executed == []


@pytest.mark.parametrize("recorded", [None, datetime(2026, 9, 28, 4, 17, 28, tzinfo=UTC)])
async def test_ingested_modified_at_reads_the_recorded_value(
    monkeypatch: pytest.MonkeyPatch, recorded: datetime | None
) -> None:
    fake_database(monkeypatch, recorded, [])
    assert await ExisReadings.ingested_modified_at(exis_file()) == recorded
