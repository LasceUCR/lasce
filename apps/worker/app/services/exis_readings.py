"""Decodes one daily EXIS L1b file and stores its readings.

A daily file holds every channel of its product at once: SFXR has both XRS
bands at 1 s cadence (86 400 reports), and SFEU has seven EUV lines and the
Mg II index at 30 s cadence (2 880 reports). Every channel is decoded in one
pass and written to InfluxDB as its own series, and one row in
``solar.exis_files`` records that the day was ingested.

The channel codes are the parameter codes the ``/datos`` explorer already uses
(``apps/web/app/lib/scientific-data.ts``), so a chart can ask InfluxDB for
exactly the series a user picked there.

Three things decide what counts as a reading, and match what
:mod:`app.processors.query_goes_archive` already does with the CITIC granules:

- Fill values are masked by netCDF4 itself (``_FillValue``).
- A report whose quality flags carry any bit of the first ``flag_masks`` entry
  (``good_quality_qf``) is dropped, not stored as a suspicious number.
- For XRS, each report is taken from whichever detector ``primary_xrs*``
  names, never averaged across both (:func:`app.clients.netcdf.primary_irradiance`).

Every point carries a boolean ``valid`` field, and readers must filter on it.
InfluxDB 3 Core cannot delete single points, so when a republished day drops a
reading the earlier version had, that reading is overwritten with
``valid=false`` instead of being removed (:func:`stale_points`).
"""

import asyncio
import math
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import numpy as np
from netCDF4 import Dataset, num2date
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.clients.db import session_scope
from app.clients.exis import ExisFile, ExisProduct
from app.clients.influx import InfluxClient, Point, get_influx_client
from app.clients.netcdf import NETCDF_LOCK, primary_irradiance
from app.db.models import ExisFile as ExisFileRow
from app.logging import get_logger

log = get_logger(__name__)

MEASUREMENT = "exis_irradiance"
# About 17 writes for a full SFXR day (2 bands x 86 400 reports); small enough
# that one failed request does not have to resend the whole day.
BATCH_SIZE = 10_000

# Which part of the file names the product, so a file saved under the wrong
# directory is rejected instead of decoded as the wrong channels.
_TITLE_SUFFIX = {ExisProduct.SFEU: "EUV", ExisProduct.SFXR: "X-Ray"}
_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


@dataclass(frozen=True)
class Channel:
    """One stored series: its code, where it lives in the file, and its unit."""

    code: str
    variable: str
    quality: str
    unit: str


CHANNELS: dict[ExisProduct, tuple[Channel, ...]] = {
    ExisProduct.SFEU: (
        Channel("1175", "avgIrradiance1175", "qualityFlags", "W m-2"),
        Channel("1216", "avgIrradiance1216", "qualityFlags", "W m-2"),
        Channel("1335", "avgIrradiance1335", "qualityFlags", "W m-2"),
        Channel("1405", "avgIrradiance1405", "qualityFlags", "W m-2"),
        Channel("256", "avgIrradiance256", "qualityFlags", "W m-2"),
        Channel("284", "avgIrradiance284", "qualityFlags", "W m-2"),
        Channel("304", "avgIrradiance304", "qualityFlags", "W m-2"),
        # The NOAA historical scale, so the index continues the long-standing series.
        Channel("mgii_index", "avgRatioMgNoaa", "qualityFlags", "1"),
    ),
    ExisProduct.SFXR: (
        # `xrsa`/`xrsb` name the band; primary_irradiance picks the detector.
        Channel("0.05-0.4nm", "xrsa", "quality_flags", "W m-2"),
        Channel("0.1-0.8nm", "xrsb", "quality_flags", "W m-2"),
    ),
}


@dataclass(frozen=True)
class ExisDecoded:
    """Everything a daily file contributes, already cleaned and in UTC.

    A plain value, so :func:`decode` is testable without a database or an
    InfluxDB client.
    """

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


def _attribute(value: Any) -> Any:
    """One NetCDF global attribute, made safe for a ``jsonb`` column."""
    if isinstance(value, np.ndarray):
        return [_attribute(item) for item in value.tolist()]
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if value is None or isinstance(value, str | bool | int | float):
        return value
    return str(value)


def _utc(stamp: datetime) -> datetime:
    """A plain, UTC-aware ``datetime``.

    ``num2date`` hands back cftime's ``real_datetime`` subclass; rebuilding a
    plain one keeps database drivers from having to know about it.
    """
    return datetime(
        stamp.year,
        stamp.month,
        stamp.day,
        stamp.hour,
        stamp.minute,
        stamp.second,
        stamp.microsecond,
        tzinfo=UTC,
    )


def _quality_mask(dataset: Any, name: str) -> Any:
    """``True`` for every report whose quality flags say it is not good."""
    quality = dataset.variables[name]
    good_mask = int(np.asarray(quality.flag_masks).flat[0])
    flags = quality[:]
    # A missing flag is not a good flag: fill it with every bit set.
    filled = np.ma.filled(flags, np.iinfo(flags.dtype).max)
    return np.bitwise_and(filled, good_mask) != 0


def _channel_values(dataset: Any, product: ExisProduct, channel: Channel) -> Any:
    if product is ExisProduct.SFXR:
        return primary_irradiance(dataset, channel.variable, channel.unit)
    data = dataset.variables[channel.variable]
    if data.units != channel.unit:
        raise ValueError(f"Unexpected units for {channel.variable}: {data.units!r}")
    return data[:]


def decode(content: bytes, product: ExisProduct, spacecraft: int) -> ExisDecoded:
    """Pure and CPU-bound: a daily NetCDF file -> every channel's readings.

    Runs on a worker thread (see the ``exis-pipeline`` processor), under the
    process-wide netCDF lock. Raises ``ValueError`` if the file is not the
    product or spacecraft that was asked for.
    """
    with NETCDF_LOCK, Dataset("exis.nc", memory=content) as dataset:
        satellite = str(dataset.platform_ID)
        if satellite != f"G{spacecraft}":
            raise ValueError(f"Expected GOES-{spacecraft} data, the file is from {satellite}")
        if not str(getattr(dataset, "title", "")).endswith(_TITLE_SUFFIX[product]):
            raise ValueError(f"The file is not an EXIS {product.value} product")

        time_variable = dataset.variables["time"]
        times = time_variable[:]
        time_valid = ~np.ma.getmaskarray(times) & np.isfinite(np.ma.filled(times, np.nan))

        series: dict[str, list[tuple[datetime, float]]] = {}
        for channel in CHANNELS[product]:
            values = _channel_values(dataset, product, channel)
            if values.shape != times.shape:
                raise ValueError(f"Time and {channel.variable} dimensions do not match")
            filled = np.ma.filled(values.astype(np.float64), np.nan)
            valid = time_valid & ~np.ma.getmaskarray(values) & np.isfinite(filled)
            valid &= ~_quality_mask(dataset, channel.quality)
            valid &= filled >= 0
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
                (_utc(stamp), float(value))
                for stamp, value in zip(stamps, filled[valid], strict=True)
            )

        attributes = {name: _attribute(dataset.getncattr(name)) for name in dataset.ncattrs()}
    return ExisDecoded(satellite=satellite, series=series, attributes=attributes)


def _nanoseconds(stamp: datetime) -> int:
    """``stamp`` as integer nanoseconds since the epoch, exactly as InfluxDB keys it."""
    delta = stamp - _EPOCH
    return (delta.days * 86_400 + delta.seconds) * 10**9 + delta.microseconds * 1_000


def _point(satellite: str, product: ExisProduct, channel: str) -> Point:
    point: Point = (
        Point(MEASUREMENT)
        .tag("satellite", satellite)
        .tag("product", product.value)
        .tag("channel", channel)
    )
    return point


def build_points(product: ExisProduct, decoded: ExisDecoded) -> list[Point]:
    """One InfluxDB point per reading. CPU-bound; the caller runs it on a thread."""
    return [
        _point(decoded.satellite, product, code)
        .field("value", value)
        .field("valid", True)
        .time(stamp)
        for code, points in decoded.series.items()
        for stamp, value in points
    ]


def stale_points(
    product: ExisProduct, decoded: ExisDecoded, stored: list[dict[str, Any]]
) -> list[Point]:
    """A ``valid=false`` point for every stored reading ``decoded`` no longer has.

    ``stored`` holds the rows already in InfluxDB for the day, as ``channel``
    and ``ns`` (the timestamp in nanoseconds). Only ``valid`` is written, and
    InfluxDB merges fields on the same series and timestamp, so the old
    ``value`` stays readable but is marked as withdrawn.
    """
    kept = {
        (code, _nanoseconds(stamp))
        for code, points in decoded.series.items()
        for stamp, _ in points
    }
    gone = sorted({(str(row["channel"]), int(row["ns"])) for row in stored} - kept)
    return [
        _point(decoded.satellite, product, channel).field("valid", False).time(ns)
        for channel, ns in gone
    ]


def _stored_query(satellite: str, product: ExisProduct, first: datetime, last: datetime) -> str:
    # Both tags are validated values (`decode` checks the satellite, the product
    # is an enum), never free text, so formatting them in is safe.
    return (
        f"SELECT channel, CAST(time AS BIGINT) AS ns FROM {MEASUREMENT} "
        f"WHERE satellite = '{satellite}' AND product = '{product.value}' "
        f"AND time >= '{first.astimezone(UTC):%Y-%m-%dT%H:%M:%S.%fZ}' "
        f"AND time <= '{last.astimezone(UTC):%Y-%m-%dT%H:%M:%S.%fZ}'"
    )


@dataclass(frozen=True)
class IngestedFile:
    """What the catalogue remembers about a file it has ingested."""

    source_modified_at: datetime | None


class ExisReadings:
    """Stores a decoded daily file: its readings in InfluxDB, and its
    catalogue row in Postgres.
    """

    def __init__(self, influx: InfluxClient | None = None) -> None:
        self._influx = influx or get_influx_client()

    @staticmethod
    async def ingested(file: ExisFile) -> IngestedFile | None:
        """What was recorded when ``file`` (this exact name) was ingested, or
        ``None`` if it never was.
        """
        stmt = select(ExisFileRow.source_modified_at).where(ExisFileRow.file_name == file.name)
        async with session_scope() as session:
            result = await session.execute(stmt)
            row = result.one_or_none()
        return None if row is None else IngestedFile(source_modified_at=row[0])

    async def persist(
        self, decoded: ExisDecoded, file: ExisFile, source_modified_at: datetime | None
    ) -> uuid.UUID:
        """Withdraw readings the file no longer has, write its InfluxDB points,
        then upsert the Postgres row.

        The order is deliberate and the reverse of SUVI's: the row is what
        tells the next run "this day is done", so it is written only once
        every point has been. A failure part-way leaves the previous row (or
        none), and the next run redoes the whole day. That is safe because
        InfluxDB replaces a point with the same series and timestamp instead
        of duplicating it.
        """
        points = await self._stale_points(decoded, file)
        points += await asyncio.to_thread(build_points, file.product, decoded)
        for offset in range(0, len(points), BATCH_SIZE):
            await self._influx.write(points[offset : offset + BATCH_SIZE])

        now = datetime.now(UTC)
        values: dict[str, Any] = {
            "satellite": decoded.satellite,
            "product": file.product.value,
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
            insert(ExisFileRow)
            .values(**values, created_at=now, updated_at=now)
            .on_conflict_do_update(
                # A higher `_vX-Y-Z` of the same day replaces the older row.
                index_elements=[ExisFileRow.satellite, ExisFileRow.product, ExisFileRow.day],
                set_={**values, "updated_at": now},
            )
            .returning(ExisFileRow.id)
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            file_id: uuid.UUID = result.scalar_one()

        log.info(
            "persisted exis file",
            file_id=str(file_id),
            satellite=decoded.satellite,
            product=file.product.value,
            day=file.day.isoformat(),
            points=len(points),
        )
        return file_id

    async def _stale_points(self, decoded: ExisDecoded, file: ExisFile) -> list[Point]:
        """Tombstones for the readings an earlier ingest of this day stored and
        ``decoded`` drops. Empty the first time a day is ingested.

        The row is looked up by day, not by name, so a higher ``_vX-Y-Z``
        withdraws what the lower one wrote.
        """
        stmt = select(ExisFileRow.first_observed_at, ExisFileRow.last_observed_at).where(
            ExisFileRow.satellite == decoded.satellite,
            ExisFileRow.product == file.product.value,
            ExisFileRow.day == file.day,
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            previous = result.one_or_none()
        if previous is None or previous[0] is None or previous[1] is None:
            return []
        stored = await self._influx.query(
            _stored_query(decoded.satellite, file.product, previous[0], previous[1])
        )
        stale = await asyncio.to_thread(stale_points, file.product, decoded, stored)
        if stale:
            log.info(
                "withdrawing exis readings",
                satellite=decoded.satellite,
                product=file.product.value,
                day=file.day.isoformat(),
                readings=len(stale),
            )
        return stale
