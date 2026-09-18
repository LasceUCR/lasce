"""Unit tests for :mod:`app.services.suvi_matrix`.

The pure numpy helpers are exercised directly, with no I/O. ``process`` and ``decode`` are
exercised through a small dict-backed ``FakeStorage`` and the ``_FakeSession`` pattern from
``test_process_headers.py`` (``session_scope`` is monkeypatched at module level).
"""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np
import pytest

from app.clients.suvi import SuviChannel, SuviFile
from app.services import process_headers, suvi_matrix
from app.services.process_headers import ProcessHeaders
from app.services.suvi_matrix import (
    WEB,
    BlockHeader,
    BlockPointer,
    DeltaMode,
    IndexEntry,
    MatrixProfile,
    Quantization,
    SuviMatrixProcessor,
    apply_mask,
    block_key,
    keyframe_scale,
    noise_gate,
    quantize,
    reconstruct,
)

FRAME_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
SHAPE = (8, 8)

# A tighter block than SCIENTIFIC's, so a test can fill it in two frames.
TEST_PROFILE = MatrixProfile(
    quantization=Quantization.UINT16,
    epsilon=0.0,
    mask=False,
    keyframe_interval=2,
)


def matrix(fill: float = 5.0) -> np.ndarray:
    """An 8x8 float32 matrix, small enough to make failures easy to read."""
    values = np.full(SHAPE, fill, dtype=np.float32)
    values[0, 0] = fill * 2  # a peak, so scale is not just `fill`
    return values


def header_fields(**overrides: Any) -> process_headers.SuviHeaderFields:
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
    return process_headers.SuviHeaderFields(**base)


def suvi_file(**overrides: Any) -> SuviFile:
    start = datetime(2026, 9, 18, 4, 14, 7, tzinfo=UTC)
    defaults: dict[str, Any] = {
        "name": "OR_SUVI-L1b-Fe093_G19_test.fits.gz",
        "url": "https://example.invalid/frame.fits.gz",
        "channel": SuviChannel.FE093,
        "spacecraft": 19,
        "start": start,
        "end": start,
        "exposure": "long",
    }
    defaults.update(overrides)
    return SuviFile(**defaults)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def test_apply_mask_zeroes_pixels_outside_the_radius() -> None:
    values = np.full((6, 6), 10.0, dtype=np.float32)

    masked = apply_mask(values, center_x=2.5, center_y=2.5, radius_px=1.0, margin=1.0)

    assert masked[2, 2] == 10.0
    assert masked[0, 0] == 0.0
    assert masked[5, 5] == 0.0


def test_quantize_and_reconstruct_round_trip_within_tolerance_uint16() -> None:
    source = matrix()
    scale = keyframe_scale(source, Quantization.UINT16)

    quantized = quantize(source, Quantization.UINT16, scale)
    zero_delta = np.zeros(SHAPE, dtype=np.int32)
    reconstructed = reconstruct(quantized, zero_delta, Quantization.UINT16)

    assert reconstructed.dtype == np.uint16
    assert np.array_equal(reconstructed, quantized)


def test_quantize_and_reconstruct_round_trip_within_tolerance_uint8() -> None:
    source = matrix()
    scale = keyframe_scale(source, Quantization.UINT8)

    quantized = quantize(source, Quantization.UINT8, scale)
    zero_delta = np.zeros(SHAPE, dtype=np.int16)
    reconstructed = reconstruct(quantized, zero_delta, Quantization.UINT8)

    assert reconstructed.dtype == np.uint8
    assert np.array_equal(reconstructed, quantized)


def test_keyframe_scale_falls_back_to_one_when_the_matrix_has_no_positive_peak() -> None:
    flat = np.zeros(SHAPE, dtype=np.float32)

    assert keyframe_scale(flat, Quantization.UINT16) == 1.0
    assert keyframe_scale(flat, Quantization.UINT8) == 1.0


def test_noise_gate_zeroes_small_deltas_but_keeps_large_ones() -> None:
    delta = np.array([0, 1, -1, 100, -100], dtype=np.int32)

    gated = noise_gate(delta, epsilon=0.01, quantization=Quantization.UINT16)

    # threshold = 0.01 * 65535 ~= 655.35, so only the |delta| >= 656 survive.
    assert np.array_equal(gated, np.zeros(5, dtype=np.int32))


def test_noise_gate_is_a_no_op_when_epsilon_is_zero() -> None:
    delta = np.array([0, 1, -1], dtype=np.int32)

    gated = noise_gate(delta, epsilon=0.0, quantization=Quantization.UINT16)

    assert np.array_equal(gated, delta)


def test_block_key_lowercases_and_slugifies_satellite_and_channel() -> None:
    observed = datetime(2026, 9, 18, 4, 14, 7, tzinfo=UTC)

    key = block_key("G19", "Fe093", observed)

    assert key == "suvi/g19/fe093/20260918T041407.sublk"


def test_block_header_pack_unpack_round_trips() -> None:
    header = BlockHeader(
        version=1,
        channel=0,
        mode=DeltaMode.ABSOLUTE,
        quant=Quantization.UINT16,
        keyframe_interval=15,
        epsilon=0.0,
        scale=42.5,
        frame_count=3,
        height=8,
        width=8,
        spacecraft=19,
        mask=False,
    )

    restored = BlockHeader.unpack(header.pack())

    assert restored == header


def test_block_header_unpack_rejects_bad_magic() -> None:
    header = BlockHeader(
        version=1,
        channel=0,
        mode=DeltaMode.ABSOLUTE,
        quant=Quantization.UINT16,
        keyframe_interval=15,
        epsilon=0.0,
        scale=1.0,
        frame_count=1,
        height=8,
        width=8,
        spacecraft=19,
        mask=False,
    )
    corrupted = b"XXXXXX" + header.pack()[6:]

    with pytest.raises(ValueError, match="magic"):
        BlockHeader.unpack(corrupted)


def test_index_entry_pack_unpack_round_trips() -> None:
    entry = IndexEntry(timestamp_ms=1_758_000_000_000, offset=64, size=128, flags=1)

    restored = IndexEntry.unpack(entry.pack())

    assert restored == entry
    assert restored.is_keyframe is True


# ---------------------------------------------------------------------------
# process() / decode(), through a fake storage and a fake session
# ---------------------------------------------------------------------------


class FakeStorage:
    """A dict-backed stand-in for ``ObjectStorage``: just enough for get/put."""

    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    async def get_object(self, key: str) -> bytes:
        if key not in self.objects:
            raise KeyError(key)
        return self.objects[key]

    async def put_object(
        self, key: str, data: bytes, content_type: str = "application/octet-stream"
    ) -> None:
        self.objects[key] = data


class _FakeResult:
    def __init__(self, value: Any) -> None:
        self._value = value

    def scalar_one_or_none(self) -> Any:
        return self._value


class _FakeSession:
    """Just enough of ``AsyncSession`` for ``SuviMatrixProcessor``: one ``execute`` call that
    answers either the "latest block" query or an update, tracked separately so a test can assert
    on either.
    """

    def __init__(self, latest_block_file: str | None) -> None:
        self._latest_block_file = latest_block_file
        self.updates: list[Any] = []

    async def execute(self, stmt: Any) -> _FakeResult:
        if str(stmt).lower().startswith("select"):
            return _FakeResult(self._latest_block_file)
        self.updates.append(stmt)
        return _FakeResult(None)


def patch_session(monkeypatch: pytest.MonkeyPatch, latest_block_file: str | None) -> _FakeSession:
    session = _FakeSession(latest_block_file)

    @asynccontextmanager
    async def fake_session_scope() -> AsyncIterator[_FakeSession]:
        yield session

    monkeypatch.setattr(suvi_matrix, "session_scope", fake_session_scope)
    return session


async def test_first_frame_for_a_channel_is_a_keyframe_in_a_new_block(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_session(monkeypatch, latest_block_file=None)
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]

    pointer = await processor.process(matrix(), header_fields(), FRAME_ID, spacecraft=19)

    assert pointer.is_keyframe is True
    assert pointer.block_file in storage.objects
    assert pointer.block_offset == suvi_matrix.INDEX_OFFSET + TEST_PROFILE.keyframe_interval * (
        suvi_matrix.INDEX_ENTRY_SIZE
    )

    header, entries = suvi_matrix.parse_block(storage.objects[pointer.block_file])
    assert header.frame_count == 1
    assert entries[0].is_keyframe is True


async def test_second_frame_appends_a_delta_at_a_stable_offset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]

    patch_session(monkeypatch, latest_block_file=None)
    first = await processor.process(matrix(5.0), header_fields(), FRAME_ID, spacecraft=19)

    patch_session(monkeypatch, latest_block_file=first.block_file)
    second_fields = header_fields(observed_at=header_fields().observed_at + timedelta(seconds=4))
    second = await processor.process(matrix(6.0), second_fields, FRAME_ID, spacecraft=19)

    assert second.block_file == first.block_file
    assert second.is_keyframe is False
    # The payload starts right after the fixed index, unmoved between writes.
    payload_start = suvi_matrix.INDEX_OFFSET + TEST_PROFILE.keyframe_interval * (
        suvi_matrix.INDEX_ENTRY_SIZE
    )
    assert first.block_offset == payload_start
    assert second.block_offset == payload_start + first.block_size
    assert second.block_offset > first.block_offset

    header, entries = suvi_matrix.parse_block(storage.objects[second.block_file])
    assert header.frame_count == 2
    assert len(entries) == 2
    assert entries[0].is_keyframe is True
    assert entries[1].is_keyframe is False


async def test_a_full_block_starts_a_new_one(monkeypatch: pytest.MonkeyPatch) -> None:
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]
    base_time = header_fields().observed_at

    patch_session(monkeypatch, latest_block_file=None)
    first = await processor.process(
        matrix(5.0), header_fields(observed_at=base_time), FRAME_ID, spacecraft=19
    )

    patch_session(monkeypatch, latest_block_file=first.block_file)
    second = await processor.process(
        matrix(6.0),
        header_fields(observed_at=base_time + timedelta(seconds=4)),
        FRAME_ID,
        spacecraft=19,
    )
    assert second.block_file == first.block_file  # block now has 2/2 frames: full

    patch_session(monkeypatch, latest_block_file=second.block_file)
    third = await processor.process(
        matrix(7.0),
        header_fields(observed_at=base_time + timedelta(seconds=8)),
        FRAME_ID,
        spacecraft=19,
    )

    assert third.block_file != second.block_file
    assert third.is_keyframe is True


async def test_an_out_of_order_frame_starts_a_new_block(monkeypatch: pytest.MonkeyPatch) -> None:
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]
    base_time = header_fields().observed_at

    patch_session(monkeypatch, latest_block_file=None)
    first = await processor.process(
        matrix(5.0), header_fields(observed_at=base_time), FRAME_ID, spacecraft=19
    )

    patch_session(monkeypatch, latest_block_file=first.block_file)
    earlier = await processor.process(
        matrix(6.0),
        header_fields(observed_at=base_time - timedelta(seconds=4)),
        FRAME_ID,
        spacecraft=19,
    )

    assert earlier.block_file != first.block_file
    assert earlier.is_keyframe is True


async def test_a_previous_block_that_cannot_be_fetched_starts_a_new_one(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_session(monkeypatch, latest_block_file="suvi/g19/fe093/missing.sublk")
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]

    pointer = await processor.process(matrix(), header_fields(), FRAME_ID, spacecraft=19)

    assert pointer.is_keyframe is True


async def test_decode_of_a_delta_frame_reproduces_the_quantised_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]
    base_time = header_fields().observed_at
    second_time = base_time + timedelta(seconds=4)

    patch_session(monkeypatch, latest_block_file=None)
    first = await processor.process(
        matrix(5.0), header_fields(observed_at=base_time), FRAME_ID, spacecraft=19
    )

    patch_session(monkeypatch, latest_block_file=first.block_file)
    second_matrix = matrix(6.0)
    await processor.process(
        second_matrix, header_fields(observed_at=second_time), FRAME_ID, spacecraft=19
    )

    decoded = await processor.decode(first.block_file, second_time)

    header, _entries = suvi_matrix.parse_block(storage.objects[first.block_file])
    expected = quantize(second_matrix, header.quant, header.scale)
    assert np.array_equal(decoded, expected)


async def test_decode_raises_key_error_for_an_unknown_timestamp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    patch_session(monkeypatch, latest_block_file=None)
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=TEST_PROFILE, storage=storage)  # type: ignore[arg-type]
    fields = header_fields()

    pointer = await processor.process(matrix(), fields, FRAME_ID, spacecraft=19)

    with pytest.raises(KeyError):
        await processor.decode(pointer.block_file, fields.observed_at + timedelta(hours=1))


async def test_web_profile_masks_and_persists_a_keyframe(monkeypatch: pytest.MonkeyPatch) -> None:
    """A quick end-to-end sanity check for the ``WEB`` profile: UINT8, masked."""
    patch_session(monkeypatch, latest_block_file=None)
    storage = FakeStorage()
    processor = SuviMatrixProcessor(profile=WEB, storage=storage)  # type: ignore[arg-type]

    pointer = await processor.process(matrix(), header_fields(), FRAME_ID, spacecraft=19)

    header, _entries = suvi_matrix.parse_block(storage.objects[pointer.block_file])
    assert header.quant == Quantization.UINT8
    assert header.mask is True


def test_persist_frame_pointer_updates_the_row(monkeypatch: pytest.MonkeyPatch) -> None:
    """``BlockPointer`` is a plain value the caller can inspect without touching storage."""
    pointer = BlockPointer(
        block_file="suvi/g19/fe093/x.sublk", block_offset=64, block_size=10, is_keyframe=True
    )

    assert pointer.block_file.endswith(".sublk")
    assert pointer.block_offset == 64


def test_process_headers_still_imports_cleanly() -> None:
    """Sanity check that nothing in this module's imports created a cycle with process_headers."""
    assert ProcessHeaders is not None
