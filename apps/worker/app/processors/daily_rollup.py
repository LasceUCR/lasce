"""``daily-rollup``: the scheduled job.

Aggregates one day of readings from InfluxDB into PostgreSQL. This is the
processor the cron path exercises — whether it was fired by BullMQ's scheduler
(``pnpm jobs:register``) or by an external cron calling
``POST /api/jobs/daily-rollup/trigger``, the code below is identical.
"""

from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.clients.db import session_scope
from app.clients.influx import get_influx_client
from app.db.models import DailyRollup, Device
from app.logging import get_logger
from app.models.jobs import DailyRollupPayload

log = get_logger(__name__)


def _window(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=UTC)
    return start, start + timedelta(days=1)


async def run(payload: DailyRollupPayload, job: Any) -> dict[str, Any]:
    day = payload.date or (datetime.now(UTC).date() - timedelta(days=1))
    start, end = _window(day)

    # device external_id -> primary key, so InfluxDB tags map back to rows.
    async with session_scope() as session:
        devices = (await session.execute(select(Device.id, Device.external_id))).all()

    device_ids = {external_id: device_id for device_id, external_id in devices}
    if not device_ids:
        log.warning("no devices registered; nothing to roll up")
        return {"date": day.isoformat(), "devices": 0, "rowsWritten": 0}

    sql = f"""
        SELECT device_id,
               count(value) AS count,
               avg(value)   AS avg_value,
               min(value)   AS min_value,
               max(value)   AS max_value
        FROM readings
        WHERE time >= '{start.isoformat()}' AND time < '{end.isoformat()}'
        GROUP BY device_id
    """  # noqa: S608 - values are timestamps derived from a validated payload

    try:
        rows = await get_influx_client().query(sql)
    except Exception as error:  # noqa: BLE001
        # An empty database has no `readings` table yet, which the engine reports
        # as a query error rather than an empty result.
        log.warning("influx query failed; assuming no data", error=str(error))
        rows = []

    await job.updateProgress(50)

    written = 0
    now = datetime.now(UTC)

    async with session_scope() as session:
        for row in rows:
            device_id = device_ids.get(str(row["device_id"]))
            if device_id is None:
                log.warning("unknown device in time series", device_id=row["device_id"])
                continue

            statement = (
                insert(DailyRollup)
                .values(
                    device_id=device_id,
                    date=day,
                    count=int(row["count"]),
                    avg_value=float(row["avg_value"]),
                    min_value=float(row["min_value"]),
                    max_value=float(row["max_value"]),
                    created_at=now,
                )
                .on_conflict_do_update(
                    index_elements=[DailyRollup.device_id, DailyRollup.date],
                    set_={
                        "count": int(row["count"]),
                        "avg_value": float(row["avg_value"]),
                        "min_value": float(row["min_value"]),
                        "max_value": float(row["max_value"]),
                    },
                )
            )
            await session.execute(statement)
            written += 1

    await job.updateProgress(100)
    log.info("daily rollup finished", date=day.isoformat(), rows_written=written)

    return {"date": day.isoformat(), "devices": len(device_ids), "rowsWritten": written}
