"""Decodes one daily SEISS EHIS L1b file and stores its readings.

A daily ``seis-l1b-ehis`` file holds 288 five-minute reports of the energetic
heavy ion directional differential flux, per mass group and energy band. The
25 series the ``/datos`` explorer offers for the ``EHIS`` product
(``apps/web/app/lib/scientific-data.ts``) are kept: five energy bands
(``E1``-``E5``) for each of five mass groups, coded ``<group>:E<band>``:

- ``H``: hydrogen, ``He``: helium,
- ``CNO``: carbon-nitrogen-oxygen, ``NeS``: neon-sulfur, ``ClNi``: chlorine-nickel.

All are in ``cm-2 sr-1 s-1 (MeV nuc-1)-1``. The per-element Be-Cu fluxes are
not stored. Each series is written to InfluxDB, and one row in
``solar.ehis_files`` records that the day was ingested.

What counts as a reading:

- Fill values are masked by netCDF4 itself (``_FillValue``, ``-1e31``), and
  negative or non-finite fluxes are dropped.
- A reading whose per-band DQF carries any **invalid** bit is dropped
  (:func:`app.clients.netcdf.invalid_quality`). A *degraded* reading is kept,
  unlike MAG and the other SEISS products: on a quiet day almost every EHIS
  reading is flagged degraded because its statistical error cannot be
  calculated from so few counts, and dropping them would leave every channel
  but one empty. See ``docs/ehis-pipeline.md``.

The file has no ``time`` variable; a report's time is the start of its
elemental flux accumulation, ``ELF_StartStopTime[:, 0]``, which the product
calls the time of observation.

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
from app.clients.ehis import EhisFile
from app.clients.influx import InfluxClient, Point, get_influx_client
from app.clients.netcdf import (
    NETCDF_LOCK,
    epoch_nanoseconds,
    invalid_quality,
    json_attribute,
    plain_utc,
)
from app.db.models import EhisFile as EhisFileRow
from app.logging import get_logger

log = get_logger(__name__)

MEASUREMENT = "ehis_flux"
PRODUCT = "EHIS"
UNIT = "cm-2 sr-1 s-1 (MeV nuc-1)-1"
TIME_VARIABLE = "ELF_StartStopTime"
GROUPS = ("H", "He", "CNO", "NeS", "ClNi")
BANDS = 5
BATCH_SIZE = 10_000


@dataclass(frozen=True)
class Channel:
    """One stored series: its code, its flux and quality variables, and its energy band."""

    code: str
    variable: str
    quality: str
    band: int


CHANNELS: tuple[Channel, ...] = tuple(
    Channel(
        f"{group}:E{band + 1}",
        f"{group}5MinuteDifferentialFluxes",
        f"{group}5MinuteDifferentialFluxDQFs",
        band,
    )
    for group in GROUPS
    for band in range(BANDS)
)


@dataclass(frozen=True)
class EhisDecoded:
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


def _group_values(dataset: Any, variable: str) -> Any:
    data = dataset.variables[variable]
    if data.units != UNIT:
        raise ValueError(f"Unexpected units for {variable}: {data.units!r}")
    return data[:]


def decode(content: bytes, spacecraft: int) -> EhisDecoded:
    """Pure and CPU-bound: a daily NetCDF file -> every channel's readings.

    Runs on a worker thread (see the ``ehis-pipeline`` processor), under the
    process-wide netCDF lock. Raises ``ValueError`` if the file is not the EHIS
    product of the spacecraft that was asked for.
    """
    with NETCDF_LOCK, Dataset("ehis.nc", memory=content) as dataset:
        satellite = str(getattr(dataset, "platform_ID", "")).upper()
        if satellite != f"G{spacecraft}":
            raise ValueError(f"Expected GOES-{spacecraft} data, the file is from {satellite!r}")
        title = str(getattr(dataset, "title", ""))
        if "Energetic Heavy Ion Sensor (EHIS)" not in title:
            raise ValueError("The file is not a SEISS EHIS energetic heavy ion product")

        time_variable = dataset.variables[TIME_VARIABLE]
        times = time_variable[:, 0]
        time_valid = ~np.ma.getmaskarray(times) & np.isfinite(np.ma.filled(times, np.nan))

        series: dict[str, list[tuple[datetime, float]]] = {}
        groups: dict[str, tuple[Any, Any]] = {}
        for channel in CHANNELS:
            if channel.variable not in groups:
                values = _group_values(dataset, channel.variable)
                if values.shape != (*times.shape, BANDS):
                    raise ValueError(f"Time and {channel.variable} dimensions do not match")
                groups[channel.variable] = (values, invalid_quality(dataset, channel.quality))
            values, invalid = groups[channel.variable]
            band = values[:, channel.band]
            filled = np.ma.filled(band.astype(np.float64), np.nan)
            valid = (
                time_valid
                & ~invalid[:, channel.band]
                & ~np.ma.getmaskarray(band)
                & np.isfinite(filled)
                & (filled >= 0)
            )
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
    return EhisDecoded(satellite=satellite, series=series, attributes=attributes)


def _point(satellite: str, channel: str) -> Point:
    point: Point = (
        Point(MEASUREMENT)
        .tag("satellite", satellite)
        .tag("product", PRODUCT)
        .tag("channel", channel)
    )
    return point


def build_points(decoded: EhisDecoded) -> list[Point]:
    """One InfluxDB point per reading. CPU-bound; the caller runs it on a thread."""
    return [
        _point(decoded.satellite, code).field("value", value).field("valid", True).time(stamp)
        for code, points in decoded.series.items()
        for stamp, value in points
    ]


def stale_points(decoded: EhisDecoded, stored: list[dict[str, Any]]) -> list[Point]:
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


class EhisReadings:
    """Stores a decoded daily file: its readings in InfluxDB, and its
    catalogue row in Postgres.
    """

    def __init__(self, influx: InfluxClient | None = None) -> None:
        self._influx = influx or get_influx_client()

    @staticmethod
    async def ingested(file: EhisFile) -> IngestedFile | None:
        """What was recorded when ``file`` (this exact name) was ingested, or
        ``None`` if it never was.
        """
        stmt = select(EhisFileRow.source_modified_at).where(EhisFileRow.file_name == file.name)
        async with session_scope() as session:
            result = await session.execute(stmt)
            row = result.one_or_none()
        return None if row is None else IngestedFile(source_modified_at=row[0])

    async def persist(
        self, decoded: EhisDecoded, file: EhisFile, source_modified_at: datetime | None
    ) -> uuid.UUID:
        """Withdraw readings the file no longer has, write its InfluxDB points,
        then upsert the Postgres row.

        As for EXIS and MAG, the row is written last: it is what tells the next run
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
            insert(EhisFileRow)
            .values(**values, created_at=now, updated_at=now)
            .on_conflict_do_update(
                # A higher `_vX-Y-Z` of the same day replaces the older row.
                index_elements=[EhisFileRow.satellite, EhisFileRow.product, EhisFileRow.day],
                set_={**values, "updated_at": now},
            )
            .returning(EhisFileRow.id)
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            file_id: uuid.UUID = result.scalar_one()

        log.info(
            "persisted ehis file",
            file_id=str(file_id),
            satellite=decoded.satellite,
            day=file.day.isoformat(),
            points=len(points),
        )
        return file_id

    async def _stale_points(self, decoded: EhisDecoded, file: EhisFile) -> list[Point]:
        """Tombstones for the readings an earlier ingest of this day stored and
        ``decoded`` drops. Empty the first time a day is ingested.
        """
        stmt = select(EhisFileRow.first_observed_at, EhisFileRow.last_observed_at).where(
            EhisFileRow.satellite == decoded.satellite,
            EhisFileRow.product == PRODUCT,
            EhisFileRow.day == file.day,
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
                "withdrawing ehis readings",
                satellite=decoded.satellite,
                day=file.day.isoformat(),
                readings=len(stale),
            )
        return stale
