"""Unit tests for :mod:`app.services.process_headers`.

``ProcessHeaders.parse`` is exercised as a pure function against a realistic
header dict — no mocks needed, no database. Only ``persist`` needs fakes, and
those fakes are the smallest thing that satisfies the two calls it makes:
``session.execute`` (Postgres) and ``influx.write`` (InfluxDB).
"""

import json
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest
from astropy.io import fits

from app.clients.suvi import SuviChannel, SuviFile
from app.services import process_headers
from app.services.process_headers import ProcessHeaders

FRAME_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


def header(**overrides: Any) -> dict[str, Any]:
    """A realistic GOES-19 Fe093 header, as ``ProcessHeaders`` sees it."""
    base: dict[str, Any] = {
        "DATE-OBS": "2026-09-18T04:14:07.332",
        "WAVELNTH": 94.0,
        "TELESCOP": "G19",
        "EXPTIME": 0.999728,
        "CRPIX1": 666.8828548,
        "CRPIX2": 657.5104303,
        "RSUN": 381.9732042,
        "CONT_FLG": 0,
        "ECLIPSE": 0,
        "IMG_MEAN": 0.038145,
        "IMG_MAX": 19.6935215,
        "IMG_MIN": -9.6789522,
        "IMG_SDEV": 0.1334417,
        "DER_SNR": 0.274973,
        "SAT_PIX": 0,
        "FIX_PIX": 0,
        "CCD_TMP1": -55.1504,
        "CCD_BIAS": 46.0801,
    }
    base.update(overrides)
    return base


def suvi_file(**overrides: Any) -> SuviFile:
    start = datetime(2026, 9, 18, 4, 14, 7, tzinfo=UTC)
    defaults: dict[str, Any] = {
        "name": "OR_SUVI-L1b-Fe093_G19_s20262610414073_e20262610414083_c20262610414250.fits.gz",
        "url": (
            "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/"
            "goes19/l1b/suvi-l1b-fe094/2026/09/18/"
            "OR_SUVI-L1b-Fe093_G19_s20262610414073_e20262610414083_c20262610414250.fits.gz"
        ),
        "channel": SuviChannel.FE093,
        "spacecraft": 19,
        "start": start,
        "end": start,
        "exposure": "long",
    }
    defaults.update(overrides)
    return SuviFile(**defaults)


def test_observed_at_gets_utc_attached_when_the_header_is_naive() -> None:
    fields = ProcessHeaders.parse(header(), suvi_file())

    assert fields.observed_at == datetime(2026, 9, 18, 4, 14, 7, 332000, tzinfo=UTC)
    assert fields.observed_at.tzinfo is UTC


@pytest.mark.parametrize(
    ("cont_flg", "eclipse", "expected"),
    [(0, 0, 0), (1, 0, 1), (0, 1, 2), (1, 1, 3)],
)
def test_quality_flag_packs_cont_flg_and_eclipse_into_a_bitfield(
    cont_flg: int, eclipse: int, expected: int
) -> None:
    fields = ProcessHeaders.parse(header(CONT_FLG=cont_flg, ECLIPSE=eclipse), suvi_file())

    assert fields.quality_flag == expected


def test_a_missing_optional_card_yields_none_not_zero() -> None:
    without_sat_pix = header()
    del without_sat_pix["SAT_PIX"]

    fields = ProcessHeaders.parse(without_sat_pix, suvi_file())

    assert "sat_pix" not in fields.metrics
    assert fields.exposure_time == pytest.approx(0.999728)


def test_nan_in_the_header_does_not_reach_raw_header_or_metrics() -> None:
    fields = ProcessHeaders.parse(header(IMG_MEAN=float("nan")), suvi_file())

    assert fields.raw_header["IMG_MEAN"] is None
    assert "img_mean" not in fields.metrics


def test_a_real_header_with_repeated_cards_stays_json_serialisable() -> None:
    """The regression that broke job 24 in production.

    The processor used to hand over ``dict(header)``, which collapses the
    repeated COMMENT/HISTORY keywords into one ``_HeaderCommentaryCards``
    object — not JSON serialisable, so the whole job failed at the ``jsonb``
    write. This exercises a real ``astropy`` Header rather than a plain dict,
    which is the only way to catch it: a dict fixture cannot reproduce it.
    """
    real = fits.Header()
    for keyword, value in header().items():
        real[keyword] = value
    real["COMMENT"] = "first comment"
    real["COMMENT"] = "second comment"
    real["HISTORY"] = "some history"
    real[""] = "blank card"
    real["NOVALUE"] = None

    fields = ProcessHeaders.parse(real, suvi_file())

    # allow_nan=False is what a jsonb column will and will not accept.
    json.dumps(fields.raw_header, allow_nan=False)

    # Both lines survive; the old dict() path could not represent them at all.
    assert fields.raw_header["COMMENT"] == ["first comment", "second comment"]
    assert fields.raw_header["HISTORY"] == ["some history"]
    assert fields.raw_header["BLANK"] == ["blank card"]
    # A card written with no value at all, not a card holding the string "None".
    assert fields.raw_header["NOVALUE"] is None


def test_a_header_missing_date_obs_raises() -> None:
    missing = header()
    del missing["DATE-OBS"]

    with pytest.raises(ValueError, match="DATE-OBS"):
        ProcessHeaders.parse(missing, suvi_file())


class _FakeResult:
    def __init__(self, value: uuid.UUID) -> None:
        self._value = value

    def scalar_one(self) -> uuid.UUID:
        return self._value


class _FakeSession:
    """Just enough of ``AsyncSession`` for ``persist``: one ``execute`` call
    that returns something ``scalar_one()`` can be called on.
    """

    def __init__(self, value: uuid.UUID) -> None:
        self._value = value
        self.executed: list[Any] = []

    async def execute(self, stmt: Any) -> _FakeResult:
        self.executed.append(stmt)
        return _FakeResult(self._value)


async def test_persist_upserts_the_row_and_writes_one_influx_point(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = _FakeSession(FRAME_ID)

    @asynccontextmanager
    async def fake_session_scope() -> AsyncIterator[_FakeSession]:
        yield session

    monkeypatch.setattr(process_headers, "session_scope", fake_session_scope)

    influx = AsyncMock()
    fields = ProcessHeaders.parse(header(), suvi_file())

    frame_id = await ProcessHeaders(influx=influx).persist(fields)

    assert frame_id == FRAME_ID
    assert len(session.executed) == 1

    influx.write.assert_awaited_once()
    (points,), _kwargs = influx.write.await_args
    assert len(points) == 1
    point = points[0]

    # Asserted through the line protocol rather than the Point's private
    # attributes: it is the SDK's public output, and the string is what
    # actually reaches InfluxDB.
    line = point.to_line_protocol()
    tags, fields_text = line.split(" ")[0], line.split(" ")[1]
    assert tags.startswith(f"{process_headers.MEASUREMENT},")
    assert f"satellite={fields.satellite}" in tags
    assert f"channel={fields.channel}" in tags
    written = {pair.split("=")[0] for pair in fields_text.split(",")}
    assert written == set(fields.metrics)
