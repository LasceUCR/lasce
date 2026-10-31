"""Stores one decoded SEISS daily file, whatever the product.

Every SEISS product is written the same way, so this module holds what the
per-product decoders (:mod:`app.services.seiss.ehis`,
:mod:`app.services.seiss.sgps`, :mod:`app.services.seiss.mpsh`) do not: the
decoded shape, the InfluxDB points, the withdrawal of readings a republished
day dropped, and the catalogue row in ``solar.seiss_files``.

Each product has its own InfluxDB measurement, because the products tag their
channels differently, but every point carries the same tags (``satellite``,
``product``, ``channel``) and fields (``value``, ``valid``) as the EXIS and MAG
measurements, so ``/datos`` reads all of them with one query shape. Readers
must filter on ``valid``; a reading a republished day no longer has is
overwritten with ``valid=false`` (:func:`stale_points`), as InfluxDB 3 Core
cannot delete single points.
"""

import asyncio
import uuid
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import numpy as np
from netCDF4 import num2date
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.clients.db import session_scope
from app.clients.influx import InfluxClient, Point, get_influx_client
from app.clients.netcdf import epoch_nanoseconds, plain_utc
from app.clients.seiss import SeissFile, SeissProduct
from app.db.models import SeissFile as SeissFileRow
from app.logging import get_logger

log = get_logger(__name__)

BATCH_SIZE = 10_000


@dataclass(frozen=True)
class SeissDecoded:
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


def readings(
    time_variable: Any, times: Any, values: Any, valid: Any
) -> list[tuple[datetime, float]]:
    """The ``(time, value)`` pairs where ``valid`` holds, oldest first.

    ``times`` are the raw values of ``time_variable`` (whose ``units`` say how
    to read them) and ``values`` a float array of the same length.
    """
    if not valid.any():
        return []
    decoded = num2date(
        np.ma.filled(times, np.nan)[valid],
        units=time_variable.units,
        calendar=getattr(time_variable, "calendar", "standard"),
        only_use_cftime_datetimes=False,
        only_use_python_datetimes=True,
    )
    stamps: Iterable[datetime] = [decoded] if isinstance(decoded, datetime) else list(decoded)
    return sorted(
        (plain_utc(stamp), float(value)) for stamp, value in zip(stamps, values[valid], strict=True)
    )


def _point(measurement: str, product: SeissProduct, satellite: str, channel: str) -> Point:
    point: Point = (
        Point(measurement)
        .tag("satellite", satellite)
        .tag("product", product.value)
        .tag("channel", channel)
    )
    return point


def build_points(measurement: str, product: SeissProduct, decoded: SeissDecoded) -> list[Point]:
    """One InfluxDB point per reading. CPU-bound; the caller runs it on a thread."""
    return [
        _point(measurement, product, decoded.satellite, code)
        .field("value", value)
        .field("valid", True)
        .time(stamp)
        for code, points in decoded.series.items()
        for stamp, value in points
    ]


def stale_points(
    measurement: str,
    product: SeissProduct,
    decoded: SeissDecoded,
    stored: list[dict[str, Any]],
) -> list[Point]:
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
        _point(measurement, product, decoded.satellite, channel).field("valid", False).time(ns)
        for channel, ns in gone
    ]


def _stored_query(
    measurement: str, product: SeissProduct, satellite: str, first: datetime, last: datetime
) -> str:
    # The measurement and product come from code, and the satellite is validated by the decoder.
    return (
        f"SELECT channel, CAST(time AS BIGINT) AS ns FROM {measurement} "
        f"WHERE satellite = '{satellite}' AND product = '{product.value}' "
        f"AND time >= '{first.astimezone(UTC):%Y-%m-%dT%H:%M:%S.%fZ}' "
        f"AND time <= '{last.astimezone(UTC):%Y-%m-%dT%H:%M:%S.%fZ}'"
    )


@dataclass(frozen=True)
class IngestedFile:
    """What the catalogue remembers about a file it has ingested."""

    source_modified_at: datetime | None


class SeissReadings:
    """Stores the decoded daily files of one product: their readings in
    InfluxDB, and their catalogue rows in Postgres.
    """

    def __init__(
        self, product: SeissProduct, measurement: str, influx: InfluxClient | None = None
    ) -> None:
        self.product = product
        self.measurement = measurement
        self._influx = influx or get_influx_client()

    @staticmethod
    async def ingested(file: SeissFile) -> IngestedFile | None:
        """What was recorded when ``file`` (this exact name) was ingested, or
        ``None`` if it never was.
        """
        stmt = select(SeissFileRow.source_modified_at).where(SeissFileRow.file_name == file.name)
        async with session_scope() as session:
            result = await session.execute(stmt)
            row = result.one_or_none()
        return None if row is None else IngestedFile(source_modified_at=row[0])

    async def persist(
        self, decoded: SeissDecoded, file: SeissFile, source_modified_at: datetime | None
    ) -> uuid.UUID:
        """Withdraw readings the file no longer has, write its InfluxDB points,
        then upsert the Postgres row.

        As for EXIS and MAG, the row is written last: it is what tells the next run
        "this day is done", so a failure part-way leaves the day to be redone.
        """
        points = await self._stale_points(decoded, file)
        points += await asyncio.to_thread(build_points, self.measurement, self.product, decoded)
        for offset in range(0, len(points), BATCH_SIZE):
            await self._influx.write(points[offset : offset + BATCH_SIZE])

        now = datetime.now(UTC)
        values: dict[str, Any] = {
            "satellite": decoded.satellite,
            "product": self.product.value,
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
            insert(SeissFileRow)
            .values(**values, created_at=now, updated_at=now)
            .on_conflict_do_update(
                # A higher `_vX-Y-Z` of the same day replaces the older row.
                index_elements=[SeissFileRow.satellite, SeissFileRow.product, SeissFileRow.day],
                set_={**values, "updated_at": now},
            )
            .returning(SeissFileRow.id)
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            file_id: uuid.UUID = result.scalar_one()

        log.info(
            "persisted seiss file",
            file_id=str(file_id),
            product=self.product.value,
            satellite=decoded.satellite,
            day=file.day.isoformat(),
            points=len(points),
        )
        return file_id

    async def _stale_points(self, decoded: SeissDecoded, file: SeissFile) -> list[Point]:
        """Tombstones for the readings an earlier ingest of this day stored and
        ``decoded`` drops. Empty the first time a day is ingested.
        """
        stmt = select(SeissFileRow.first_observed_at, SeissFileRow.last_observed_at).where(
            SeissFileRow.satellite == decoded.satellite,
            SeissFileRow.product == self.product.value,
            SeissFileRow.day == file.day,
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            previous = result.one_or_none()
        if previous is None or previous[0] is None or previous[1] is None:
            return []
        stored = await self._influx.query(
            _stored_query(
                self.measurement, self.product, decoded.satellite, previous[0], previous[1]
            )
        )
        stale = await asyncio.to_thread(
            stale_points, self.measurement, self.product, decoded, stored
        )
        if stale:
            log.info(
                "withdrawing seiss readings",
                product=self.product.value,
                satellite=decoded.satellite,
                day=file.day.isoformat(),
                readings=len(stale),
            )
        return stale
