"""Pydantic mirrors of the job payload contracts.

The authoritative definitions are the Zod schemas in ``packages/contracts``.
These classes exist so a processor receives a typed object instead of a raw
dict, and ``tests/test_contracts.py`` validates them against the JSON Schema
exported from Zod — that test is what catches the two sides drifting apart.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobPayload(BaseModel):
    """Rejects unknown keys so a renamed field fails loudly instead of silently."""

    model_config = ConfigDict(extra="forbid")


class IngestReadingsPayload(JobPayload):
    """Pull a window of readings for one device and write them to InfluxDB."""

    device_id: str = Field(min_length=1, alias="deviceId")
    from_: datetime = Field(alias="from")
    to: datetime
