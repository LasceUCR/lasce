"""Splits one SUVI FITS header into its two natural homes.

A SUVI L1b frame carries roughly a hundred header cards. Most of them describe
where and when the exposure happened — that is the relational catalogue,
``solar.suvi_frames``, one row per frame, upserted so a re-listed window never
duplicates a row. A handful of the rest are numbers that only matter as a time
series — image statistics and CCD/sensor health — and those go to InfluxDB
instead, because charting "was CCD_TMP1 drifting last week" against a
relational table means either a wide table of nullable float columns or a
second, append-only one; InfluxDB already is that second table.

Three things about a FITS header will quietly produce wrong data if they are
not handled explicitly, which is why each has its own helper below:

- ``DATE-OBS`` has no UTC offset. ``datetime.fromisoformat`` parses it as a
  naive value, and a naive value written into a ``timestamptz`` column is
  interpreted in the server's zone, not UTC — silently shifting every frame.
- ``dict(header)`` is not a safe way to capture the whole header: several
  cards (``COMMENT``, ``HISTORY``, and the truly blank keyword) legitimately
  repeat, and a plain dict keeps only the last one it sees. Iterating
  ``header.cards`` keeps all of them.
- A FITS value is not a JSON value. numpy scalars, astropy's ``Undefined``
  sentinel, and IEEE ``NaN``/``Infinity`` all need converting or dropping
  before they reach a ``jsonb`` column, which rejects the last one outright.
"""

import math
import uuid
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert

from app.clients.db import session_scope
from app.clients.influx import InfluxClient, Point, get_influx_client
from app.clients.suvi import SuviFile
from app.db.models import SuviFrame
from app.logging import get_logger

log = get_logger(__name__)

MEASUREMENT = "suvi_frames"

# (dataclass/Postgres field name, FITS keyword, "float" or "int")
_METRIC_CARDS: tuple[tuple[str, str, str], ...] = (
    ("img_mean", "IMG_MEAN", "float"),
    ("img_max", "IMG_MAX", "float"),
    ("img_min", "IMG_MIN", "float"),
    ("img_sdev", "IMG_SDEV", "float"),
    ("der_snr", "DER_SNR", "float"),
    ("sat_pix", "SAT_PIX", "int"),
    ("fix_pix", "FIX_PIX", "int"),
    ("ccd_temp1", "CCD_TMP1", "float"),
    ("ccd_bias", "CCD_BIAS", "float"),
)

_FitsUndefined: type[Any] | None
try:
    # Only used to recognise the sentinel a valueless card ("KEYWORD =") parses
    # to. Guarded so a future astropy release that moves or renames this
    # private type does not stop the whole module from importing — it just
    # stops being recognised, and falls through to being stored as-is.
    from astropy.io.fits.card import Undefined as _Undefined

    _FitsUndefined = _Undefined
except ImportError:  # pragma: no cover - astropy always ships this today
    _FitsUndefined = None


@dataclass(frozen=True)
class SuviHeaderFields:
    """A FITS header, already normalised: what goes in Postgres, and what goes
    to InfluxDB. Keeping this as a plain, comparable value makes
    :meth:`ProcessHeaders.parse` testable without a database or an Influx client.
    """

    observed_at: datetime
    wavelength: float
    satellite: str
    channel: str
    file_name: str
    source_url: str
    exposure_time: float | None
    sun_center_x: float | None
    sun_center_y: float | None
    sun_radius_px: float | None
    quality_flag: int
    raw_header: dict[str, Any]
    # Only the metrics a card actually carried; a missing one is omitted
    # rather than written as a misleading zero.
    metrics: dict[str, float | int] = field(default_factory=dict)


def _require(header: Mapping[str, Any], keyword: str) -> Any:
    value = header.get(keyword)
    if value is None:
        raise ValueError(f"SUVI header is missing the required card {keyword!r}")
    return value


def _get_float(header: Mapping[str, Any], keyword: str) -> float | None:
    """The value of ``keyword`` as a float, or ``None`` if it is absent,
    unparseable, or NaN/Infinite. Never ``0.0`` for a missing card — a zero
    reading and an unknown one are different facts, and Influx should only
    ever see the former.
    """
    value = header.get(keyword)
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _get_int(header: Mapping[str, Any], keyword: str) -> int | None:
    """As :func:`_get_float`, but for an integer card such as ``SAT_PIX``."""
    value = header.get(keyword)
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _jsonable_value(value: Any) -> Any:
    """One FITS card value, made safe for a ``jsonb`` column.

    A header value can be a numpy scalar (``.item()`` gets the plain Python
    one), astropy's ``Undefined`` sentinel for a keyword with no value
    (mapped to ``None``), or a ``NaN``/``Infinity`` float, which Postgres's
    ``jsonb`` rejects outright rather than storing as ``null``.
    """
    if _FitsUndefined is not None and isinstance(value, _FitsUndefined):
        return None
    item = getattr(value, "item", None)
    if callable(item):
        value = item()
    if value is None or isinstance(value, str | bool | int):
        return value
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else value
    # Anything else a card can hold is not a JSON value. The one that turns up
    # in practice is astropy's ``_HeaderCommentaryCards``: the container
    # ``dict(header)`` produces when a keyword repeats, which `json` refuses
    # outright. It iterates its lines, so keep them all instead of collapsing
    # the card to a repr.
    if isinstance(value, Iterable):
        return [str(entry) for entry in value]
    return str(value)


def _jsonable(header: Mapping[str, Any]) -> dict[str, Any]:
    """The whole header, made safe to store as ``raw_header``.

    ``dict(header)`` is not enough: ``COMMENT``, ``HISTORY`` and the blank
    keyword all legitimately repeat across a header, and a plain dict keeps
    only the last one it saw. Iterating ``header.cards`` — astropy's list of
    individual entries — keeps every one, collapsed into a list per keyword
    instead of being silently overwritten.
    """
    cards = getattr(header, "cards", None)
    if cards is None:
        # Not a real astropy Header (a plain dict, e.g. from a test fixture) —
        # there is only one value per key already, just sanitise it.
        return {str(keyword): _jsonable_value(value) for keyword, value in header.items()}

    result: dict[str, Any] = {}
    comments: list[str] = []
    history: list[str] = []
    blanks: list[str] = []
    for card in cards:
        keyword = card.keyword
        value = card.value
        if keyword == "COMMENT":
            comments.append(str(value))
        elif keyword == "HISTORY":
            history.append(str(value))
        elif keyword == "":
            blanks.append(str(value))
        else:
            result[keyword] = _jsonable_value(value)
    if comments:
        result["COMMENT"] = comments
    if history:
        result["HISTORY"] = history
    if blanks:
        result["BLANK"] = blanks
    return result


def _parse_observed_at(header: Mapping[str, Any]) -> datetime:
    """FITS ``DATE-OBS`` is naive local-clock-shaped text, e.g.
    ``'2026-09-18T04:14:07.332'`` — there is no offset in it anywhere, but the
    instant it describes is always UTC. Attach it explicitly, or the
    ``timestamptz`` column stores it shifted by whatever zone the database
    server happens to run in.
    """
    raw = _require(header, "DATE-OBS")
    observed_at = datetime.fromisoformat(str(raw))
    if observed_at.tzinfo is None:
        observed_at = observed_at.replace(tzinfo=UTC)
    return observed_at


class ProcessHeaders:
    """Parses one SUVI FITS header and persists it: a catalogue row in
    Postgres, and its time-series numbers in InfluxDB.
    """

    def __init__(self, influx: InfluxClient | None = None) -> None:
        self._influx = influx or get_influx_client()

    @staticmethod
    def parse(header: Mapping[str, Any], file: SuviFile) -> SuviHeaderFields:
        """Pure: a FITS header plus the archive facts about its file ->
        normalised values. Raises ``ValueError`` if a card this needs to
        identify the frame at all (``DATE-OBS``, ``WAVELNTH``, ``TELESCOP``)
        is missing; every other card is optional.
        """
        observed_at = _parse_observed_at(header)
        wavelength = float(_require(header, "WAVELNTH"))
        satellite = str(_require(header, "TELESCOP"))

        cont_flg = _get_int(header, "CONT_FLG") or 0
        eclipse = _get_int(header, "ECLIPSE") or 0
        quality_flag = cont_flg | (eclipse << 1)

        metrics: dict[str, float | int] = {}
        for name, keyword, kind in _METRIC_CARDS:
            value = _get_float(header, keyword) if kind == "float" else _get_int(header, keyword)
            if value is not None:
                metrics[name] = value

        return SuviHeaderFields(
            observed_at=observed_at,
            wavelength=wavelength,
            satellite=satellite,
            channel=file.channel.value,
            file_name=file.name,
            source_url=file.url,
            exposure_time=_get_float(header, "EXPTIME"),
            sun_center_x=_get_float(header, "CRPIX1"),
            sun_center_y=_get_float(header, "CRPIX2"),
            sun_radius_px=_get_float(header, "RSUN"),
            quality_flag=quality_flag,
            raw_header=_jsonable(header),
            metrics=metrics,
        )

    async def persist(self, fields: SuviHeaderFields) -> uuid.UUID:
        """Upsert the Postgres row, then write the Influx points. Returns the
        row id either way, so the caller can log or expose it even when the
        frame was already known.
        """
        now = datetime.now(UTC)
        values: dict[str, Any] = {
            "observed_at": fields.observed_at,
            "wavelength": fields.wavelength,
            "satellite": fields.satellite,
            "channel": fields.channel,
            "file_name": fields.file_name,
            "source_url": fields.source_url,
            "exposure_time": fields.exposure_time,
            "sun_center_x": fields.sun_center_x,
            "sun_center_y": fields.sun_center_y,
            "sun_radius_px": fields.sun_radius_px,
            "quality_flag": fields.quality_flag,
            "raw_header": fields.raw_header,
        }
        stmt = (
            insert(SuviFrame)
            .values(**values, created_at=now, updated_at=now)
            .on_conflict_do_update(
                index_elements=[SuviFrame.satellite, SuviFrame.channel, SuviFrame.observed_at],
                # created_at is deliberately not in this set: a re-listed frame
                # updates in place, it was not created again.
                set_={**values, "updated_at": now},
            )
            .returning(SuviFrame.id)
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            frame_id: uuid.UUID = result.scalar_one()

        if fields.metrics:
            point = Point(MEASUREMENT)
            point = point.tag("satellite", fields.satellite)
            point = point.tag("channel", fields.channel)
            for name, value in fields.metrics.items():
                point = point.field(name, value)
            point = point.time(fields.observed_at)
            await self._influx.write([point])

        log.info(
            "persisted suvi frame",
            frame_id=str(frame_id),
            satellite=fields.satellite,
            channel=fields.channel,
            observed_at=fields.observed_at.isoformat(),
            metrics=len(fields.metrics),
        )
        return frame_id

    async def run(self, header: Mapping[str, Any], file: SuviFile) -> uuid.UUID:
        """``parse`` then ``persist``, for the common case where nothing needs
        to inspect the intermediate value.
        """
        fields = self.parse(header, file)
        return await self.persist(fields)
