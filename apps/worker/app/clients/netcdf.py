"""What every GOES NetCDF reader in the worker has to share.

``netCDF4`` wraps the HDF5 C library, which is not thread safe, and the
readers run on worker threads (``asyncio.to_thread``). One process-wide lock
serialises every ``Dataset`` open; a second lock in another module would let
two readers into HDF5 at once, which is why this lives here rather than in
either processor.
"""

import threading
from typing import Any

import numpy as np

NETCDF_LOCK = threading.Lock()


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
