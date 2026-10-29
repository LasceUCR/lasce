"""Decodes one daily SEISS SGPS L2 one-minute file.

A daily ``sgps-l2-avg1m`` file holds 1 440 one-minute averages of the solar
and galactic proton flux seen by the spacecraft's two Solar and Galactic
Proton Sensors: ``-X`` (sensor unit 0) and ``+X`` (sensor unit 1). The 28
series the ``/datos`` explorer offers for the ``SGPS`` product
(``apps/web/app/lib/scientific-data.ts``) are kept, coded
``<minus|plus>:<channel>``:

- 13 differential channels, ``AvgDiffProtonFlux``, in
  ``protons/(cm^2 sr keV s)``. The explorer names the four highest-energy
  ones as the L1b files did (``P8AF``, ``P8BF``, ``P8CF``, ``P9F``); the L2
  file orders them the same way, so the codes stay as they are.
- The ``> 500 MeV`` integral channel ``P11``, ``AvgIntProtonFlux``, in
  ``protons/(cm^2 sr s)`` (pfu).

Sensor units are kept in the instrument frame and not swapped on a yaw flip,
exactly as the explorer has always named them. The alpha channels are not
stored. Readings go to the ``sgps_flux`` measurement through
:class:`app.services.seiss.readings.SeissReadings`.

What counts as a reading (:func:`app.clients.netcdf.averaged`): a minute with
at least one valid 1-second L1b sample in its average, and a finite,
non-negative flux that is not fill. The L2 file's ``*DQF*Sum`` counts (samples
flagged for dead time, out-of-band contamination, dynamic error or a missing
opposite sensor) do not drop a minute: like a degraded EHIS reading, a
flagged-but-valid average is still the best measurement there is, and high-flux
storm minutes, the ones that matter most, are the ones most often flagged.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
from netCDF4 import Dataset

from app.clients.netcdf import NETCDF_LOCK, averaged, json_attribute
from app.services.seiss.readings import SeissDecoded, readings

MEASUREMENT = "sgps_flux"
DIFFERENTIAL_UNIT = "protons/(cm^2 sr keV s)"
INTEGRAL_UNIT = "protons/(cm^2 sr s)"
SENSORS = ("minus", "plus")
DIFFERENTIAL_CHANNELS = (
    "P1",
    "P2A",
    "P2B",
    "P3",
    "P4",
    "P5",
    "P6",
    "P7",
    "P8AF",
    "P8BF",
    "P8CF",
    "P9F",
    "P10",
)
INTEGRAL_CHANNEL = "P11"


@dataclass(frozen=True)
class Channel:
    """One stored series: its code, its flux and sample-count variables, and its indices."""

    code: str
    variable: str
    samples: str
    unit: str
    index: tuple[int, ...]


CHANNELS: tuple[Channel, ...] = tuple(
    channel
    for sensor_index, sensor in enumerate(SENSORS)
    for channel in (
        *(
            Channel(
                f"{sensor}:{code}",
                "AvgDiffProtonFlux",
                "DiffValidL1bSamplesInAvg",
                DIFFERENTIAL_UNIT,
                (sensor_index, channel_index),
            )
            for channel_index, code in enumerate(DIFFERENTIAL_CHANNELS)
        ),
        Channel(
            f"{sensor}:{INTEGRAL_CHANNEL}",
            "AvgIntProtonFlux",
            "IntValidL1bSamplesInAvg",
            INTEGRAL_UNIT,
            (sensor_index,),
        ),
    )
)

_SHAPES = {
    "AvgDiffProtonFlux": (len(SENSORS), len(DIFFERENTIAL_CHANNELS)),
    "AvgIntProtonFlux": (len(SENSORS),),
}


def _variable(dataset: Any, channel: Channel, times: Any) -> Any:
    data = dataset.variables[channel.variable]
    if data.units != channel.unit:
        raise ValueError(f"Unexpected units for {channel.variable}: {data.units!r}")
    values = data[:]
    if values.shape != (*times.shape, *_SHAPES[channel.variable]):
        raise ValueError(f"Time and {channel.variable} dimensions do not match")
    return values


def decode(content: bytes, spacecraft: int) -> SeissDecoded:
    """Pure and CPU-bound: a daily NetCDF file -> every channel's readings.

    Runs on a worker thread (see the ``seiss-pipeline`` processor), under the
    process-wide netCDF lock. Raises ``ValueError`` if the file is not the SGPS
    one-minute product of the spacecraft that was asked for.
    """
    with NETCDF_LOCK, Dataset("sgps.nc", memory=content) as dataset:
        # The L2 files name the platform in lowercase ("g19") and have no `platform_ID`.
        satellite = str(getattr(dataset, "platform", "")).upper()
        if satellite != f"G{spacecraft}":
            raise ValueError(f"Expected GOES-{spacecraft} data, the file is from {satellite!r}")
        title = str(getattr(dataset, "title", ""))
        if "SEISS/SGPS" not in title or "1-minute" not in title:
            raise ValueError("The file is not a SEISS SGPS 1-minute product")

        time_variable = dataset.variables["time"]
        times = time_variable[:]
        time_valid = ~np.ma.getmaskarray(times) & np.isfinite(np.ma.filled(times, np.nan))

        series: dict[str, list[tuple[Any, float]]] = {}
        variables: dict[str, tuple[Any, Any]] = {}
        for channel in CHANNELS:
            if channel.variable not in variables:
                variables[channel.variable] = (
                    _variable(dataset, channel, times),
                    dataset.variables[channel.samples][:],
                )
            values, samples = variables[channel.variable]
            index = (slice(None), *channel.index)
            filled, valid = averaged(values[index], samples[index])
            series[channel.code] = readings(time_variable, times, filled, time_valid & valid)

        attributes = {name: json_attribute(dataset.getncattr(name)) for name in dataset.ncattrs()}
    return SeissDecoded(satellite=satellite, series=series, attributes=attributes)
