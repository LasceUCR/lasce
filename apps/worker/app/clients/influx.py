"""InfluxDB 3 Core client.

``influxdb3-python`` is synchronous, and the BullMQ worker runs on asyncio, so
every call is pushed onto a thread. Doing it here keeps the processors free of
``to_thread`` noise and stops a slow write from stalling every other job the
worker is handling concurrently.
"""

import asyncio
from functools import lru_cache
from typing import Any

from influxdb_client_3 import InfluxDBClient3, Point

from app.settings import get_settings

__all__ = ["InfluxClient", "Point", "get_influx_client"]


class InfluxClient:
    def __init__(self, host: str, token: str, database: str) -> None:
        self._client = InfluxDBClient3(host=host, token=token, database=database)
        self.database = database

    async def write(self, points: list[Point]) -> None:
        """Writes a batch of points. A no-op for an empty batch."""
        if not points:
            return
        await asyncio.to_thread(self._client.write, record=points)

    async def query(self, sql: str) -> list[dict[str, Any]]:
        """Runs a SQL query and returns plain dictionaries.

        The client hands back a PyArrow table; ``to_pylist`` is enough for the
        row counts this worker deals with. Stream the table directly if a query
        ever grows past what fits comfortably in memory.
        """
        table = await asyncio.to_thread(self._client.query, query=sql, language="sql")
        rows: list[dict[str, Any]] = table.to_pylist()
        return rows

    async def close(self) -> None:
        await asyncio.to_thread(self._client.close)


@lru_cache(maxsize=1)
def get_influx_client() -> InfluxClient:
    settings = get_settings()
    return InfluxClient(
        host=settings.influxdb_host,
        token=settings.influxdb_token,
        database=settings.influxdb_database,
    )
