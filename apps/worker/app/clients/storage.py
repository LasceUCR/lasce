"""MinIO (S3-compatible) object storage.

Like the InfluxDB client this SDK is synchronous, so calls run on a thread to
keep the worker's event loop free.
"""

import asyncio
import io
from functools import lru_cache

from minio import Minio

from app.settings import get_settings


class ObjectStorage:
    def __init__(self, client: Minio, bucket: str) -> None:
        self._client = client
        self._bucket_ready = False
        self.bucket = bucket

    async def ensure_bucket(self) -> None:
        """Creates the bucket on first use.

        This is why the scaffold needs no bootstrap script: the first job that
        touches storage creates what it needs, and every call after that is a
        cheap no-op.
        """
        if self._bucket_ready:
            return

        exists = await asyncio.to_thread(self._client.bucket_exists, self.bucket)
        if not exists:
            await asyncio.to_thread(self._client.make_bucket, self.bucket)

        self._bucket_ready = True

    async def get_object(self, key: str) -> bytes:
        await self.ensure_bucket()

        def _read() -> bytes:
            response = self._client.get_object(self.bucket, key)
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()

        return await asyncio.to_thread(_read)

    async def put_object(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> None:
        await self.ensure_bucket()
        await asyncio.to_thread(
            self._client.put_object,
            self.bucket,
            key,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )

    async def size_of(self, key: str) -> int:
        await self.ensure_bucket()
        stat = await asyncio.to_thread(self._client.stat_object, self.bucket, key)
        return int(stat.size or 0)


@lru_cache(maxsize=1)
def get_object_storage() -> ObjectStorage:
    settings = get_settings()
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )
    return ObjectStorage(client, settings.minio_bucket)
