"""Decodes one daily MAG L2 1-minute file and stores its readings.

A daily ``magn-l2-avg1m`` file holds 1 440 one-minute averages of the
geomagnetic field at the spacecraft, in several coordinate frames. Four series
are kept, the ones the ``/datos`` explorer offers for the ``GEOF`` product
(``apps/web/app/lib/scientific-data.ts``):

- ``EPN-x``, ``EPN-y``, ``EPN-z``: the field in the Earth-Poleward-Normal frame
  (``b_epn``), in nT.
- ``total``: the field magnitude (``b_total``), in nT.

Each is written to InfluxDB as its own series, and one row in
``solar.mag_files`` records that the day was ingested.

What counts as a reading:

- Fill values are masked by netCDF4 itself (``_FillValue``, ``-9999``).
- A report whose ``DQF`` carries any bit of ``good_quality_qf`` is dropped.
  ``valid_arcjet_correction_qf`` sits outside that mask and is kept, as the
  ``query-goes-archive`` job already does for the L1b granules.
- A report whose ``b_quality`` is not ``0`` (good) is dropped: ``1`` is
  degraded and ``2`` bad.

Unlike EXIS irradiance, a field component is signed, so negative values are
real readings and are kept.

Every point carries a boolean ``valid`` field, and readers must filter on it;
a reading a republished day no longer has is overwritten with ``valid=false``
(:func:`stale_points`), as InfluxDB 3 Core cannot delete single points.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import numpy as np
from netCDF4 import Dataset, num2date
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.clients.db import session_scope
from app.clients.influx import InfluxClient, Point, get_influx_client
from app.clients.mag import MagFile
from app.clients.netcdf import (
    NETCDF_LOCK,
    bad_quality,
    epoch_nanoseconds,
    json_attribute,
    plain_utc,
)
from app.db.models import MagFile as MagFileRow
from app.logging import get_logger

log = get_logger(__name__)

MEASUREMENT = "mag_field"
PRODUCT = "GEOF"
UNIT = "nT"
BATCH_SIZE = 10_000


@dataclass(frozen=True)
class Channel:
    """One stored series: its code, its variable, and the column of a vector variable."""

    code: str
    variable: str
    column: int | None = None


CHANNELS: tuple[Channel, ...] = (
    Channel("EPN-x", "b_epn", 0),
    Channel("EPN-y", "b_epn", 1),
    Channel("EPN-z", "b_epn", 2),
    Channel("total", "b_total"),
)


@dataclass(frozen=True)
class MagDecoded:
    """Everything a daily file contributes, already cleaned and in UTC."""

    satellite: str
    series: dict[str, list[tuple[datetime, float]]]
    attributes: dict[str, Any] = field(default_factory=dict)

    @property
    def point_count(self) -> dict[str, int]:
        return {code: len(points) for code, points in self.series.items()}

    @property
    def first_observed_at(self) -> datetime | None:
        starts = [points[0][0] for points in self.series.values() if points]
        return min(starts) if starts else None

    @property
    def last_observed_at(self) -> datetime | None:
        ends = [points[-1][0] for points in self.series.values() if points]
        return max(ends) if ends else None


def _channel_values(dataset: Any, channel: Channel) -> Any:
    data = dataset.variables[channel.variable]
    if data.units != UNIT:
        raise ValueError(f"Unexpected units for {channel.variable}: {data.units!r}")
    return data[:] if channel.column is None else data[:, channel.column]


def _degraded(dataset: Any) -> Any:
    """``True`` for every report ``b_quality`` does not call good (``0``)."""
    quality = dataset.variables["b_quality"][:]
    return np.ma.filled(quality, 255) != 0


def decode(content: bytes, spacecraft: int) -> MagDecoded:
    """Pure and CPU-bound: a daily NetCDF file -> every channel's readings.

    Runs on a worker thread (see the ``mag-pipeline`` processor), under the
    process-wide netCDF lock. Raises ``ValueError`` if the file is not the
    1-minute MAG product of the spacecraft that was asked for.
    """
    with NETCDF_LOCK, Dataset("mag.nc", memory=content) as dataset:
        # The L2 files name the platform in lowercase ("g19") and have no `platform_ID`.
        satellite = str(getattr(dataset, "platform", "")).upper()
        if satellite != f"G{spacecraft}":
            raise ValueError(f"Expected GOES-{spacecraft} data, the file is from {satellite!r}")
        title = str(getattr(dataset, "title", ""))
        if "Magnetometer" not in title or "1-minute Averages" not in title:
            raise ValueError("The file is not a MAG 1-minute geomagnetic field product")

        time_variable = dataset.variables["time"]
        times = time_variable[:]
        time_valid = ~np.ma.getmaskarray(times) & np.isfinite(np.ma.filled(times, np.nan))
        report_valid = time_valid & ~bad_quality(dataset, "DQF") & ~_degraded(dataset)

        series: dict[str, list[tuple[datetime, float]]] = {}
        for channel in CHANNELS:
            values = _channel_values(dataset, channel)
            if values.shape != times.shape:
                raise ValueError(f"Time and {channel.variable} dimensions do not match")
            filled = np.ma.filled(values.astype(np.float64), np.nan)
            valid = report_valid & ~np.ma.getmaskarray(values) & np.isfinite(filled)
            if not valid.any():
                series[channel.code] = []
                continue
            decoded = num2date(
                np.ma.filled(times, np.nan)[valid],
                units=time_variable.units,
                calendar=getattr(time_variable, "calendar", "standard"),
                only_use_cftime_datetimes=False,
                only_use_python_datetimes=True,
            )
            stamps = [decoded] if isinstance(decoded, datetime) else list(decoded)
            series[channel.code] = sorted(
                (plain_utc(stamp), float(value))
                for stamp, value in zip(stamps, filled[valid], strict=True)
            )

        attributes = {name: json_attribute(dataset.getncattr(name)) for name in dataset.ncattrs()}
    return MagDecoded(satellite=satellite, series=series, attributes=attributes)


def _point(satellite: str, channel: str) -> Point:
    point: Point = (
        Point(MEASUREMENT)
        .tag("satellite", satellite)
        .tag("product", PRODUCT)
        .tag("channel", channel)
    )
    return point


def build_points(decoded: MagDecoded) -> list[Point]:
    """One InfluxDB point per reading. CPU-bound; the caller runs it on a thread."""
    return [
        _point(decoded.satellite, code).field("value", value).field("valid", True).time(stamp)
        for code, points in decoded.series.items()
        for stamp, value in points
    ]


def stale_points(decoded: MagDecoded, stored: list[dict[str, Any]]) -> list[Point]:
    """A ``valid=false`` point for every stored reading ``decoded`` no longer has.

    ``stored`` holds the rows already in InfluxDB for the day, as ``channel``
    and ``ns`` (the timestamp in nanoseconds).
    """
    kept = {
        (code, epoch_nanoseconds(stamp))
        for code, points in decoded.series.items()
        for stamp, _ in points
    }
    gone = sorted({(str(row["channel"]), int(row["ns"])) for row in stored} - kept)
    return [
        _point(decoded.satellite, channel).field("valid", False).time(ns) for channel, ns in gone
    ]


def _stored_query(satellite: str, first: datetime, last: datetime) -> str:
    # The satellite is validated by `decode` and the product is a constant, never free text.
    return (
        f"SELECT channel, CAST(time AS BIGINT) AS ns FROM {MEASUREMENT} "
        f"WHERE satellite = '{satellite}' AND product = '{PRODUCT}' "
        f"AND time >= '{first.astimezone(UTC):%Y-%m-%dT%H:%M:%S.%fZ}' "
        f"AND time <= '{last.astimezone(UTC):%Y-%m-%dT%H:%M:%S.%fZ}'"
    )


@dataclass(frozen=True)
class IngestedFile:
    """What the catalogue remembers about a file it has ingested."""

    source_modified_at: datetime | None


class MagReadings:
    """Stores a decoded daily file: its readings in InfluxDB, and its
    catalogue row in Postgres.
    """

    def __init__(self, influx: InfluxClient | None = None) -> None:
        self._influx = influx or get_influx_client()

    @staticmethod
    async def ingested(file: MagFile) -> IngestedFile | None:
        """What was recorded when ``file`` (this exact name) was ingested, or
        ``None`` if it never was.
        """
        stmt = select(MagFileRow.source_modified_at).where(MagFileRow.file_name == file.name)
        async with session_scope() as session:
            result = await session.execute(stmt)
            row = result.one_or_none()
        return None if row is None else IngestedFile(source_modified_at=row[0])

    async def persist(
        self, decoded: MagDecoded, file: MagFile, source_modified_at: datetime | None
    ) -> uuid.UUID:
        """Withdraw readings the file no longer has, write its InfluxDB points,
        then upsert the Postgres row.

        As for EXIS, the row is written last: it is what tells the next run
        "this day is done", so a failure part-way leaves the day to be redone.
        """
        points = await self._stale_points(decoded, file)
        points += await asyncio.to_thread(build_points, decoded)
        for offset in range(0, len(points), BATCH_SIZE):
            await self._influx.write(points[offset : offset + BATCH_SIZE])

        now = datetime.now(UTC)
        values: dict[str, Any] = {
            "satellite": decoded.satellite,
            "product": PRODUCT,
            "day": file.day,
            "file_name": file.name,
            "version": file.version_label,
            "source_url": file.url,
            "source_modified_at": source_modified_at,
            "first_observed_at": decoded.first_observed_at,
            "last_observed_at": decoded.last_observed_at,
            "point_count": decoded.point_count,
            "attributes": decoded.attributes,
        }
        stmt = (
            insert(MagFileRow)
            .values(**values, created_at=now, updated_at=now)
            .on_conflict_do_update(
                # A higher `_vX-Y-Z` of the same day replaces the older row.
                index_elements=[MagFileRow.satellite, MagFileRow.product, MagFileRow.day],
                set_={**values, "updated_at": now},
            )
            .returning(MagFileRow.id)
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            file_id: uuid.UUID = result.scalar_one()

        log.info(
            "persisted mag file",
            file_id=str(file_id),
            satellite=decoded.satellite,
            day=file.day.isoformat(),
            points=len(points),
        )
        return file_id

    async def _stale_points(self, decoded: MagDecoded, file: MagFile) -> list[Point]:
        """Tombstones for the readings an earlier ingest of this day stored and
        ``decoded`` drops. Empty the first time a day is ingested.
        """
        stmt = select(MagFileRow.first_observed_at, MagFileRow.last_observed_at).where(
            MagFileRow.satellite == decoded.satellite,
            MagFileRow.product == PRODUCT,
            MagFileRow.day == file.day,
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            previous = result.one_or_none()
        if previous is None or previous[0] is None or previous[1] is None:
            return []
        stored = await self._influx.query(
            _stored_query(decoded.satellite, previous[0], previous[1])
        )
        stale = await asyncio.to_thread(stale_points, decoded, stored)
        if stale:
            log.info(
                "withdrawing mag readings",
                satellite=decoded.satellite,
                day=file.day.isoformat(),
                readings=len(stale),
            )
        return stale
