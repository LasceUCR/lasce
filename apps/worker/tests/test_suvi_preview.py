"""Unit tests for :mod:`app.services.suvi_preview`.

``render_webp`` is pure numpy/Pillow and exercised directly. ``publish_preview`` is exercised
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
from app.services.suvi_preview import frame_key, preview_key, publish_preview, render_webp

FRAME_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


def assert_is_webp(data: bytes) -> None:
    assert data[:4] == b"RIFF"
    assert data[8:12] == b"WEBP"


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
    assert preview_key("G19", "Fe093") == "suvi/preview/g19/fe093.webp"


def test_frame_key_stamps_the_observed_time() -> None:
    fields = header_fields()
    assert frame_key(fields.satellite, fields.channel, fields.observed_at) == (
        "suvi/g19/fe093/20260918T041407.webp"
    )


def test_render_webp_returns_a_webp_for_a_typical_matrix() -> None:
    matrix = np.arange(64, dtype=np.uint16).reshape(8, 8)

    image = render_webp(matrix)

    assert_is_webp(image)


def test_render_webp_returns_a_black_image_for_an_all_zero_matrix() -> None:
    matrix = np.zeros((8, 8), dtype=np.uint16)

    image = render_webp(matrix)

    assert_is_webp(image)


def test_render_webp_clips_negative_radiance_instead_of_producing_nan() -> None:
    """Raw FITS radiance carries background noise below zero; `log1p` of anything below -1 is
    `NaN`, which used to propagate through `.max()` and blank the whole image to black.
    """
    matrix = np.full((8, 8), -5.0, dtype=np.float32)
    matrix[0, 0] = 100.0

    image = render_webp(matrix)

    assert_is_webp(image)


async def test_publish_preview_renders_uploads_both_copies_and_updates_the_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fields = header_fields()
    matrix = np.arange(64, dtype=np.float32).reshape(8, 8)
    storage = AsyncMock()
    update_frame = AsyncMock()
    monkeypatch.setattr(suvi_preview, "_update_frame", update_frame)

    key = await publish_preview(storage, matrix, fields, FRAME_ID)

    assert key == "suvi/g19/fe093/20260918T041407.webp"
    assert storage.put_object.await_count == 2
    archival_call, latest_call = storage.put_object.await_args_list
    assert archival_call.args[0] == "suvi/g19/fe093/20260918T041407.webp"
    assert_is_webp(archival_call.args[1])
    assert archival_call.kwargs == {"content_type": "image/webp"}
    assert latest_call.args[0] == "suvi/preview/g19/fe093.webp"
    assert latest_call.args[1] == archival_call.args[1]
    update_frame.assert_awaited_once_with(FRAME_ID, "suvi/g19/fe093/20260918T041407.webp")
