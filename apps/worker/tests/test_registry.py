import pytest

from app.models.jobs import JobPayload
from app.registry import REGISTRY, UnknownJobError, get_handler


def test_get_handler_returns_a_handler_for_every_known_job() -> None:
    for name in REGISTRY:
        handler = get_handler(name)
        assert issubclass(handler.payload_model, JobPayload)
        assert callable(handler.run)


def test_unknown_job_fails_loudly() -> None:
    with pytest.raises(UnknownJobError) as error:
        get_handler("not-a-job")

    # The message should tell whoever hits this what the valid names are.
    assert "Known jobs" in str(error.value)
