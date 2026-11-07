"""Decoding a daily SEISS MPS-HI (MPSH) L2 one-minute file.

The synthetic files mirror the real ``mpsh-l2-avg1m`` product: a ``time``
dimension in seconds since 2000-01-01 12:00 UTC, five ``telescopes``, 10
electron and 11 proton differential channels with their
``*ValidL1bSamplesInAvg`` counts, and the lowercase ``platform`` attribute.
"""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pytest
from netCDF4 import Dataset

from app.services.seiss.mpsh import CHANNELS, decode

DAY = datetime(2026, 10, 27, tzinfo=UTC)
EPOCH = datetime(2000, 1, 1, 12, tzinfo=UTC)
TITLE = "L2 SEISS/MPS-HI - 1-minute Flux Averages"
ELECTRON_UNIT = "electrons/(cm^2 sr keV s)"
PROTON_UNIT = "protons/(cm^2 sr keV s)"
FILL = -1e31
COUNT_FILL = 4294967295
MINUTES = 4


def mpsh_netcdf(
    tmp_path: Path,
    platform: str = "g19",
    title: str = TITLE,
    electron_unit: str = ELECTRON_UNIT,
    telescopes: int = 5,
) -> bytes:
    """Four one-minute averages, each kept or dropped for one documented reason."""
    path = tmp_path / "mpsh.nc"
    with Dataset(path, "w") as dataset:
        dataset.platform = platform
        dataset.title = title
        dataset.createDimension("time", MINUTES)
        dataset.createDimension("telescopes", telescopes)
        dataset.createDimension("electron_diff_chans", 10)
        dataset.createDimension("proton_diff_chans", 11)
        time = dataset.createVariable("time", "f8", ("time",), fill_value=FILL)
        time.units = "seconds since 2000-01-01 12:00:00 UTC"
        time[:] = [(DAY - EPOCH).total_seconds() + minute * 60 for minute in range(MINUTES)]

        for species, unit, bands in (
            ("Electron", electron_unit, 10),
            ("Proton", PROTON_UNIT, 11),
        ):
            dimensions = ("time", "telescopes", f"{species.lower()}_diff_chans")
            # minute m, telescope t, band b -> m + t / 10 + b / 1000.
            flux = np.ma.masked_array(
                np.arange(MINUTES)[:, None, None]
                + np.arange(telescopes)[None, :, None] / 10
                + np.arange(bands)[None, None, :] / 1000,
                dtype="f4",
            )
            samples = np.ma.masked_array(np.full((MINUTES, telescopes, bands), 60), dtype="u4")
            if species == "Electron":
                flux[1, 0, 0] = np.ma.masked  # fill
                samples[2, 0, 0] = 0  # no valid 1-second sample
                flux[3, 0, 0] = -1.0  # a negative flux is not a reading
            variable = dataset.createVariable(
                f"AvgDiff{species}Flux", "f4", dimensions, fill_value=np.float32(FILL)
            )
            variable.units = unit
            variable[:] = flux
            counts = dataset.createVariable(
                f"Diff{species}ValidL1bSamplesInAvg",
                "u4",
                dimensions,
                fill_value=np.uint32(COUNT_FILL),
            )
            counts[:] = samples
    return path.read_bytes()


def at(*offsets: int) -> list[datetime]:
    return [DAY + timedelta(minutes=offset) for offset in offsets]


def test_keeps_counted_averages_per_species_telescope_and_band(tmp_path: Path) -> None:
    decoded = decode(mpsh_netcdf(tmp_path), 19)

    assert decoded.satellite == "G19"
    assert len(CHANNELS) == 105
    assert set(decoded.series) == {channel.code for channel in CHANNELS}
    assert decoded.series["electron:T1:E1"] == [(DAY, 0.0)]
    assert [stamp for stamp, _ in decoded.series["electron:T1:E2"]] == at(0, 1, 2, 3)
    assert [value for _, value in decoded.series["electron:T5:E10"]] == pytest.approx(
        [0.409, 1.409, 2.409, 3.409]
    )
    assert [value for _, value in decoded.series["proton:T3:E11"]] == pytest.approx(
        [0.21, 1.21, 2.21, 3.21]
    )
    assert decoded.last_observed_at == DAY + timedelta(minutes=3)


def test_a_file_from_another_spacecraft_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="GOES-19"):
        decode(mpsh_netcdf(tmp_path, platform="g18"), 19)


def test_a_file_of_another_product_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="MPS-HI"):
        decode(mpsh_netcdf(tmp_path, title="L2 SEISS/SGPS - 1-minute Flux Averages"), 19)


def test_unexpected_units_are_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="units"):
        decode(mpsh_netcdf(tmp_path, electron_unit=PROTON_UNIT), 19)


def test_a_file_with_another_telescope_layout_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="dimensions"):
        decode(mpsh_netcdf(tmp_path, telescopes=4), 19)
