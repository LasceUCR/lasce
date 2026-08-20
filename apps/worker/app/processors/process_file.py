"""``process-file``: read an object from MinIO, summarise it, write the result back.

Demonstrates the third store: the source object comes from MinIO, the summary
goes back to MinIO, and the bookkeeping row lands in PostgreSQL. The natural
input is the CSV that ``ingest-readings`` archives.
"""

import csv
import io
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert

from app.clients.db import session_scope
from app.clients.storage import get_object_storage
from app.db.models import FileArtifact
from app.logging import get_logger
from app.models.jobs import ProcessFilePayload

log = get_logger(__name__)


def _summarise_csv(raw: bytes) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8")))
    values: list[float] = []
    rows = 0

    for row in reader:
        rows += 1
        try:
            values.append(float(row["value"]))
        except (KeyError, TypeError, ValueError):
            # A column that is not numeric is fine; it just does not contribute.
            continue

    summary: dict[str, Any] = {"rows": rows, "numericValues": len(values)}
    if values:
        summary |= {
            "min": min(values),
            "max": max(values),
            "avg": round(sum(values) / len(values), 4),
        }
    return summary


async def _record_artifact(payload: ProcessFilePayload, size: int, rows: int) -> None:
    """Upsert the bookkeeping row.

    ``updated_at`` is set by hand because Prisma's ``@updatedAt`` is applied by
    the Prisma client, which never runs here.
    """
    now = datetime.now(UTC)
    statement = (
        insert(FileArtifact)
        .values(
            object_key=payload.object_key,
            content_type=payload.content_type,
            size_bytes=size,
            row_count=rows,
            status="READY",
            error=None,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_update(
            index_elements=[FileArtifact.object_key],
            set_={
                "content_type": payload.content_type,
                "size_bytes": size,
                "row_count": rows,
                "status": "READY",
                "error": None,
                "updated_at": now,
            },
        )
    )

    async with session_scope() as session:
        await session.execute(statement)


async def run(payload: ProcessFilePayload, job: Any) -> dict[str, Any]:
    storage = get_object_storage()

    raw = await storage.get_object(payload.object_key)
    await job.updateProgress(40)

    summary = _summarise_csv(raw)
    summary_key = f"{payload.object_key}.summary.json"

    await storage.put_object(
        summary_key,
        json.dumps(summary, indent=2).encode("utf-8"),
        content_type="application/json",
    )
    await job.updateProgress(75)

    await _record_artifact(payload, size=len(raw), rows=int(summary["rows"]))
    await job.updateProgress(100)

    log.info("processed file", object_key=payload.object_key, rows=summary["rows"])

    return {"objectKey": payload.object_key, "summaryKey": summary_key, **summary}
