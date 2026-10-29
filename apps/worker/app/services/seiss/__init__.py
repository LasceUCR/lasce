"""The SEISS products the ``seiss-pipeline`` ingests, and how each is decoded.

A product's decoder turns a daily file into :class:`SeissDecoded` readings;
everything after that (InfluxDB points, republished days, the catalogue row)
is shared, in :mod:`app.services.seiss.readings`.
"""

from collections.abc import Callable
from dataclasses import dataclass

from app.clients.seiss import SeissProduct
from app.services.seiss import ehis, sgps
from app.services.seiss.readings import SeissDecoded, SeissReadings


@dataclass(frozen=True)
class Decoder:
    """Where a product's readings go, and how its daily file is read."""

    measurement: str
    decode: Callable[[bytes, int], SeissDecoded]


DECODERS: dict[SeissProduct, Decoder] = {
    SeissProduct.EHIS: Decoder(ehis.MEASUREMENT, ehis.decode),
    SeissProduct.SGPS: Decoder(sgps.MEASUREMENT, sgps.decode),
}

__all__ = ["DECODERS", "Decoder", "SeissDecoded", "SeissReadings"]
