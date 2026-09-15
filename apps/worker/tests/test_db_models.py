"""Sanity checks for the SQLAlchemy mirror of the Prisma schema.

Even though the worker doesn't have a job using these tables yet, the convention
is to replicate everything here so the two languages never disagree about a column.
"""

from app.db import (
    Publisher,
    Research,
    ResearchAuthor,
    ResearchCrossAuthor,
    User,
    UserRole,
    UserSession,
)


def test_research_tables_live_in_the_research_schema() -> None:
    for model in (Publisher, Research, ResearchAuthor, ResearchCrossAuthor):
        assert model.__table__.schema == "research"


def test_research_record_matches_the_prisma_columns() -> None:
    columns = Research.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "title",
        "publication_date",
        "publisher_id",
        "abstract",
        "external_url",
        "doi",
        "created_at",
        "updated_at",
    }
    assert columns["external_url"].unique
    assert columns["doi"].nullable
    assert not columns["title"].nullable


def test_research_cross_author_links_research_and_authors() -> None:
    columns = ResearchCrossAuthor.__table__.columns
    (research_fk,) = columns["research_id"].foreign_keys
    (author_fk,) = columns["research_author_id"].foreign_keys

    assert research_fk.target_fullname == "research.research_records.id"
    assert author_fk.target_fullname == "research.research_authors.id"


def test_research_belongs_to_a_publisher() -> None:
    (publisher_fk,) = Research.__table__.columns["publisher_id"].foreign_keys
    assert publisher_fk.target_fullname == "research.publishers.id"


def test_users_live_in_the_auth_schema() -> None:
    assert User.__table__.schema == "auth"


def test_user_matches_the_prisma_columns() -> None:
    columns = User.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "full_name",
        "email",
        "institution",
        "country_code",
        "password_hash",
        "role",
        "created_at",
        "updated_at",
    }
    assert columns["email"].unique
    assert not columns["full_name"].nullable
    assert not columns["password_hash"].nullable
    assert columns["country_code"].type.length == 2


def test_user_role_mirrors_the_prisma_enum() -> None:
    role = User.__table__.columns["role"]
    assert role.nullable  # Removing an assignment does not delete the account.

    assert [member.value for member in UserRole] == ["visitor", "assistant", "admin"]
    assert role.type.enums == ["visitor", "assistant", "admin"]
    assert role.type.name == "user_role"
    assert role.type.schema == "auth"
    assert role.type.create_type is False
    assert role.server_default is not None
    assert str(role.server_default.arg) == "'visitor'"


def test_sessions_live_in_the_auth_schema() -> None:
    assert UserSession.__table__.schema == "auth"


def test_session_matches_the_prisma_columns() -> None:
    columns = UserSession.__table__.columns

    assert set(columns.keys()) == {"id", "user_id", "token_hash", "expires_at", "created_at"}
    assert columns["token_hash"].unique
    assert not columns["user_id"].nullable
    assert not columns["expires_at"].nullable


def test_session_belongs_to_a_user_and_dies_with_it() -> None:
    (user_fk,) = UserSession.__table__.columns["user_id"].foreign_keys

    assert user_fk.target_fullname == "auth.users.id"
    assert user_fk.ondelete == "CASCADE"
