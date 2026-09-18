"""``MINIO_ENDPOINT`` normalisation for the MinIO SDK."""

import pytest

from app.clients.storage import parse_endpoint


def test_bare_host_and_port_pass_through() -> None:
    assert parse_endpoint("localhost:9000", False) == ("localhost:9000", False)


def test_https_url_strips_the_scheme_and_turns_tls_on() -> None:
    assert parse_endpoint("https://s3.example.com", False) == ("s3.example.com", True)


def test_http_url_keeps_the_configured_tls_flag() -> None:
    assert parse_endpoint("http://minio:9000", False) == ("minio:9000", False)
    assert parse_endpoint("http://minio:9000/", True) == ("minio:9000", True)


def test_url_with_a_path_is_rejected() -> None:
    with pytest.raises(ValueError, match="path"):
        parse_endpoint("https://s3.example.com/bucket", False)
