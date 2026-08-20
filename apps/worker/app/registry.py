"""Maps a job name to the model that validates its payload and the code that runs it.

The names must match ``JOB_NAMES`` in ``packages/contracts/src/jobs.ts`` — that
is asserted by ``tests/test_contracts.py``, so a job added on one side and
forgotten on the other fails the suite instead of failing in production.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from app.models.jobs import (
    DailyRollupPayload,
    IngestReadingsPayload,
    JobPayload,
    ProcessFilePayload,
)
from app.processors import daily_rollup, ingest_readings, process_file

Processor = Callable[[Any, Any], Awaitable[dict[str, Any]]]


class UnknownJobError(LookupError):
    """Raised for a job name with no processor.

    Failing loudly matters: a job nobody handles would otherwise sit in the
    queue looking healthy while its work silently never happens.
    """


@dataclass(frozen=True)
class JobHandler:
    payload_model: type[JobPayload]
    run: Processor


REGISTRY: dict[str, JobHandler] = {
    "ingest-readings": JobHandler(IngestReadingsPayload, ingest_readings.run),
    "process-file": JobHandler(ProcessFilePayload, process_file.run),
    "daily-rollup": JobHandler(DailyRollupPayload, daily_rollup.run),
}


def get_handler(name: str) -> JobHandler:
    try:
        return REGISTRY[name]
    except KeyError as error:
        known = ", ".join(sorted(REGISTRY))
        raise UnknownJobError(f'No processor for job "{name}". Known jobs: {known}') from error
