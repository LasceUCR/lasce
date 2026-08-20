from app.settings import Settings


def _settings(url: str) -> Settings:
    return Settings(database_url=url)  # type: ignore[call-arg]


def test_prisma_url_gets_the_async_driver() -> None:
    settings = _settings("postgresql://lasce:lasce@localhost:5432/lasce")
    assert settings.sqlalchemy_url == "postgresql+psycopg://lasce:lasce@localhost:5432/lasce"


def test_legacy_postgres_scheme_is_handled() -> None:
    settings = _settings("postgres://lasce:lasce@db:5432/lasce")
    assert settings.sqlalchemy_url.startswith("postgresql+psycopg://")


def test_explicit_driver_is_left_alone() -> None:
    url = "postgresql+asyncpg://lasce:lasce@localhost:5432/lasce"
    assert _settings(url).sqlalchemy_url == url
