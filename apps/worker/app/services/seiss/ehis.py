"""Decodes one daily SEISS EHIS L1b file.

A daily ``seis-l1b-ehis`` file holds 288 five-minute reports of the energetic
heavy ion directional differential flux, per mass group and energy band. The
25 series the ``/datos`` explorer offers for the ``EHIS`` product
(``apps/web/app/lib/scientific-data.ts``) are kept: five energy bands
(``E1``-``E5``) for each of five mass groups, coded ``<group>:E<band>``:

- ``H``: hydrogen, ``He``: helium,
- ``CNO``: carbon-nitrogen-oxygen, ``NeS``: neon-sulfur, ``ClNi``: chlorine-nickel.

All are in ``cm-2 sr-1 s-1 (MeV nuc-1)-1``. The per-element Be-Cu fluxes are
not stored. They are written to the ``ehis_flux`` measurement by
:class:`app.services.seiss.readings.SeissReadings`.

What counts as a reading:

- Fill values are masked by netCDF4 itself (``_FillValue``, ``-1e31``), and
  negative or non-finite fluxes are dropped.
- A reading whose per-band DQF carries any **invalid** bit is dropped
  (:func:`app.clients.netcdf.invalid_quality`). A *degraded* reading is kept:
  on a quiet day almost every EHIS reading is flagged degraded because its
  statistical error cannot be calculated from so few counts, and dropping them
  would leave every channel but one empty. See ``docs/seiss-pipeline.md``.

The file has no ``time`` variable; a report's time is the start of its
elemental flux accumulation, ``ELF_StartStopTime[:, 0]``, which the product
calls the time of observation.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
from netCDF4 import Dataset

from app.clients.netcdf import NETCDF_LOCK, invalid_quality, json_attribute
from app.services.seiss.readings import SeissDecoded, readings

MEASUREMENT = "ehis_flux"
UNIT = "cm-2 sr-1 s-1 (MeV nuc-1)-1"
TIME_VARIABLE = "ELF_StartStopTime"
GROUPS = ("H", "He", "CNO", "NeS", "ClNi")
BANDS = 5


@dataclass(frozen=True)
class Channel:
    """One stored series: its code, its flux and quality variables, and its energy band."""

    code: str
    variable: str
    quality: str
    band: int


CHANNELS: tuple[Channel, ...] = tuple(
    Channel(
        f"{group}:E{band + 1}",
        f"{group}5MinuteDifferentialFluxes",
        f"{group}5MinuteDifferentialFluxDQFs",
        band,
    )
    for group in GROUPS
    for band in range(BANDS)
)


def _group_values(dataset: Any, variable: str) -> Any:
    data = dataset.variables[variable]
    if data.units != UNIT:
        raise ValueError(f"Unexpected units for {variable}: {data.units!r}")
    return data[:]


def decode(content: bytes, spacecraft: int) -> SeissDecoded:
    """Pure and CPU-bound: a daily NetCDF file -> every channel's readings.

    Runs on a worker thread (see the ``seiss-pipeline`` processor), under the
    process-wide netCDF lock. Raises ``ValueError`` if the file is not the EHIS
    product of the spacecraft that was asked for.
    """
    with NETCDF_LOCK, Dataset("ehis.nc", memory=content) as dataset:
        satellite = str(getattr(dataset, "platform_ID", "")).upper()
        if satellite != f"G{spacecraft}":
            raise ValueError(f"Expected GOES-{spacecraft} data, the file is from {satellite!r}")
        title = str(getattr(dataset, "title", ""))
        if "Energetic Heavy Ion Sensor (EHIS)" not in title:
            raise ValueError("The file is not a SEISS EHIS energetic heavy ion product")

        time_variable = dataset.variables[TIME_VARIABLE]
        times = time_variable[:, 0]
        time_valid = ~np.ma.getmaskarray(times) & np.isfinite(np.ma.filled(times, np.nan))

        series: dict[str, list[tuple[Any, float]]] = {}
        groups: dict[str, tuple[Any, Any]] = {}
        for channel in CHANNELS:
            if channel.variable not in groups:
                values = _group_values(dataset, channel.variable)
                if values.shape != (*times.shape, BANDS):
                    raise ValueError(f"Time and {channel.variable} dimensions do not match")
                groups[channel.variable] = (values, invalid_quality(dataset, channel.quality))
            values, invalid = groups[channel.variable]
            band = values[:, channel.band]
            filled = np.ma.filled(band.astype(np.float64), np.nan)
            valid = (
                time_valid
                & ~invalid[:, channel.band]
                & ~np.ma.getmaskarray(band)
                & np.isfinite(filled)
                & (filled >= 0)
            )
            series[channel.code] = readings(time_variable, times, filled, valid)

        attributes = {name: json_attribute(dataset.getncattr(name)) for name in dataset.ncattrs()}
    return SeissDecoded(satellite=satellite, series=series, attributes=attributes)
