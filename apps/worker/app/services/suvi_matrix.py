"""Compresses one decoded SUVI pixel matrix into a self-describing `.sublk` block.

Follows the design in https://savaldev.com/blog/suvi: mask -> quantise -> delta -> noise gate ->
zstd. A block groups at most ``keyframe_interval`` frames behind one keyframe. MinIO objects
cannot be appended to, so growing a block means a read-modify-write of the whole object — bounded
by ``keyframe_interval`` chunks, so the object never grows large enough for that to matter.

The block's index is a **fixed-size** table of ``keyframe_interval`` slots (unused slots stay
zeroed), so the payload's start offset never moves as frames are appended. ``block_offset``,
written back to ``solar.suvi_frames``, is therefore an absolute byte offset inside the object —
exactly what a reader needs to fetch one chunk without downloading the rest.

Binary layout (little-endian):

- Header, 64 bytes, ``struct.Struct("<6sBBBBHffIHHBB34x")``: magic (``b"SUBLK\\0"``), version,
  channel (index into ``list(SuviChannel)``), delta mode, quantisation, ``keyframe_interval``
  (also the index slot count), epsilon, scale (fixed by the keyframe), frame_count (slots in
  use), height, width, spacecraft, mask flag, then 34 bytes of padding.
- Index entries, 24 bytes each, ``struct.Struct("<qQIi")``: unix-millisecond timestamp, absolute
  byte offset, compressed size, flags (bit 0 = keyframe). ``INDEX_OFFSET = 64``,
  payload starts at ``64 + keyframe_interval * 24``.
- Payload: chunk 0 is the zstd-compressed keyframe (``uint16``/``uint8``); every later chunk is a
  zstd-compressed delta (``int32``/``int16``) against a reference frame.

Quantisation needs a scale because L1b pixels are float32 radiance, not integers. The keyframe
fixes ``scale`` (with 4x headroom for flares) and every frame appended to the block reuses it.
``UINT16`` (the ``SCIENTIFIC`` profile) is linear; ``UINT8`` (the ``WEB`` profile) is logarithmic,
which is why the same header field means different things depending on ``quant`` — see
:func:`keyframe_scale`. Deltas are gated: anything smaller than ``epsilon * qmax`` is written as
zero, which zstd then compresses away almost for free. Keyframes are never gated.

Concurrency caveat, deliberately not solved here: two concurrent jobs for the same
satellite/channel could race on the read-modify-write and corrupt or drop a chunk. The scheduler
only ever runs one job per channel at a time, so this is accepted for the PoC.
"""

import asyncio
import math
import re
import struct
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import IntEnum
from typing import Self

import numpy as np
import zstandard
from sqlalchemy import select, update

from app.clients.db import session_scope
from app.clients.storage import ObjectStorage, get_object_storage
from app.clients.suvi import SuviChannel
from app.db.models import SuviFrame
from app.logging import get_logger
from app.services.process_headers import SuviHeaderFields

log = get_logger(__name__)

MAGIC = b"SUBLK\0"
VERSION = 1

_HEADER_STRUCT = struct.Struct("<6sBBBBHffIHHBB34x")
_INDEX_ENTRY_STRUCT = struct.Struct("<qQIi")

HEADER_SIZE = _HEADER_STRUCT.size
INDEX_ENTRY_SIZE = _INDEX_ENTRY_STRUCT.size
INDEX_OFFSET = HEADER_SIZE

_KEYFRAME_FLAG = 1
_SLUG_PATTERN = re.compile(r"[^a-z0-9-]")


class Quantization(IntEnum):
    """How a float32 pixel becomes an integer sample."""

    UINT16 = 0
    UINT8 = 1


class DeltaMode(IntEnum):
    """How a non-keyframe chunk relates to the frames around it."""

    ABSOLUTE = 0
    CUMULATIVE = 1


_QMAX: dict[Quantization, float] = {
    Quantization.UINT16: 65535.0,
    Quantization.UINT8: 255.0,
}
_QUANT_DTYPE: dict[Quantization, type[np.generic]] = {
    Quantization.UINT16: np.uint16,
    Quantization.UINT8: np.uint8,
}
_DELTA_DTYPE: dict[Quantization, type[np.generic]] = {
    Quantization.UINT16: np.int32,
    Quantization.UINT8: np.int16,
}


@dataclass(frozen=True)
class MatrixProfile:
    """A named point in the mask/quantise/delta/gate trade-off space."""

    quantization: Quantization
    epsilon: float
    mask: bool
    keyframe_interval: int
    mode: DeltaMode = DeltaMode.ABSOLUTE
    mask_margin: float = 1.25
    zstd_level: int = 3


# Full precision, no masking, a keyframe every 15 frames: used by the pipeline.
SCIENTIFIC = MatrixProfile(
    quantization=Quantization.UINT16,
    epsilon=0.0,
    mask=False,
    keyframe_interval=15,
)
# Lossier and smaller, for a future public-facing viewer: not selected by anything yet.
WEB = MatrixProfile(
    quantization=Quantization.UINT8,
    epsilon=0.02,
    mask=True,
    keyframe_interval=30,
    mask_margin=1.25,
)


@dataclass(frozen=True)
class BlockHeader:
    """The 64-byte header of a `.sublk` block."""

    version: int
    channel: int
    mode: DeltaMode
    quant: Quantization
    keyframe_interval: int
    epsilon: float
    scale: float
    frame_count: int
    height: int
    width: int
    spacecraft: int
    mask: bool

    def pack(self) -> bytes:
        return _HEADER_STRUCT.pack(
            MAGIC,
            self.version,
            self.channel,
            int(self.mode),
            int(self.quant),
            self.keyframe_interval,
            self.epsilon,
            self.scale,
            self.frame_count,
            self.height,
            self.width,
            self.spacecraft,
            1 if self.mask else 0,
        )

    @classmethod
    def unpack(cls, data: bytes) -> Self:
        if len(data) < HEADER_SIZE:
            raise ValueError("`.sublk` block is shorter than its own header")
        (
            magic,
            version,
            channel,
            mode,
            quant,
            keyframe_interval,
            epsilon,
            scale,
            frame_count,
            height,
            width,
            spacecraft,
            mask,
        ) = _HEADER_STRUCT.unpack(data[:HEADER_SIZE])
        if magic != MAGIC:
            raise ValueError(f"Not a `.sublk` block: bad magic {magic!r}")
        if version != VERSION:
            raise ValueError(f"Unsupported `.sublk` version: {version}")
        return cls(
            version=version,
            channel=channel,
            mode=DeltaMode(mode),
            quant=Quantization(quant),
            keyframe_interval=keyframe_interval,
            epsilon=epsilon,
            scale=scale,
            frame_count=frame_count,
            height=height,
            width=width,
            spacecraft=spacecraft,
            mask=bool(mask),
        )


@dataclass(frozen=True)
class IndexEntry:
    """One 24-byte slot in a block's fixed-size index."""

    timestamp_ms: int
    offset: int
    size: int
    flags: int

    @property
    def is_keyframe(self) -> bool:
        return bool(self.flags & _KEYFRAME_FLAG)

    def pack(self) -> bytes:
        return _INDEX_ENTRY_STRUCT.pack(self.timestamp_ms, self.offset, self.size, self.flags)

    @classmethod
    def unpack(cls, data: bytes) -> Self:
        timestamp_ms, offset, size, flags = _INDEX_ENTRY_STRUCT.unpack(data)
        return cls(timestamp_ms=timestamp_ms, offset=offset, size=size, flags=flags)


@dataclass(frozen=True)
class BlockPointer:
    """Where one frame's pixels live inside a `.sublk` object, written back to `suvi_frames`."""

    block_file: str
    block_offset: int
    block_size: int
    is_keyframe: bool


# ---------------------------------------------------------------------------
# Pure helpers: numpy only, no I/O, fully unit-testable on their own.
# ---------------------------------------------------------------------------


def apply_mask(
    matrix: np.ndarray, center_x: float, center_y: float, radius_px: float, margin: float
) -> np.ndarray:
    """Zero every pixel farther than ``margin * radius_px`` from ``(center_x, center_y)``."""
    height, width = matrix.shape
    rows, cols = np.mgrid[0:height, 0:width]
    distance = np.sqrt((cols - center_x) ** 2 + (rows - center_y) ** 2)
    masked = matrix.copy()
    masked[distance > radius_px * margin] = 0
    return masked


def keyframe_scale(matrix: np.ndarray, quantization: Quantization) -> float:
    """The scale a keyframe fixes for the whole block it starts.

    ``UINT16`` is linear: ``qmax / (max(matrix) * 4)``, with 4x headroom for flares. ``UINT8`` is
    logarithmic: the header field holds the log-domain maximum instead, likewise with 4x headroom.
    Either way, a matrix whose peak is at or below zero is treated as flat and gets scale ``1.0``.
    """
    if quantization is Quantization.UINT16:
        peak = float(np.max(matrix))
        if peak <= 0:
            return 1.0
        return _QMAX[quantization] / (peak * 4.0)

    log_values = np.log1p(np.clip(matrix, 0, None))
    peak = float(np.max(log_values))
    if peak <= 0:
        return 1.0
    return peak * 4.0


def quantize(matrix: np.ndarray, quantization: Quantization, scale: float) -> np.ndarray:
    """Float32 pixels -> an unsigned integer matrix, clipped to ``[0, qmax]``."""
    qmax = _QMAX[quantization]
    dtype = _QUANT_DTYPE[quantization]
    if quantization is Quantization.UINT16:
        values = np.clip(matrix, 0, None) * scale
    else:
        log_values = np.log1p(np.clip(matrix, 0, None))
        values = log_values / scale * qmax
    values = np.clip(values, 0, qmax)
    return np.floor(values).astype(dtype)


def encode_delta(
    current_q: np.ndarray, reference_q: np.ndarray, quantization: Quantization
) -> np.ndarray:
    """The signed difference between two quantised matrices."""
    dtype = _DELTA_DTYPE[quantization]
    return (current_q.astype(dtype) - reference_q.astype(dtype)).astype(dtype)


def noise_gate(delta: np.ndarray, epsilon: float, quantization: Quantization) -> np.ndarray:
    """Zero every delta sample smaller in magnitude than ``epsilon * qmax``."""
    if epsilon <= 0:
        return delta
    threshold = epsilon * _QMAX[quantization]
    gated = delta.copy()
    gated[np.abs(gated) < threshold] = 0
    return gated


def reconstruct(
    reference_q: np.ndarray, delta: np.ndarray, quantization: Quantization
) -> np.ndarray:
    """The blog's ``reconstruir``: a quantised reference plus a delta, clipped back to range."""
    qmax = _QMAX[quantization]
    dtype = _QUANT_DTYPE[quantization]
    values = reference_q.astype(np.int32) + delta.astype(np.int32)
    values = np.clip(values, 0, qmax)
    return values.astype(dtype)


def _slug(value: str) -> str:
    return _SLUG_PATTERN.sub("-", value.lower())


def block_key(satellite: str, channel: str, observed_at: datetime) -> str:
    """The MinIO object key for the block a keyframe observed at ``observed_at`` starts."""
    stamp = observed_at.astimezone(UTC).strftime("%Y%m%dT%H%M%S")
    return f"suvi/{_slug(satellite)}/{_slug(channel)}/{stamp}.sublk"


def _pack_index(entries: list[IndexEntry], slots: int) -> bytes:
    packed = bytearray(slots * INDEX_ENTRY_SIZE)
    for position, entry in enumerate(entries):
        start = position * INDEX_ENTRY_SIZE
        packed[start : start + INDEX_ENTRY_SIZE] = entry.pack()
    return bytes(packed)


def _assemble(header: BlockHeader, entries: list[IndexEntry], payload: bytes) -> bytes:
    return header.pack() + _pack_index(entries, header.keyframe_interval) + payload


def parse_block(data: bytes) -> tuple[BlockHeader, list[IndexEntry]]:
    """The header and in-use index entries of a `.sublk` object. Raises ``ValueError`` if
    ``data`` is not a `.sublk` block (bad magic or unsupported version) or is truncated.
    """
    header = BlockHeader.unpack(data)
    entries = []
    offset = INDEX_OFFSET
    for _ in range(header.frame_count):
        end = offset + INDEX_ENTRY_SIZE
        if end > len(data):
            raise ValueError("`.sublk` index is shorter than `frame_count` promises")
        entries.append(IndexEntry.unpack(data[offset:end]))
        offset = end
    return header, entries


def _read_chunk(
    data: bytes, entry: IndexEntry, dtype: type[np.generic], shape: tuple[int, int]
) -> np.ndarray:
    compressed = data[entry.offset : entry.offset + entry.size]
    raw = zstandard.ZstdDecompressor().decompress(compressed)
    return np.frombuffer(raw, dtype=dtype).reshape(shape)


def _timestamp_ms(observed_at: datetime) -> int:
    return int(observed_at.astimezone(UTC).timestamp() * 1000)


def _reconstruct_at(
    data: bytes, header: BlockHeader, entries: list[IndexEntry], index: int
) -> np.ndarray:
    """The quantised matrix at slot ``index`` (0 = keyframe) of an already-parsed block."""
    shape = (header.height, header.width)
    quant_dtype = _QUANT_DTYPE[header.quant]
    delta_dtype = _DELTA_DTYPE[header.quant]
    keyframe_q = _read_chunk(data, entries[0], quant_dtype, shape)
    if index == 0:
        return keyframe_q

    if header.mode is DeltaMode.ABSOLUTE:
        delta = _read_chunk(data, entries[index], delta_dtype, shape)
        return reconstruct(keyframe_q, delta, header.quant)

    current = keyframe_q
    for slot in range(1, index + 1):
        delta = _read_chunk(data, entries[slot], delta_dtype, shape)
        current = reconstruct(current, delta, header.quant)
    return current


def _can_append(
    header: BlockHeader,
    entries: list[IndexEntry],
    profile: MatrixProfile,
    height: int,
    width: int,
    timestamp_ms: int,
) -> bool:
    """Whether a new frame belongs in the existing block rather than starting a fresh one."""
    if header.frame_count >= header.keyframe_interval:
        return False
    if header.quant is not profile.quantization or header.mode is not profile.mode:
        return False
    # `epsilon` round-trips through a float32 header field, so compare with a tolerance.
    if not math.isclose(header.epsilon, profile.epsilon, rel_tol=1e-6, abs_tol=1e-9):
        return False
    if header.keyframe_interval != profile.keyframe_interval:
        return False
    if header.height != height or header.width != width:
        return False
    if not entries or timestamp_ms <= entries[-1].timestamp_ms:
        return False
    return True


_ExistingBlock = tuple[str, bytes, BlockHeader, list[IndexEntry]]


class SuviMatrixProcessor:
    """Compresses one decoded SUVI matrix into a `.sublk` chunk and writes it to MinIO.

    Dependencies are injected the way :class:`app.services.process_headers.ProcessHeaders` does:
    a default is resolved from the module's ``get_*`` factory, and ``session_scope`` is imported
    at module level so tests can monkeypatch it there.
    """

    def __init__(
        self, profile: MatrixProfile = SCIENTIFIC, storage: ObjectStorage | None = None
    ) -> None:
        self._profile = profile
        self._storage = storage or get_object_storage()

    async def process(
        self,
        matrix: np.ndarray,
        fields: SuviHeaderFields,
        frame_id: uuid.UUID,
        spacecraft: int,
    ) -> BlockPointer:
        """Add one decoded frame to the current block for its satellite/channel (starting a new
        one when needed), write the result to MinIO, and record the pointer on the frame's row.
        """
        previous_key = await self._latest_block_file(fields.satellite, fields.channel)
        existing = await self._load_block(previous_key) if previous_key is not None else None

        def _encode() -> tuple[BlockPointer, bytes]:
            return self._encode_sync(matrix, fields, spacecraft, existing)

        pointer, data = await asyncio.to_thread(_encode)
        await self._storage.put_object(
            pointer.block_file, data, content_type="application/octet-stream"
        )
        await self._update_frame(frame_id, pointer)
        log.info(
            "wrote suvi pixel block",
            frame_id=str(frame_id),
            block_file=pointer.block_file,
            block_offset=pointer.block_offset,
            block_size=pointer.block_size,
            is_keyframe=pointer.is_keyframe,
        )
        return pointer

    async def decode(self, block_file: str, observed_at: datetime) -> np.ndarray:
        """Reconstruct the quantised matrix stored for ``observed_at`` in ``block_file``.

        Not used by the pipeline yet. Returns the still-quantised matrix (``uint16``/``uint8``);
        turning it back into physical units is left to the caller. Raises ``KeyError`` if
        ``observed_at`` is not one of the block's index entries.
        """
        data = await self._storage.get_object(block_file)

        def _decode() -> np.ndarray:
            header, entries = parse_block(data)
            timestamp_ms = _timestamp_ms(observed_at)
            for index, entry in enumerate(entries):
                if entry.timestamp_ms == timestamp_ms:
                    return _reconstruct_at(data, header, entries, index)
            raise KeyError(f"No frame at {observed_at.isoformat()!r} in block {block_file!r}")

        return await asyncio.to_thread(_decode)

    async def _latest_block_file(self, satellite: str, channel: str) -> str | None:
        stmt = (
            select(SuviFrame.block_file)
            .where(
                SuviFrame.satellite == satellite,
                SuviFrame.channel == channel,
                SuviFrame.block_file.is_not(None),
            )
            .order_by(SuviFrame.observed_at.desc())
            .limit(1)
        )
        async with session_scope() as session:
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def _load_block(self, key: str) -> _ExistingBlock | None:
        try:
            data = await self._storage.get_object(key)
        except Exception:
            log.warning("could not fetch the previous suvi block, starting a new one", key=key)
            return None
        try:
            header, entries = parse_block(data)
        except ValueError:
            log.warning("previous suvi block is not valid, starting a new one", key=key)
            return None
        return key, data, header, entries

    async def _update_frame(self, frame_id: uuid.UUID, pointer: BlockPointer) -> None:
        stmt = (
            update(SuviFrame)
            .where(SuviFrame.id == frame_id)
            .values(
                block_file=pointer.block_file,
                block_offset=pointer.block_offset,
                block_size=pointer.block_size,
                is_keyframe=pointer.is_keyframe,
            )
        )
        async with session_scope() as session:
            await session.execute(stmt)

    def _encode_sync(
        self,
        matrix: np.ndarray,
        fields: SuviHeaderFields,
        spacecraft: int,
        existing: _ExistingBlock | None,
    ) -> tuple[BlockPointer, bytes]:
        """The CPU-bound half of :meth:`process`: mask, quantise, delta, gate and compress.

        Runs on a worker thread; must not touch the database or the network.
        """
        profile = self._profile
        height, width = matrix.shape
        channel_index = list(SuviChannel).index(SuviChannel(fields.channel))
        timestamp_ms = _timestamp_ms(fields.observed_at)

        if existing is not None:
            _, _, header, entries = existing
            if not _can_append(header, entries, profile, height, width, timestamp_ms):
                existing = None

        working = matrix
        center_x, center_y, radius_px = (
            fields.sun_center_x,
            fields.sun_center_y,
            fields.sun_radius_px,
        )
        if (
            profile.mask
            and center_x is not None
            and center_y is not None
            and radius_px is not None
        ):
            working = apply_mask(
                working,
                center_x,
                center_y,
                radius_px,
                profile.mask_margin,
            )
        elif profile.mask:
            log.warning(
                "suvi frame has no disc geometry, skipping the mask",
                satellite=fields.satellite,
                channel=fields.channel,
            )

        compressor = zstandard.ZstdCompressor(level=profile.zstd_level)

        if existing is None:
            return self._encode_keyframe(
                working, fields, spacecraft, channel_index, timestamp_ms, height, width, compressor
            )
        return self._encode_delta_frame(working, existing, profile, timestamp_ms, compressor)

    def _encode_keyframe(
        self,
        working: np.ndarray,
        fields: SuviHeaderFields,
        spacecraft: int,
        channel_index: int,
        timestamp_ms: int,
        height: int,
        width: int,
        compressor: zstandard.ZstdCompressor,
    ) -> tuple[BlockPointer, bytes]:
        profile = self._profile
        key = block_key(fields.satellite, fields.channel, fields.observed_at)
        scale = keyframe_scale(working, profile.quantization)
        quantized = quantize(working, profile.quantization, scale)
        chunk = compressor.compress(quantized.tobytes())

        header = BlockHeader(
            version=VERSION,
            channel=channel_index,
            mode=profile.mode,
            quant=profile.quantization,
            keyframe_interval=profile.keyframe_interval,
            epsilon=profile.epsilon,
            scale=scale,
            frame_count=1,
            height=height,
            width=width,
            spacecraft=spacecraft,
            mask=profile.mask,
        )
        payload_offset = INDEX_OFFSET + profile.keyframe_interval * INDEX_ENTRY_SIZE
        entry = IndexEntry(
            timestamp_ms=timestamp_ms, offset=payload_offset, size=len(chunk), flags=_KEYFRAME_FLAG
        )
        data = _assemble(header, [entry], chunk)
        pointer = BlockPointer(
            block_file=key, block_offset=payload_offset, block_size=len(chunk), is_keyframe=True
        )
        return pointer, data

    def _encode_delta_frame(
        self,
        working: np.ndarray,
        existing: _ExistingBlock,
        profile: MatrixProfile,
        timestamp_ms: int,
        compressor: zstandard.ZstdCompressor,
    ) -> tuple[BlockPointer, bytes]:
        key, data, header, entries = existing
        shape = (header.height, header.width)
        quant_dtype = _QUANT_DTYPE[header.quant]

        quantized = quantize(working, header.quant, header.scale)
        keyframe_q = _read_chunk(data, entries[0], quant_dtype, shape)
        if header.mode is DeltaMode.ABSOLUTE:
            reference_q = keyframe_q
        else:
            reference_q = _reconstruct_at(data, header, entries, len(entries) - 1)

        delta = encode_delta(quantized, reference_q, header.quant)
        delta = noise_gate(delta, header.epsilon, header.quant)
        chunk = compressor.compress(delta.tobytes())

        payload_offset_base = INDEX_OFFSET + header.keyframe_interval * INDEX_ENTRY_SIZE
        last_entry = entries[-1]
        new_offset = last_entry.offset + last_entry.size
        existing_payload = data[payload_offset_base:new_offset]

        new_entry = IndexEntry(
            timestamp_ms=timestamp_ms, offset=new_offset, size=len(chunk), flags=0
        )
        new_entries = [*entries, new_entry]
        new_header = BlockHeader(
            version=header.version,
            channel=header.channel,
            mode=header.mode,
            quant=header.quant,
            keyframe_interval=header.keyframe_interval,
            epsilon=header.epsilon,
            scale=header.scale,
            frame_count=header.frame_count + 1,
            height=header.height,
            width=header.width,
            spacecraft=header.spacecraft,
            mask=header.mask,
        )
        new_data = _assemble(new_header, new_entries, existing_payload + chunk)
        pointer = BlockPointer(
            block_file=key, block_offset=new_offset, block_size=len(chunk), is_keyframe=False
        )
        return pointer, new_data
