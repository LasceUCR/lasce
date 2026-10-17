"""What every GOES NetCDF reader in the worker has to share.

``netCDF4`` wraps the HDF5 C library, which is not thread safe, and the
readers run on worker threads (``asyncio.to_thread``). One process-wide lock
serialises every ``Dataset`` open; a second lock in another module would let
two readers into HDF5 at once, which is why this lives here rather than in
either processor.
"""

import math
import threading
from datetime import UTC, datetime
from typing import Any

import numpy as np

NETCDF_LOCK = threading.Lock()
_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


def json_attribute(value: Any) -> Any:
    """One NetCDF global attribute, made safe for a ``jsonb`` column."""
    if isinstance(value, np.ndarray):
        return [json_attribute(item) for item in value.tolist()]
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if value is None or isinstance(value, str | bool | int | float):
        return value
    return str(value)


def plain_utc(stamp: datetime) -> datetime:
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


def epoch_nanoseconds(stamp: datetime) -> int:
    """``stamp`` as integer nanoseconds since the epoch, exactly as InfluxDB keys it."""
    delta = stamp - _EPOCH
    return (delta.days * 86_400 + delta.seconds) * 10**9 + delta.microseconds * 1_000


def bad_quality(dataset: Any, name: str) -> Any:
    """``True`` for every report whose quality flags say it is not good.

    GOES quality variables list ``good_quality_qf`` as their first
    ``flag_masks`` entry: any of its bits set means the report is degraded or
    invalid. Bits outside that mask (MAG's ``valid_arcjet_correction_qf``, for
    one) describe a report that is still good.
    """
    quality = dataset.variables[name]
    good_mask = int(np.asarray(quality.flag_masks).flat[0])
    flags = quality[:]
    # A missing flag is not a good flag: fill it with every bit set.
    filled = np.ma.filled(flags, np.iinfo(flags.dtype).max)
    return np.bitwise_and(filled, good_mask) != 0


def primary_irradiance(dataset: Any, variable: str, unit: str) -> Any:
    """XRS irradiance taken, report by report, from the detector flagged primary.

    Each XRS band (``xrsa``, ``xrsb``) has a solar-minimum and a solar-maximum
    detector; ``primary_<band>`` says which one to trust for each report (0 or
    1). Anything else is fill, and ``invalid_flags`` marks reports the
    instrument itself distrusts. Both are masked out.
    """
    primary = dataset.variables[f"primary_{variable}"][:]
    first = dataset.variables[f"irradiance_{variable}1"]
    second = dataset.variables[f"irradiance_{variable}2"]
    if first.units != unit or second.units != unit:
        raise ValueError("Unexpected irradiance units")
    values = np.ma.where(primary == 0, first[:], second[:])
    values = np.ma.masked_where(~np.isin(primary, [0, 1]), values)
    return np.ma.masked_where(dataset.variables["invalid_flags"][:] != 0, values)
