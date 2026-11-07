"""Decodes one daily SEISS MPS-HI (MPSH) L2 one-minute file.

A daily ``mpsh-l2-avg1m`` file holds 1 440 one-minute averages of the
magnetospheric electron and proton flux at medium and high energy, seen by five
electron and five proton telescopes fanned across the spacecraft's Y-Z plane.
The 105 series the ``/datos`` explorer offers for the ``MPSH`` product
(``apps/web/app/lib/scientific-data.ts``) are kept, coded
``<species>:T<telescope>:E<band>``:

- ``electron:T1:E1`` ... ``electron:T5:E10``: ``AvgDiffElectronFlux``, in
  ``electrons/(cm^2 sr keV s)``.
- ``proton:T1:E1`` ... ``proton:T5:E11``: ``AvgDiffProtonFlux``, in
  ``protons/(cm^2 sr keV s)``.

Telescopes keep their instrument numbering (each its own viewing direction);
no directional averaging is applied. The integral electron channel (> 2 MeV)
is not stored. Readings go to the ``mpsh_flux`` measurement through
:class:`app.services.seiss.readings.SeissReadings`.

What counts as a reading is the SGPS rule (:func:`app.clients.netcdf.averaged`):
a minute with at least one valid 1-second L1b sample in its average, and a
finite, non-negative flux that is not fill. The ``*DQF*Sum`` counts do not
drop a minute. See ``docs/seiss-pipeline.md``.
"""

from dataclasses import dataclass
from typing import Any

import numpy as np
from netCDF4 import Dataset

from app.clients.netcdf import NETCDF_LOCK, averaged, json_attribute
from app.services.seiss.readings import SeissDecoded, readings

MEASUREMENT = "mpsh_flux"
TELESCOPES = 5


@dataclass(frozen=True)
class Species:
    """One particle species: its flux and sample-count variables, unit and band count."""

    code: str
    variable: str
    samples: str
    unit: str
    bands: int


SPECIES = (
    Species(
        "electron",
        "AvgDiffElectronFlux",
        "DiffElectronValidL1bSamplesInAvg",
        "electrons/(cm^2 sr keV s)",
        10,
    ),
    Species(
        "proton",
        "AvgDiffProtonFlux",
        "DiffProtonValidL1bSamplesInAvg",
        "protons/(cm^2 sr keV s)",
        11,
    ),
)


@dataclass(frozen=True)
class Channel:
    """One stored series: its code, its species, and its telescope and band indices."""

    code: str
    species: Species
    telescope: int
    band: int


CHANNELS: tuple[Channel, ...] = tuple(
    Channel(f"{species.code}:T{telescope + 1}:E{band + 1}", species, telescope, band)
    for species in SPECIES
    for telescope in range(TELESCOPES)
    for band in range(species.bands)
)


def _species_values(dataset: Any, species: Species, times: Any) -> tuple[Any, Any]:
    data = dataset.variables[species.variable]
    if data.units != species.unit:
        raise ValueError(f"Unexpected units for {species.variable}: {data.units!r}")
    values = data[:]
    if values.shape != (*times.shape, TELESCOPES, species.bands):
        raise ValueError(f"Time and {species.variable} dimensions do not match")
    return values, dataset.variables[species.samples][:]


def decode(content: bytes, spacecraft: int) -> SeissDecoded:
    """Pure and CPU-bound: a daily NetCDF file -> every channel's readings.

    Runs on a worker thread (see the ``seiss-pipeline`` processor), under the
    process-wide netCDF lock. Raises ``ValueError`` if the file is not the MPSH
    one-minute product of the spacecraft that was asked for.
    """
    with NETCDF_LOCK, Dataset("mpsh.nc", memory=content) as dataset:
        # The L2 files name the platform in lowercase ("g19") and have no `platform_ID`.
        satellite = str(getattr(dataset, "platform", "")).upper()
        if satellite != f"G{spacecraft}":
            raise ValueError(f"Expected GOES-{spacecraft} data, the file is from {satellite!r}")
        title = str(getattr(dataset, "title", ""))
        if "SEISS/MPS-HI" not in title or "1-minute" not in title:
            raise ValueError("The file is not a SEISS MPS-HI 1-minute product")

        time_variable = dataset.variables["time"]
        times = time_variable[:]
        time_valid = ~np.ma.getmaskarray(times) & np.isfinite(np.ma.filled(times, np.nan))

        species_values = {
            species.code: _species_values(dataset, species, times) for species in SPECIES
        }
        series: dict[str, list[tuple[Any, float]]] = {}
        for channel in CHANNELS:
            values, samples = species_values[channel.species.code]
            filled, valid = averaged(
                values[:, channel.telescope, channel.band],
                samples[:, channel.telescope, channel.band],
            )
            series[channel.code] = readings(time_variable, times, filled, time_valid & valid)

        attributes = {name: json_attribute(dataset.getncattr(name)) for name in dataset.ncattrs()}
    return SeissDecoded(satellite=satellite, series=series, attributes=attributes)
