"""Test configuration.

Environment variables are set before anything imports ``app.settings`` so the
suite runs without a ``.env`` and without any service being up.
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

os.environ.setdefault("DATABASE_URL", "postgresql://lasce:lasce@localhost:5432/lasce_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("CRON_SECRET", "test-secret")
