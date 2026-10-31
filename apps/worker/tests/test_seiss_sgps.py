"""Decoding a daily SEISS SGPS L2 one-minute file.

The synthetic files mirror the real ``sgps-l2-avg1m`` product: a ``time``
dimension in seconds since 2000-01-01 12:00 UTC, ``sensor_units`` (-X, +X),
13 ``diff_channels``, the differential and integral proton averages with
their ``*ValidL1bSamplesInAvg`` counts, and the lowercase ``platform``
attribute the L2 files carry instead of ``platform_ID``.
"""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pytest
from netCDF4 import Dataset

from app.services.seiss.sgps import CHANNELS, decode

DAY = datetime(2026, 10, 27, tzinfo=UTC)
EPOCH = datetime(2000, 1, 1, 12, tzinfo=UTC)
TITLE = "L2 SEISS/SGPS - 1-minute Flux Averages"
DIFFERENTIAL_UNIT = "protons/(cm^2 sr keV s)"
INTEGRAL_UNIT = "protons/(cm^2 sr s)"
FILL = -1e31
COUNT_FILL = 4294967295
MINUTES = 5


def sgps_netcdf(
    tmp_path: Path,
    platform: str = "g19",
    title: str = TITLE,
    differential_unit: str = DIFFERENTIAL_UNIT,
    channels: int = 13,
) -> bytes:
    """Five one-minute averages, each kept or dropped for one documented reason."""
    path = tmp_path / "sgps.nc"
    with Dataset(path, "w") as dataset:
        dataset.platform = platform
        dataset.title = title
        dataset.orbital_slot = "GOES-East"
        dataset.createDimension("time", MINUTES)
        dataset.createDimension("sensor_units", 2)
        dataset.createDimension("diff_channels", channels)
        time = dataset.createVariable("time", "f8", ("time",), fill_value=FILL)
        time.units = "seconds since 2000-01-01 12:00:00 UTC"
        stamps = [(DAY - EPOCH).total_seconds() + minute * 60 for minute in range(MINUTES)]
        stamps[4] = FILL  # minute 4 has no time
        time[:] = stamps

        # minute m, sensor s, channel c -> m + s / 10 + c / 1000, so every reading is recognisable.
        differential = np.ma.masked_array(
            np.arange(MINUTES)[:, None, None]
            + np.arange(2)[None, :, None] / 10
            + np.arange(channels)[None, None, :] / 1000,
            dtype="f4",
        )
        differential_samples = np.ma.masked_array(np.full((MINUTES, 2, channels), 60), dtype="u4")
        differential_samples[1, 0, 0] = 0  # no valid 1-second sample: dropped
        differential_samples[2, 0, 1] = np.ma.masked  # no count at all: dropped
        differential[3, 0, 2] = np.ma.masked  # fill
        differential[3, 1, 0] = -1.0  # a negative flux is not a reading
        integral = np.ma.masked_array(
            np.arange(MINUTES)[:, None] + np.arange(2)[None, :] / 10, dtype="f4"
        )
        integral_samples = np.ma.masked_array(np.full((MINUTES, 2), 60), dtype="u4")
        integral_samples[0, 1] = 0

        for name, dimensions, unit, values in (
            (
                "AvgDiffProtonFlux",
                ("time", "sensor_units", "diff_channels"),
                differential_unit,
                differential,
            ),
            ("AvgIntProtonFlux", ("time", "sensor_units"), INTEGRAL_UNIT, integral),
        ):
            variable = dataset.createVariable(name, "f4", dimensions, fill_value=np.float32(FILL))
            variable.units = unit
            variable[:] = values
        for name, dimensions, values in (
            (
                "DiffValidL1bSamplesInAvg",
                ("time", "sensor_units", "diff_channels"),
                differential_samples,
            ),
            ("IntValidL1bSamplesInAvg", ("time", "sensor_units"), integral_samples),
        ):
            variable = dataset.createVariable(
                name, "u4", dimensions, fill_value=np.uint32(COUNT_FILL)
            )
            variable[:] = values
    return path.read_bytes()


def at(*offsets: int) -> list[datetime]:
    return [DAY + timedelta(minutes=offset) for offset in offsets]


def test_keeps_counted_averages_and_drops_empty_fill_and_negative_ones(tmp_path: Path) -> None:
    decoded = decode(sgps_netcdf(tmp_path), 19)

    assert decoded.satellite == "G19"
    assert len(CHANNELS) == 28
    assert set(decoded.series) == {channel.code for channel in CHANNELS}
    # Minute 4 has no time, so no channel has it.
    assert decoded.series["minus:P1"] == list(zip(at(0, 2, 3), [0.0, 2.0, 3.0], strict=True))
    assert [stamp for stamp, _ in decoded.series["minus:P2A"]] == at(0, 1, 3)
    assert [stamp for stamp, _ in decoded.series["minus:P2B"]] == at(0, 1, 2)
    assert [stamp for stamp, _ in decoded.series["plus:P1"]] == at(0, 1, 2)
    assert [value for _, value in decoded.series["plus:P10"]] == pytest.approx(
        [0.112, 1.112, 2.112, 3.112]
    )
    # The integral channel reads its own variable and its own sample counts.
    assert [stamp for stamp, _ in decoded.series["minus:P11"]] == at(0, 1, 2, 3)
    assert [value for _, value in decoded.series["plus:P11"]] == pytest.approx([1.1, 2.1, 3.1])
    assert decoded.first_observed_at == DAY
    assert decoded.last_observed_at == DAY + timedelta(minutes=3)


def test_the_explorer_channel_codes_follow_the_files_channel_order(tmp_path: Path) -> None:
    decoded = decode(sgps_netcdf(tmp_path), 19)
    # P8AF is the ninth channel (index 8), as the explorer and the L2 file both order them.
    assert decoded.series["minus:P8AF"][0][1] == pytest.approx(0.008)
    assert decoded.series["plus:P9F"][0][1] == pytest.approx(0.111)


def test_global_attributes_are_kept_as_json_values(tmp_path: Path) -> None:
    attributes = decode(sgps_netcdf(tmp_path), 19).attributes
    assert attributes["platform"] == "g19"
    assert attributes["orbital_slot"] == "GOES-East"


def test_a_file_from_another_spacecraft_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="GOES-19"):
        decode(sgps_netcdf(tmp_path, platform="g18"), 19)


def test_a_file_of_another_product_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="SGPS"):
        decode(sgps_netcdf(tmp_path, title="L2 SEISS/MPS-HI - 1-minute Flux Averages"), 19)


def test_unexpected_units_are_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="units"):
        decode(sgps_netcdf(tmp_path, differential_unit="alphas/(cm^2 sr keV s)"), 19)


def test_a_file_with_another_channel_layout_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="dimensions"):
        decode(sgps_netcdf(tmp_path, channels=11), 19)
