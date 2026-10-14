"""Renders a decoded SUVI matrix as a WebP image and stores it — the illustration is the product.

Stakeholders confirmed these images are purely illustrative, so this is deliberately the simplest
possible rendering: `log1p` stretch normalised to the frame's own maximum, mapped through the
channel's SunPy SUVI colormap to an 8-bit RGB image, no resizing, no scientific-precision storage
behind it. WebP (lossy, ``WEBP_QUALITY``) is chosen over PNG purely for size — a lossless format
buys nothing here since the source is already an illustration, not the archived signal.

Each frame gets two copies of the same WebP image in MinIO:

- A per-frame archival copy at `frame_key`, so a specific frame's image stays browsable later.
  Its key is written back onto the frame's `suvi_frames` row (`preview_file`).
- The fixed, always-overwritten `preview_key` per satellite/channel, so the `/suvi` viewer can
  show the latest frame without knowing a timestamp.
"""

import asyncio
import io
import re
import uuid
from datetime import UTC, datetime

import numpy as np
from PIL import Image
from sqlalchemy import update

from app.clients.db import session_scope
from app.clients.storage import ObjectStorage
from app.db.models import SuviFrame
from app.logging import get_logger
from app.services.process_headers import SuviHeaderFields

log = get_logger(__name__)

_SLUG_PATTERN = re.compile(r"[^a-z0-9-]")

# Lossy WebP quality: illustrative-only images tolerate visible compression, and this is well
# above the range (below ~70) where blocking becomes noticeable near the solar disc's edge.
WEBP_QUALITY = 80


def _ramp(start: int, end: int) -> np.ndarray:
    """A 256-entry ramp from 0 at ``start`` to 255 at ``end``, floored to integers.

    Reproduces the channels of IDL colour table 3 (Red Temperature), which SunPy ships as a CSV;
    this closed form matches that file exactly for all 256 entries of each channel.
    """
    steps = np.clip((np.arange(256) - start) / (end - start), 0, 1)
    return np.floor(steps * 255).astype(np.float32)


# Ported from SunPy's `sunpy.visualization.colormaps.color_tables` (`create_aia_wave_dict`), which
# in turn follows aia_lct.pro by Karel Schrijver. Ported rather than imported: SunPy and matplotlib
# are heavy and this worker only needs six 256x3 tables.
_R0 = _ramp(0, 176)
_G0 = _ramp(120, 255)
_B0 = _ramp(190, 255)
_C0 = np.arange(256, dtype=np.float32)
_C1 = (np.sqrt(_C0) * np.sqrt(255.0)).astype(np.float32)
_C2 = (np.arange(256) ** 2 / 255.0).astype(np.float32)
_C3 = ((_C1 + _C2 / 2.0) * 255.0 / (_C1.max() + _C2.max() / 2.0)).astype(np.float32)


def _table(red: np.ndarray, green: np.ndarray, blue: np.ndarray) -> np.ndarray:
    return np.rint(np.stack([red, green, blue], axis=1)).clip(0, 255).astype(np.uint8)


# Keyed by `SuviChannel`. SunPy's `suvi_color_table` reuses the AIA tables, mapping SUVI 195 A to
# AIA 193 A and SUVI 284 A to AIA 335 A; the other four channels share their AIA wavelength.
_COLOR_TABLES: dict[str, np.ndarray] = {
    "Fe093": _table(_C2, _C3, _C0),  # AIA 94
    "Fe131": _table(_G0, _R0, _R0),  # AIA 131
    "Fe171": _table(_R0, _C0, _B0),  # AIA 171
    "Fe195": _table(_C1, _C0, _C2),  # AIA 193
    "Fe284": _table(_C2, _C0, _C1),  # AIA 335
    "He303": _table(_R0, _G0, _B0),  # AIA 304
}

_GRAYSCALE_TABLE = np.repeat(np.arange(256, dtype=np.uint8)[:, None], 3, axis=1)


def color_table(channel: str) -> np.ndarray:
    """The ``(256, 3)`` uint8 RGB lookup table for ``channel``.

    An unknown channel gets a grayscale ramp, so a new passband renders instead of failing.
    """
    return _COLOR_TABLES.get(channel, _GRAYSCALE_TABLE)


def slug(value: str) -> str:
    """Lowercase ``value`` and replace anything outside ``[a-z0-9-]`` with ``-``."""
    return _SLUG_PATTERN.sub("-", value.lower())


def preview_key(satellite: str, channel: str) -> str:
    """The MinIO object key for the always-latest preview image of one satellite/channel pair."""
    return f"suvi/preview/{slug(satellite)}/{slug(channel)}.webp"


def frame_key(satellite: str, channel: str, observed_at: datetime) -> str:
    """The MinIO object key for one frame's archival image."""
    stamp = observed_at.astimezone(UTC).strftime("%Y%m%dT%H%M%S")
    return f"suvi/{slug(satellite)}/{slug(channel)}/{stamp}.webp"


def render_webp(matrix: np.ndarray, channel: str) -> bytes:
    """A pixel matrix -> an 8-bit RGB WebP, log-stretched to its own maximum and coloured with
    the SunPy SUVI colormap of ``channel`` (grayscale for an unknown channel).

    Pure and CPU-bound (no I/O); the caller runs it in a worker thread. Negative pixels (raw FITS
    radiance carries background noise below zero) are clipped to zero first — `log1p` of anything
    below -1 is `NaN`, which would otherwise propagate through `.max()` and blank the whole image.
    A matrix whose peak is at or below zero renders as an all-black image rather than dividing by
    zero.
    """
    values = np.log1p(np.clip(matrix.astype(np.float64), 0, None))
    peak = float(values.max())
    if peak <= 0:
        pixels = np.zeros(matrix.shape, dtype=np.uint8)
    else:
        pixels = (values / peak * 255).astype(np.uint8)

    buffer = io.BytesIO()
    rgb = color_table(channel)[pixels]
    Image.fromarray(rgb, mode="RGB").save(buffer, format="WEBP", quality=WEBP_QUALITY)
    return buffer.getvalue()


async def _update_frame(frame_id: uuid.UUID, key: str) -> None:
    stmt = update(SuviFrame).where(SuviFrame.id == frame_id).values(preview_file=key)
    async with session_scope() as session:
        await session.execute(stmt)


async def publish_preview(
    storage: ObjectStorage,
    matrix: np.ndarray,
    fields: SuviHeaderFields,
    frame_id: uuid.UUID,
) -> str:
    """Render ``matrix``, store one archival copy and refresh the viewer's latest copy.

    Returns the archival frame key, which is also written back onto the frame's row.
    """
    image = await asyncio.to_thread(render_webp, matrix, fields.channel)
    archival_key = frame_key(fields.satellite, fields.channel, fields.observed_at)
    latest_key = preview_key(fields.satellite, fields.channel)
    await storage.put_object(archival_key, image, content_type="image/webp")
    await storage.put_object(latest_key, image, content_type="image/webp")
    await _update_frame(frame_id, archival_key)
    log.info(
        "published suvi preview",
        satellite=fields.satellite,
        channel=fields.channel,
        key=archival_key,
        bytes=len(image),
    )
    return archival_key
