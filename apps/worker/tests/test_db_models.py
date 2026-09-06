"""Sanity checks for the SQLAlchemy mirror of the Prisma `research` schema.

Even though the worker doesn't have a job using this yet, the convention is to
replicate everything here.
"""

from app.db import Publisher, Research, ResearchAuthor, ResearchCrossAuthor


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
