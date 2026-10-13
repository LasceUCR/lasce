"""The XRS primary-detector rule both EXIS readers share, tested on its own.

``primary_irradiance`` was extracted from ``query_goes_archive``. That
processor's own tests still cover it end to end; these pin each rule at the
shared seam, so the two readers cannot drift apart.
"""

from pathlib import Path

import numpy as np
import pytest
from netCDF4 import Dataset

from app.clients.netcdf import NETCDF_LOCK, primary_irradiance
from app.processors import query_goes_archive
from app.services import exis_readings


def xrs(tmp_path: Path, primary: list[int], invalid: list[int], unit: str = "W m-2") -> Path:
    """Five XRS-B reports; detector 1 reads 1.0 and detector 2 reads 2.0."""
    path = tmp_path / "xrs.nc"
    with Dataset(path, "w") as dataset:
        dataset.createDimension("report", 5)
        for detector in (1, 2):
            data = dataset.createVariable(f"irradiance_xrsb{detector}", "f4", ("report",))
            data.units = unit
            data[:] = float(detector)
        dataset.createVariable("primary_xrsb", "u1", ("report",))[:] = primary
        dataset.createVariable("invalid_flags", "u1", ("report",))[:] = invalid
    return path


def test_each_report_comes_from_the_detector_flagged_primary(tmp_path: Path) -> None:
    with Dataset(xrs(tmp_path, [0, 1, 0, 1, 0], [0] * 5)) as dataset:
        values = primary_irradiance(dataset, "xrsb", "W m-2")

    assert values.tolist() == [1.0, 2.0, 1.0, 2.0, 1.0]


def test_reports_without_a_primary_or_flagged_invalid_are_masked(tmp_path: Path) -> None:
    with Dataset(xrs(tmp_path, [0, 2, 255, 1, 0], [0, 0, 0, 0, 1])) as dataset:
        values = primary_irradiance(dataset, "xrsb", "W m-2")

    assert np.ma.getmaskarray(values).tolist() == [False, True, True, False, True]
    assert values.compressed().tolist() == [1.0, 2.0]


def test_unexpected_units_are_rejected(tmp_path: Path) -> None:
    with (
        Dataset(xrs(tmp_path, [0] * 5, [0] * 5, unit="erg")) as dataset,
        pytest.raises(ValueError, match="Unexpected irradiance units"),
    ):
        primary_irradiance(dataset, "xrsb", "W m-2")


def test_every_reader_shares_one_lock() -> None:
    assert vars(query_goes_archive)["NETCDF_LOCK"] is NETCDF_LOCK
    assert vars(exis_readings)["NETCDF_LOCK"] is NETCDF_LOCK
