"""Pydantic mirrors of the job payload contracts.

The authoritative definitions are the Zod schemas in ``packages/contracts``.
These classes exist so a processor receives a typed object instead of a raw
dict, and ``tests/test_contracts.py`` validates them against the JSON Schema
exported from Zod — that test is what catches the two sides drifting apart.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class JobPayload(BaseModel):
    """Rejects unknown keys so a renamed field fails loudly instead of silently."""

    model_config = ConfigDict(extra="forbid")


class IngestReadingsPayload(JobPayload):
    """Pull a window of readings for one device and write them to InfluxDB."""

    device_id: str = Field(min_length=1, alias="deviceId")
    from_: datetime = Field(alias="from")
    to: datetime


class QueryGoesArchivePayload(JobPayload):
    """One day and an increasing UTC time interval; selectors are validated by the reader."""

    product: Literal["SFXR", "SFEU", "GEOF", "MPSH", "SGPS"]
    parameter: str = Field(min_length=1, max_length=64)
    date: date
    start_time: str = Field(alias="startTime", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end_time: str = Field(alias="endTime", pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")


class SuviPipelinePayload(JobPayload):
    """Fetch the most recent SUVI L1b frame for one channel."""

    channel: Literal["Fe093", "Fe131", "Fe171", "Fe195", "Fe284", "He303"]
    spacecraft: int = Field(default=19)
    lookback_minutes: int = Field(alias="lookbackMinutes", ge=1, le=1440, default=10)
