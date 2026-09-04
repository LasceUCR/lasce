"""Guards the contract between the TypeScript producer and this worker.

`packages/contracts` exports its Zod schemas to JSON Schema; the models in
`app/models/jobs.py` are the Python mirror. If someone changes one side and not
the other, this is what tells them.

Regenerate the schemas with `pnpm contracts:export`.
"""

import json
from datetime import UTC, datetime
from typing import Any

import pytest
from jsonschema import Draft202012Validator
from pydantic import ValidationError

from app.models.jobs import JobPayload
from app.registry import REGISTRY
from tests.conftest import REPO_ROOT

SCHEMA_DIR = REPO_ROOT / "packages" / "contracts" / "schema"

# One realistic payload per job, expressed the way the producer sends it
# (camelCase keys, JSON-friendly values).
EXAMPLES: dict[str, dict[str, Any]] = {
    "ingest-readings": {
        "deviceId": "device-001",
        "from": datetime(2026, 8, 19, tzinfo=UTC).isoformat(),
        "to": datetime(2026, 8, 20, tzinfo=UTC).isoformat(),
    },
    "process-file": {
        "objectKey": "readings/device-001/2026-08-19.csv",
        "contentType": "text/csv",
    },
    "daily-rollup": {
        "date": "2026-08-19",
    },
}


def _schema_names() -> set[str]:
    if not SCHEMA_DIR.exists():
        pytest.fail(f"{SCHEMA_DIR} is missing. Run: pnpm contracts:export")
    return {path.stem for path in SCHEMA_DIR.glob("*.json")}


def test_registry_covers_every_exported_contract() -> None:
    assert _schema_names() == set(REGISTRY), (
        "Job names differ between packages/contracts and app/registry.py. "
        "Add the missing processor, or run `pnpm contracts:export` after editing the contracts."
    )


def test_every_job_has_an_example() -> None:
    assert set(EXAMPLES) == set(REGISTRY)


@pytest.mark.parametrize("job_name", sorted(EXAMPLES))
def test_example_payload_matches_exported_schema(job_name: str) -> None:
    schema = json.loads((SCHEMA_DIR / f"{job_name}.json").read_text())
    Draft202012Validator(schema).validate(EXAMPLES[job_name])


@pytest.mark.parametrize("job_name", sorted(EXAMPLES))
def test_pydantic_model_round_trips_through_the_schema(job_name: str) -> None:
    """The Python model must accept the producer's payload and re-emit a valid one."""
    model: type[JobPayload] = REGISTRY[job_name].payload_model

    parsed = model.model_validate(EXAMPLES[job_name])
    dumped = parsed.model_dump(mode="json", by_alias=True, exclude_none=True)

    schema = json.loads((SCHEMA_DIR / f"{job_name}.json").read_text())
    Draft202012Validator(schema).validate(dumped)


@pytest.mark.parametrize("job_name", sorted(EXAMPLES))
def test_model_rejects_unknown_fields(job_name: str) -> None:
    model: type[JobPayload] = REGISTRY[job_name].payload_model
    payload = {**EXAMPLES[job_name], "unexpectedField": True}

    with pytest.raises(ValidationError):
        model.model_validate(payload)
