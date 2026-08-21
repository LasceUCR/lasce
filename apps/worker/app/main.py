"""Worker entry point.

Consumes the BullMQ queue that ``apps/web`` produces onto. The official Python
port of BullMQ runs the same Lua scripts as the Node one, which is what makes a
TypeScript producer and a Python consumer able to share a queue at all.

Run it with ``pnpm worker:dev`` (or ``uv run python -m app.main``).
"""

import asyncio
import signal
from datetime import UTC, datetime
from typing import Any

from bullmq import Job, Worker
from sqlalchemy.dialects.postgresql import insert

from app.clients.db import dispose_engine, session_scope
from app.db.models import JobRun
from app.logging import configure_logging, get_logger
from app.registry import get_handler
from app.settings import get_settings

log = get_logger(__name__)


async def _record_run(
    job: Job,
    status: str,
    started_at: datetime,
    finished_at: datetime | None = None,
    error: str | None = None,
) -> None:
    """Writes the audit row for this execution.

    Bookkeeping must never sink the job it is describing, so a database problem
    here is logged and swallowed rather than raised.
    """
    duration_ms = (
        int((finished_at - started_at).total_seconds() * 1000) if finished_at else None
    )

    statement = (
        insert(JobRun)
        .values(
            job_id=str(job.id),
            name=job.name,
            status=status,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
            error=error,
        )
        .on_conflict_do_update(
            index_elements=[JobRun.job_id],
            set_={
                "status": status,
                "finished_at": finished_at,
                "duration_ms": duration_ms,
                "error": error,
            },
        )
    )

    try:
        async with session_scope() as session:
            await session.execute(statement)
    except Exception as db_error:  # noqa: BLE001
        log.warning("could not record job run", job_id=job.id, error=str(db_error))


async def process(job: Job, job_token: str) -> dict[str, Any]:
    """Validate, dispatch, record. Called by BullMQ for every job."""
    started_at = datetime.now(UTC)
    log.info("job started", job_id=job.id, name=job.name)

    handler = get_handler(job.name)
    payload = handler.payload_model.model_validate(job.data)

    await _record_run(job, "RUNNING", started_at)

    try:
        result = await handler.run(payload, job)
    except Exception as error:
        finished_at = datetime.now(UTC)
        await _record_run(job, "FAILED", started_at, finished_at, str(error))
        log.error("job failed", job_id=job.id, name=job.name, error=str(error))
        # Re-raise so BullMQ applies the retry policy from defaultJobOptions.
        raise

    finished_at = datetime.now(UTC)
    await _record_run(job, "COMPLETED", started_at, finished_at)
    log.info(
        "job completed",
        job_id=job.id,
        name=job.name,
        duration_ms=int((finished_at - started_at).total_seconds() * 1000),
    )

    return result


async def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)

    worker = Worker(
        settings.queue_name,
        process,
        {
            "connection": settings.redis_url,
            "concurrency": settings.worker_concurrency,
        },
    )

    log.info(
        "worker ready",
        queue=settings.queue_name,
        concurrency=settings.worker_concurrency,
        redis=settings.redis_url,
    )

    # Finish in-flight jobs on SIGINT/SIGTERM instead of dropping them.
    shutdown = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown.set)
        except NotImplementedError:
            # Windows' event loop doesn't support add_signal_handler.
            signal.signal(sig, lambda *_args: shutdown.set())

    await shutdown.wait()

    log.info("shutting down; waiting for in-flight jobs")
    await worker.close()
    await dispose_engine()
    log.info("worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
