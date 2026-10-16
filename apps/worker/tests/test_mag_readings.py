"""Decoding and storing a daily MAG L2 1-minute file.

The synthetic files mirror the real ``magn-l2-avg1m`` layout: a ``time``
dimension, ``b_epn`` as (time, coordinate), ``b_total``, the 27-flag ``DQF``
(whose first mask is ``good_quality_qf`` and leaves out
``valid_arcjet_correction_qf``) and the good/degraded/bad ``b_quality``.
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

from app.clients.mag import parse_file_name
from app.services import mag_readings
from app.services.mag_readings import (
    CHANNELS,
    IngestedFile,
    MagDecoded,
    MagReadings,
    build_points,
    decode,
)

FILE_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")
DAY = datetime(2026, 10, 14, tzinfo=UTC)
EPOCH = datetime(2000, 1, 1, 12, tzinfo=UTC)
TIME_UNITS = "seconds since 2000-01-01 12:00:00"
TITLE = (
    "L2 Magnetometer (MAG) Geomagnetic Field 1-minute Averages Product with Complete "
    "Coordinate Frames"
)
# The real DQF masks: good_quality_qf, then one bit per flag.
GOOD_QUALITY_MASK = 25_165_823
ARCJET_CORRECTION = 33_554_432
CALIBRATION_MANEUVER = 16_384


def minutes(offset: int) -> float:
    """``DAY`` plus ``offset`` minutes, in the file's own time units."""
    return (DAY - EPOCH).total_seconds() + offset * 60


def mag_netcdf(
    tmp_path: Path,
    platform: str = "g19",
    title: str = TITLE,
    units: str = "nT",
) -> bytes:
    """Seven one-minute reports, each kept or dropped for one documented reason."""
    path = tmp_path / "mag.nc"
    with Dataset(path, "w") as dataset:
        dataset.platform = platform
        dataset.title = title
        dataset.processing_level = "Level 2"
        dataset.createDimension("time", 7)
        dataset.createDimension("coordinate", 3)
        time = dataset.createVariable("time", "f8", ("time",), fill_value=-9999.0)
        time.units = TIME_UNITS
        time[:] = [minutes(offset) for offset in range(6)] + [-9999.0]  # report 6 has no time
        epn = dataset.createVariable("b_epn", "f4", ("time", "coordinate"), fill_value=-9999.0)
        epn.units = units
        # Components are signed: x is negative throughout and must survive.
        rows = np.arange(7, dtype="f4")
        z = 2.0 - rows
        z[4] = -9999.0  # fill in z only
        epn[:] = np.stack([-30.0 - rows, 80.0 + rows, z], axis=1)
        total = dataset.createVariable("b_total", "f4", ("time",), fill_value=-9999.0)
        total.units = units
        total[:] = [90.0 + row for row in range(7)]
        dqf = dataset.createVariable("DQF", "u4", ("time",), fill_value=4294967295)
        dqf.flag_masks = np.asarray(
            [GOOD_QUALITY_MASK, 1, CALIBRATION_MANEUVER, ARCJET_CORRECTION], dtype="u4"
        )
        # Report 1 only carries the valid arcjet correction (kept); report 2 a calibration
        # maneuver (dropped).
        dqf[:] = [0, ARCJET_CORRECTION, CALIBRATION_MANEUVER, 0, 0, 0, 0]
        quality = dataset.createVariable("b_quality", "u1", ("time",), fill_value=255)
        quality.flag_values = np.asarray([0, 1, 2], dtype="u1")
        quality.flag_meanings = "good degraded bad"
        quality[:] = [0, 0, 0, 1, 0, 0, 0]  # report 3 is degraded
        dataset.variables["b_quality"][5] = np.ma.masked  # report 5 has no quality at all
    return path.read_bytes()


def mag_file() -> Any:
    name = "dn_magn-l2-avg1m_g19_d20261014_v2-0-4.nc"
    file = parse_file_name(name, f"https://archive.test/{name}")
    assert file is not None
    return file


def test_keeps_good_and_arcjet_corrected_reports_and_negative_components(
    tmp_path: Path,
) -> None:
    decoded = decode(mag_netcdf(tmp_path), 19)

    assert decoded.satellite == "G19"
    assert set(decoded.series) == {channel.code for channel in CHANNELS}
    kept = [DAY, DAY + timedelta(minutes=1), DAY + timedelta(minutes=4)]
    assert [stamp for stamp, _ in decoded.series["EPN-x"]] == kept
    assert [value for _, value in decoded.series["EPN-x"]] == [-30.0, -31.0, -34.0]
    assert [value for _, value in decoded.series["EPN-y"]] == [80.0, 81.0, 84.0]
    # Report 4 is fill in z alone; the other channels keep it.
    assert [stamp for stamp, _ in decoded.series["EPN-z"]] == kept[:2]
    assert [value for _, value in decoded.series["EPN-z"]] == [2.0, 1.0]
    assert [value for _, value in decoded.series["total"]] == [90.0, 91.0, 94.0]
    assert decoded.point_count == {"EPN-x": 3, "EPN-y": 3, "EPN-z": 2, "total": 3}
    assert decoded.first_observed_at == DAY
    assert decoded.last_observed_at == DAY + timedelta(minutes=4)
    assert all(type(stamp) is datetime for stamp, _ in decoded.series["total"])


def test_global_attributes_are_kept_as_json_values(tmp_path: Path) -> None:
    attributes = decode(mag_netcdf(tmp_path), 19).attributes
    assert attributes["platform"] == "g19"
    assert attributes["processing_level"] == "Level 2"


def test_a_file_from_another_spacecraft_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="GOES-19"):
        decode(mag_netcdf(tmp_path, platform="g18"), 19)


def test_a_file_of_another_product_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="1-minute"):
        decode(mag_netcdf(tmp_path, title="L2 Magnetometer (MAG) High Resolution"), 19)


def test_unexpected_units_are_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="units"):
        decode(mag_netcdf(tmp_path, units="T"), 19)


def test_a_day_with_no_good_report_is_empty_not_missing(tmp_path: Path) -> None:
    path = tmp_path / "mag.nc"
    path.write_bytes(mag_netcdf(tmp_path))
    with Dataset(path, "a") as dataset:
        dataset.variables["b_quality"][:] = 2
    decoded = decode(path.read_bytes(), 19)

    assert decoded.series == {"EPN-x": [], "EPN-y": [], "EPN-z": [], "total": []}
    assert decoded.first_observed_at is None
    assert decoded.last_observed_at is None


def test_one_point_per_reading_tagged_by_satellite_product_and_channel() -> None:
    decoded = MagDecoded(
        satellite="G19",
        series={"EPN-x": [(DAY, -30.5), (DAY + timedelta(minutes=1), -31.0)], "total": []},
    )
    lines = [point.to_line_protocol() for point in build_points(decoded)]

    assert len(lines) == 2
    tags, fields, stamp = lines[0].split(" ")
    assert tags.startswith(f"{mag_readings.MEASUREMENT},")
    assert {"satellite=G19", "product=GEOF", "channel=EPN-x"} <= set(tags.split(",")[1:])
    assert set(fields.split(",")) == {"value=-30.5", "valid=true"}
    assert int(stamp) == int(DAY.timestamp()) * 10**9


class _FakeResult:
    def __init__(self, value: Any) -> None:
        self._value = value

    def scalar_one(self) -> Any:
        return self._value

    def one_or_none(self) -> Any:
        return self._value


class _FakeSession:
    """Answers each statement with the next of ``values``, in order."""

    def __init__(self, values: list[Any], log: list[str]) -> None:
        self._values = list(values)
        self._log = log
        self.executed: list[Any] = []

    async def execute(self, stmt: Any) -> _FakeResult:
        self._log.append("postgres")
        self.executed.append(stmt)
        return _FakeResult(self._values.pop(0))


def fake_database(
    monkeypatch: pytest.MonkeyPatch, values: list[Any], log: list[str]
) -> _FakeSession:
    session = _FakeSession(values, log)

    @asynccontextmanager
    async def fake_session_scope() -> AsyncIterator[_FakeSession]:
        yield session

    monkeypatch.setattr(mag_readings, "session_scope", fake_session_scope)
    return session


MODIFIED = datetime(2026, 10, 15, 4, 2, 11, tzinfo=UTC)


def fields_of(line: str) -> set[str]:
    return set(line.split(" ")[1].split(","))


async def test_persist_writes_every_batch_before_the_catalogue_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order: list[str] = []
    session = fake_database(monkeypatch, [None, FILE_ID], order)
    monkeypatch.setattr(mag_readings, "BATCH_SIZE", 2)
    influx = AsyncMock()
    influx.write.side_effect = lambda points: order.append(f"influx:{len(points)}")
    decoded = MagDecoded(
        satellite="G19",
        series={
            "EPN-x": [(DAY + timedelta(minutes=offset), -30.0) for offset in range(3)],
            "total": [(DAY, 90.0), (DAY + timedelta(minutes=9), 91.0)],
        },
        attributes={"title": TITLE},
    )

    file_id = await MagReadings(influx=influx).persist(decoded, mag_file(), MODIFIED)

    assert file_id == FILE_ID
    assert order == ["postgres", "influx:2", "influx:2", "influx:1", "postgres"]
    _, stmt = session.executed
    row = stmt.compile(dialect=postgresql.dialect()).params
    assert row["satellite"] == "G19"
    assert row["product"] == "GEOF"
    assert row["day"] == date(2026, 10, 14)
    assert row["version"] == "2-0-4"
    assert row["source_modified_at"] == MODIFIED
    assert row["first_observed_at"] == DAY
    assert row["last_observed_at"] == DAY + timedelta(minutes=9)
    assert row["point_count"] == {"EPN-x": 3, "total": 2}


async def test_a_republished_day_withdraws_the_readings_it_dropped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order: list[str] = []
    later = DAY + timedelta(minutes=2)
    session = fake_database(monkeypatch, [(DAY, later), FILE_ID], order)
    influx = AsyncMock()
    influx.query.return_value = [
        {"channel": "total", "ns": int(DAY.timestamp()) * 10**9 + offset * 60 * 10**9}
        for offset in range(3)
    ]
    influx.write.side_effect = lambda points: order.append("influx")
    decoded = MagDecoded(satellite="G19", series={"total": [(DAY, 90.0)]})

    await MagReadings(influx=influx).persist(decoded, mag_file(), MODIFIED)

    lookup = str(session.executed[0].compile(dialect=postgresql.dialect()))
    assert "solar.mag_files.day" in lookup
    sql = influx.query.await_args.args[0]
    assert "FROM mag_field" in sql
    assert "satellite = 'G19'" in sql
    assert "product = 'GEOF'" in sql
    assert "time >= '2026-10-14T00:00:00.000000Z'" in sql
    assert "time <= '2026-10-14T00:02:00.000000Z'" in sql
    lines = [point.to_line_protocol() for point in influx.write.await_args.args[0]]
    assert [fields_of(line) for line in lines] == [
        {"valid=false"},
        {"valid=false"},
        {"valid=true", "value=90"},
    ]
    assert order == ["postgres", "influx", "postgres"]


@pytest.mark.parametrize("previous", [None, (None, None)])
async def test_a_first_or_empty_earlier_ingest_withdraws_nothing(
    monkeypatch: pytest.MonkeyPatch, previous: Any
) -> None:
    fake_database(monkeypatch, [previous, FILE_ID], [])
    influx = AsyncMock()
    decoded = MagDecoded(satellite="G19", series={"total": [(DAY, 90.0)]})

    await MagReadings(influx=influx).persist(decoded, mag_file(), MODIFIED)

    influx.query.assert_not_awaited()
    (written,) = influx.write.await_args_list
    assert all("valid=true" in fields_of(point.to_line_protocol()) for point in written.args[0])


async def test_a_failed_influx_write_leaves_no_catalogue_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = fake_database(monkeypatch, [None, FILE_ID], [])
    influx = AsyncMock()
    influx.write.side_effect = RuntimeError("influx is down")
    decoded = MagDecoded(satellite="G19", series={"total": [(DAY, 90.0)]})

    with pytest.raises(RuntimeError):
        await MagReadings(influx=influx).persist(decoded, mag_file(), None)
    assert len(session.executed) == 1


@pytest.mark.parametrize("recorded", [None, MODIFIED])
async def test_ingested_reads_the_recorded_last_modified(
    monkeypatch: pytest.MonkeyPatch, recorded: datetime | None
) -> None:
    fake_database(monkeypatch, [(recorded,)], [])
    assert await MagReadings.ingested(mag_file()) == IngestedFile(source_modified_at=recorded)


async def test_a_file_never_ingested_has_no_record(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_database(monkeypatch, [None], [])
    assert await MagReadings.ingested(mag_file()) is None
