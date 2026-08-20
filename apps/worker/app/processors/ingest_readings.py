"""``ingest-readings``: pull a window of readings for one device.

There is no upstream system in the scaffold, so the readings are synthesised.
Replace :func:`_fetch_readings` with the real source — everything around it
(the InfluxDB write, the CSV archived to MinIO, the return value the UI shows)
stays as is.
"""

import csv
import io
import math
from datetime import datetime, timedelta
from typing import Any

from app.clients.influx import Point, get_influx_client
from app.clients.storage import get_object_storage
from app.logging import get_logger
from app.models.jobs import IngestReadingsPayload

log = get_logger(__name__)

MEASUREMENT = "readings"
SAMPLE_INTERVAL = timedelta(minutes=1)
MAX_POINTS = 5_000


def _fetch_readings(
    device_id: str, start: datetime, end: datetime
) -> list[tuple[datetime, float]]:
    """Stand-in for the real data source: a smooth wave plus a slow drift."""
    readings: list[tuple[datetime, float]] = []
    timestamp = start
    index = 0

    while timestamp < end and index < MAX_POINTS:
        value = 20 + 5 * math.sin(index / 12) + index * 0.001
        readings.append((timestamp, round(value, 3)))
        timestamp += SAMPLE_INTERVAL
        index += 1

    return readings


def _to_csv(device_id: str, readings: list[tuple[datetime, float]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["device_id", "time", "value"])
    for timestamp, value in readings:
        writer.writerow([device_id, timestamp.isoformat(), value])
    return buffer.getvalue().encode("utf-8")


async def run(payload: IngestReadingsPayload, job: Any) -> dict[str, Any]:
    readings = _fetch_readings(payload.device_id, payload.from_, payload.to)

    if not readings:
        log.warning("no readings in window", device_id=payload.device_id)
        return {"deviceId": payload.device_id, "pointsWritten": 0, "objectKey": None}

    await job.updateProgress(25)

    points = [
        Point(MEASUREMENT).tag("device_id", payload.device_id).field("value", value).time(timestamp)
        for timestamp, value in readings
    ]
    await get_influx_client().write(points)
    await job.updateProgress(60)

    # Archive the raw window so `process-file` has something real to work on and
    # the ingest is reproducible without querying InfluxDB.
    object_key = f"readings/{payload.device_id}/{payload.from_.date().isoformat()}.csv"
    await get_object_storage().put_object(
        object_key,
        _to_csv(payload.device_id, readings),
        content_type="text/csv",
    )
    await job.updateProgress(100)

    log.info(
        "ingested readings",
        device_id=payload.device_id,
        points=len(points),
        object_key=object_key,
    )

    return {
        "deviceId": payload.device_id,
        "pointsWritten": len(points),
        "objectKey": object_key,
    }
