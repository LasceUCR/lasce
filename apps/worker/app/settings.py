"""Configuration for the worker, read from the repository-root ``.env``.

The TypeScript side validates the same variables in ``packages/config/src/env.ts``.
When you add one, update ``.env.example`` and both validators.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/worker/app/settings.py -> repository root
REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- PostgreSQL ---
    database_url: str = Field(description="Same URL Prisma uses; the scheme is rewritten below")

    # --- Redis / BullMQ ---
    redis_url: str = "redis://localhost:6379"
    queue_name: str = "lasce"

    # --- InfluxDB 3 Core ---
    influxdb_host: str = "http://localhost:8181"
    influxdb_token: str = ""
    influxdb_database: str = "lasce"

    # --- MinIO ---
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = "lasce-files"
    minio_use_ssl: bool = False

    # --- Worker ---
    worker_concurrency: int = 4
    log_level: str = "info"

    @property
    def sqlalchemy_url(self) -> str:
        """``DATABASE_URL`` with the driver SQLAlchemy needs.

        Prisma writes plain ``postgresql://`` URLs. SQLAlchemy has to be told
        which driver to use, and we want the async psycopg 3 one so database
        access does not block the event loop the BullMQ worker runs on.
        """
        url = self.database_url
        if url.startswith("postgresql+"):
            return url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        return url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings instance; call it instead of constructing ``Settings``."""
    return Settings()  # type: ignore[call-arg]
