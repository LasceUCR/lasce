"""Decoding and storing a daily SEISS EHIS L1b file.

The synthetic files mirror the real ``seis-l1b-ehis`` daily aggregation: a
``report_number`` dimension, ``ELF_StartStopTime`` as (report, start/stop),
one ``<group>5MinuteDifferentialFluxes`` (report, energy) per mass group, and
its per-band DQF. The DQF masks and meanings are the real ones, including the
extra ``invalid_due_to_sgps_inputs_qf`` bit only helium has.
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

from app.clients.ehis import parse_file_name
from app.services import ehis_readings
from app.services.ehis_readings import (
    CHANNELS,
    EhisDecoded,
    EhisReadings,
    IngestedFile,
    build_points,
    decode,
)

FILE_ID = uuid.UUID("55555555-5555-5555-5555-555555555555")
DAY = datetime(2026, 10, 14, tzinfo=UTC)
EPOCH = datetime(2000, 1, 1, 12, tzinfo=UTC)
TIME_UNITS = "seconds since 2000-01-01 12:00:00"
TITLE = (
    "GOES-R Series Level 1b SEISS Energetic Heavy Ion Sensor (EHIS) Product in Daily Aggregations"
)
UNIT = "cm-2 sr-1 s-1 (MeV nuc-1)-1"
FILL = -1e31
GROUPS = ("H", "He", "CNO", "NeS", "ClNi")
MEANINGS = (
    "good_quality_qf invalid_due_to_missing_L0_data_or_not_operational_mode_qf "
    "invalid_due_to_calibration_failed_qf "
    "degraded_due_to_deadtime_correction_threshold_exceeded_qf "
    "degraded_due_to_out_of_band_contamination_level_threshold_exceeded_qf "
    "degraded_due_to_dynamic_error_threshold_exceeded_or_dynamic_error_not_calculable_qf "
    "degraded_due_to_dynamic_lower_error_bound_not_calculable_only_upper_limit_exists_qf"
)
MASKS = [63, 1, 2, 4, 8, 16, 32]
INVALID_MISSING_L0 = 1
DEGRADED_DYNAMIC_ERROR = 16
DEGRADED_DEADTIME = 8
INVALID_SGPS_INPUTS = 64


def minutes(offset: int) -> float:
    """``DAY`` plus ``offset`` minutes, in the file's own time units."""
    return (DAY - EPOCH).total_seconds() + offset * 60


def ehis_netcdf(
    tmp_path: Path,
    platform: str = "G19",
    title: str = TITLE,
    units: str = UNIT,
) -> bytes:
    """Five five-minute reports, each reading kept or dropped for one documented reason."""
    path = tmp_path / "ehis.nc"
    with Dataset(path, "w") as dataset:
        dataset.platform_ID = platform
        dataset.title = title
        dataset.processing_level = "National Aeronautics and Space Administration (NASA) L1b"
        dataset.createDimension("report_number", 5)
        dataset.createDimension("energy", 5)
        dataset.createDimension("number_of_time_bounds", 2)
        time = dataset.createVariable(
            "ELF_StartStopTime", "f8", ("report_number", "number_of_time_bounds"), fill_value=FILL
        )
        time.units = TIME_UNITS
        starts = [minutes(5 * report) for report in range(4)] + [FILL]  # report 4 has no time
        stops = [start + 300 if start != FILL else FILL for start in starts]
        time[:] = np.stack([starts, stops], axis=1)
        # report r, band b -> r + b / 10, so every reading is recognisable.
        light = np.ma.masked_array(np.add.outer(np.arange(5), np.arange(5) / 10), dtype="f4")
        light_dqf = np.ma.masked_array(np.zeros((5, 5)), dtype="u1")
        h_flux, h_dqf, he_flux, he_dqf = light.copy(), light_dqf.copy(), light.copy(), light_dqf
        h_dqf[1, :] = DEGRADED_DYNAMIC_ERROR | DEGRADED_DEADTIME  # degraded everywhere: kept
        h_dqf[2, 0] = INVALID_MISSING_L0  # invalid in band 1 only: dropped there
        h_dqf[2, 4] = np.ma.masked  # no flag at all: dropped
        h_flux[3, 1] = np.ma.masked  # fill in band 2 only
        h_flux[3, 2] = -1.0  # a negative flux is not a reading
        he_dqf = he_dqf.copy()
        he_dqf[0, 0] = INVALID_SGPS_INPUTS  # the helium-only invalid bit: dropped
        # A quiet day: the heavier groups have no counts, hence no flux at all.
        heavy = np.ma.masked_all((5, 5), dtype="f4")
        heavy_dqf = np.full((5, 5), DEGRADED_DYNAMIC_ERROR | DEGRADED_DEADTIME, dtype="u1")
        contents = {"H": (h_flux, h_dqf), "He": (he_flux, he_dqf)}
        for group in GROUPS:
            flux = dataset.createVariable(
                f"{group}5MinuteDifferentialFluxes",
                "f4",
                ("report_number", "energy"),
                fill_value=np.float32(FILL),
            )
            flux.units = units
            dqf = dataset.createVariable(
                f"{group}5MinuteDifferentialFluxDQFs",
                "u1",
                ("report_number", "energy"),
                fill_value=np.uint8(255),
            )
            if group == "He":
                dqf.flag_masks = np.asarray([127, *MASKS[1:], 64], dtype="u1")
                dqf.flag_meanings = f"{MEANINGS} invalid_due_to_sgps_inputs_qf"
            else:
                dqf.flag_masks = np.asarray(MASKS, dtype="u1")
                dqf.flag_meanings = MEANINGS
            flux[:], dqf[:] = contents.get(group, (heavy, heavy_dqf))
    return path.read_bytes()


def ehis_file() -> Any:
    name = "ops_seis-l1b-ehis_g19_d20261014_v0-0-2.nc"
    file = parse_file_name(name, f"https://archive.test/{name}")
    assert file is not None
    return file


def at(*offsets: int) -> list[datetime]:
    return [DAY + timedelta(minutes=offset) for offset in offsets]


def test_keeps_degraded_readings_and_drops_invalid_fill_and_negative_ones(
    tmp_path: Path,
) -> None:
    decoded = decode(ehis_netcdf(tmp_path), 19)

    assert decoded.satellite == "G19"
    assert set(decoded.series) == {channel.code for channel in CHANNELS}
    assert len(CHANNELS) == 25
    # Report 1 is degraded in every band and is kept; report 4 has no time.
    assert decoded.series["H:E1"] == list(zip(at(0, 5, 15), [0.0, 1.0, 3.0], strict=True))
    assert [stamp for stamp, _ in decoded.series["H:E2"]] == at(0, 5, 10)
    assert [stamp for stamp, _ in decoded.series["H:E3"]] == at(0, 5, 10)
    assert [stamp for stamp, _ in decoded.series["H:E4"]] == at(0, 5, 10, 15)
    assert [stamp for stamp, _ in decoded.series["H:E5"]] == at(0, 5, 15)
    assert [stamp for stamp, _ in decoded.series["He:E1"]] == at(5, 10, 15)
    assert [value for _, value in decoded.series["He:E2"]] == pytest.approx([0.1, 1.1, 2.1, 3.1])
    for group in ("CNO", "NeS", "ClNi"):
        assert decoded.series[f"{group}:E1"] == []
    assert decoded.point_count["H:E4"] == 4
    assert decoded.first_observed_at == DAY
    assert decoded.last_observed_at == DAY + timedelta(minutes=15)
    assert all(type(stamp) is datetime for stamp, _ in decoded.series["H:E4"])


def test_global_attributes_are_kept_as_json_values(tmp_path: Path) -> None:
    attributes = decode(ehis_netcdf(tmp_path), 19).attributes
    assert attributes["platform_ID"] == "G19"
    assert attributes["title"] == TITLE


def test_a_file_from_another_spacecraft_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="GOES-19"):
        decode(ehis_netcdf(tmp_path, platform="G18"), 19)


def test_a_file_of_another_product_is_rejected(tmp_path: Path) -> None:
    title = "GOES-R Series Level 1b SEISS Magnetospheric Particle Sensor Low Energy (MPS-LO)"
    with pytest.raises(ValueError, match="EHIS"):
        decode(ehis_netcdf(tmp_path, title=title), 19)


def test_unexpected_units_are_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="units"):
        decode(ehis_netcdf(tmp_path, units="cm-2 sr-1 s-1 keV-1"), 19)


def test_flag_masks_without_matching_meanings_are_rejected(tmp_path: Path) -> None:
    path = tmp_path / "ehis.nc"
    path.write_bytes(ehis_netcdf(tmp_path))
    with Dataset(path, "a") as dataset:
        dataset.variables["H5MinuteDifferentialFluxDQFs"].flag_meanings = "good_quality_qf"
    with pytest.raises(ValueError, match="meanings"):
        decode(path.read_bytes(), 19)


def test_a_day_with_every_reading_invalid_is_empty_not_missing(tmp_path: Path) -> None:
    path = tmp_path / "ehis.nc"
    path.write_bytes(ehis_netcdf(tmp_path))
    with Dataset(path, "a") as dataset:
        for group in GROUPS:
            dataset.variables[f"{group}5MinuteDifferentialFluxDQFs"][:] = np.full(
                (5, 5), INVALID_MISSING_L0, dtype="u1"
            )
    decoded = decode(path.read_bytes(), 19)

    assert all(points == [] for points in decoded.series.values())
    assert decoded.first_observed_at is None
    assert decoded.last_observed_at is None


def test_one_point_per_reading_tagged_by_satellite_product_and_channel() -> None:
    decoded = EhisDecoded(
        satellite="G19",
        series={"H:E1": [(DAY, 0.5), (DAY + timedelta(minutes=5), 0.25)], "He:E1": []},
    )
    lines = [point.to_line_protocol() for point in build_points(decoded)]

    assert len(lines) == 2
    tags, fields, stamp = lines[0].split(" ")
    assert tags.startswith(f"{ehis_readings.MEASUREMENT},")
    assert {"satellite=G19", "product=EHIS", "channel=H:E1"} <= set(tags.split(",")[1:])
    assert set(fields.split(",")) == {"value=0.5", "valid=true"}
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

    monkeypatch.setattr(ehis_readings, "session_scope", fake_session_scope)
    return session


MODIFIED = datetime(2026, 10, 15, 4, 31, 27, tzinfo=UTC)


def fields_of(line: str) -> set[str]:
    return set(line.split(" ")[1].split(","))


async def test_persist_writes_every_batch_before_the_catalogue_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order: list[str] = []
    session = fake_database(monkeypatch, [None, FILE_ID], order)
    monkeypatch.setattr(ehis_readings, "BATCH_SIZE", 2)
    influx = AsyncMock()
    influx.write.side_effect = lambda points: order.append(f"influx:{len(points)}")
    decoded = EhisDecoded(
        satellite="G19",
        series={
            "H:E1": [(DAY + timedelta(minutes=5 * offset), 0.5) for offset in range(3)],
            "He:E1": [(DAY, 0.1), (DAY + timedelta(minutes=15), 0.2)],
        },
        attributes={"title": TITLE},
    )

    file_id = await EhisReadings(influx=influx).persist(decoded, ehis_file(), MODIFIED)

    assert file_id == FILE_ID
    assert order == ["postgres", "influx:2", "influx:2", "influx:1", "postgres"]
    _, stmt = session.executed
    row = stmt.compile(dialect=postgresql.dialect()).params
    assert row["satellite"] == "G19"
    assert row["product"] == "EHIS"
    assert row["day"] == date(2026, 10, 14)
    assert row["version"] == "0-0-2"
    assert row["source_modified_at"] == MODIFIED
    assert row["first_observed_at"] == DAY
    assert row["last_observed_at"] == DAY + timedelta(minutes=15)
    assert row["point_count"] == {"H:E1": 3, "He:E1": 2}


async def test_a_republished_day_withdraws_the_readings_it_dropped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    order: list[str] = []
    later = DAY + timedelta(minutes=10)
    session = fake_database(monkeypatch, [(DAY, later), FILE_ID], order)
    influx = AsyncMock()
    influx.query.return_value = [
        {"channel": "H:E1", "ns": int(DAY.timestamp()) * 10**9 + offset * 300 * 10**9}
        for offset in range(3)
    ]
    influx.write.side_effect = lambda points: order.append("influx")
    decoded = EhisDecoded(satellite="G19", series={"H:E1": [(DAY, 0.5)]})

    await EhisReadings(influx=influx).persist(decoded, ehis_file(), MODIFIED)

    lookup = str(session.executed[0].compile(dialect=postgresql.dialect()))
    assert "solar.ehis_files.day" in lookup
    sql = influx.query.await_args.args[0]
    assert "FROM ehis_flux" in sql
    assert "satellite = 'G19'" in sql
    assert "product = 'EHIS'" in sql
    assert "time >= '2026-10-14T00:00:00.000000Z'" in sql
    assert "time <= '2026-10-14T00:10:00.000000Z'" in sql
    lines = [point.to_line_protocol() for point in influx.write.await_args.args[0]]
    assert [fields_of(line) for line in lines] == [
        {"valid=false"},
        {"valid=false"},
        {"valid=true", "value=0.5"},
    ]
    assert order == ["postgres", "influx", "postgres"]


@pytest.mark.parametrize("previous", [None, (None, None)])
async def test_a_first_or_empty_earlier_ingest_withdraws_nothing(
    monkeypatch: pytest.MonkeyPatch, previous: Any
) -> None:
    fake_database(monkeypatch, [previous, FILE_ID], [])
    influx = AsyncMock()
    decoded = EhisDecoded(satellite="G19", series={"H:E1": [(DAY, 0.5)]})

    await EhisReadings(influx=influx).persist(decoded, ehis_file(), MODIFIED)

    influx.query.assert_not_awaited()
    (written,) = influx.write.await_args_list
    assert all("valid=true" in fields_of(point.to_line_protocol()) for point in written.args[0])


async def test_a_failed_influx_write_leaves_no_catalogue_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = fake_database(monkeypatch, [None, FILE_ID], [])
    influx = AsyncMock()
    influx.write.side_effect = RuntimeError("influx is down")
    decoded = EhisDecoded(satellite="G19", series={"H:E1": [(DAY, 0.5)]})

    with pytest.raises(RuntimeError):
        await EhisReadings(influx=influx).persist(decoded, ehis_file(), None)
    assert len(session.executed) == 1


@pytest.mark.parametrize("recorded", [None, MODIFIED])
async def test_ingested_reads_the_recorded_last_modified(
    monkeypatch: pytest.MonkeyPatch, recorded: datetime | None
) -> None:
    fake_database(monkeypatch, [(recorded,)], [])
    assert await EhisReadings.ingested(ehis_file()) == IngestedFile(source_modified_at=recorded)


async def test_a_file_never_ingested_has_no_record(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_database(monkeypatch, [None], [])
    assert await EhisReadings.ingested(ehis_file()) is None
