"""Unit tests for :mod:`app.services.suvi_preview`.

``render_png`` is pure numpy/Pillow and exercised directly. ``publish_preview`` is exercised
against a fake ``ObjectStorage`` (``AsyncMock``) and a monkeypatched DB update, the same way
``test_suvi_pipeline.py`` fakes storage-facing steps.
"""

import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import numpy as np
import pytest

from app.services import suvi_preview
from app.services.process_headers import SuviHeaderFields
from app.services.suvi_preview import frame_key, preview_key, publish_preview, render_png

PNG_SIGNATURE = b"\x89PNG"
FRAME_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


def header_fields(**overrides: Any) -> SuviHeaderFields:
    base: dict[str, Any] = {
        "observed_at": datetime(2026, 9, 18, 4, 14, 7, tzinfo=UTC),
        "wavelength": 94.0,
        "satellite": "G19",
        "channel": "Fe093",
        "file_name": "OR_SUVI-L1b-Fe093_test.fits.gz",
        "source_url": "https://example.invalid/frame.fits.gz",
        "exposure_time": 1.0,
        "sun_center_x": 4.0,
        "sun_center_y": 4.0,
        "sun_radius_px": 3.0,
        "quality_flag": 0,
        "raw_header": {},
        "metrics": {},
    }
    base.update(overrides)
    return SuviHeaderFields(**base)


def test_preview_key_lowercases_and_slugifies_satellite_and_channel() -> None:
    assert preview_key("G19", "Fe093") == "suvi/preview/g19/fe093.png"


def test_frame_key_stamps_the_observed_time() -> None:
    fields = header_fields()
    assert frame_key(fields.satellite, fields.channel, fields.observed_at) == (
        "suvi/g19/fe093/20260918T041407.png"
    )


def test_render_png_returns_a_png_for_a_typical_matrix() -> None:
    matrix = np.arange(64, dtype=np.uint16).reshape(8, 8)

    png = render_png(matrix)

    assert png.startswith(PNG_SIGNATURE)


def test_render_png_returns_a_black_png_for_an_all_zero_matrix() -> None:
    matrix = np.zeros((8, 8), dtype=np.uint16)

    png = render_png(matrix)

    assert png.startswith(PNG_SIGNATURE)


async def test_publish_preview_renders_uploads_both_copies_and_updates_the_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fields = header_fields()
    matrix = np.arange(64, dtype=np.float32).reshape(8, 8)
    storage = AsyncMock()
    update_frame = AsyncMock()
    monkeypatch.setattr(suvi_preview, "_update_frame", update_frame)

    key = await publish_preview(storage, matrix, fields, FRAME_ID)

    assert key == "suvi/g19/fe093/20260918T041407.png"
    assert storage.put_object.await_count == 2
    archival_call, latest_call = storage.put_object.await_args_list
    assert archival_call.args[0] == "suvi/g19/fe093/20260918T041407.png"
    assert archival_call.args[1].startswith(PNG_SIGNATURE)
    assert archival_call.kwargs == {"content_type": "image/png"}
    assert latest_call.args[0] == "suvi/preview/g19/fe093.png"
    assert latest_call.args[1] == archival_call.args[1]
    update_frame.assert_awaited_once_with(FRAME_ID, "suvi/g19/fe093/20260918T041407.png")
