"""SQLAlchemy mirror of the Prisma schema.

``packages/db/prisma/schema.prisma`` is the source of truth and the only place
migrations are written. These classes just let the worker read and write the
same tables. Whenever you change a Prisma model, change the matching class here.
"""

import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


class Publisher(Base):
    """A journal, conference, or institutional outlet a research record was
    published through. Lives in the ``research`` Postgres schema, not ``public``.
    """

    __tablename__ = "publishers"
    __table_args__ = {"schema": "research"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Research(Base):
    """A public research record shown on `/investigacion`. Mapped to
    ``research_records`` (not ``research``) to avoid a `research.research`
    stutter under the ``research`` Postgres schema.
    """

    __tablename__ = "research_records"
    __table_args__ = {"schema": "research"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    title: Mapped[str] = mapped_column(Text)
    publication_date: Mapped[date_type] = mapped_column(Date)
    publisher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research.publishers.id", ondelete="RESTRICT")
    )
    abstract: Mapped[str] = mapped_column(Text)
    external_url: Mapped[str] = mapped_column(Text, unique=True)
    doi: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResearchAuthor(Base):
    """A person credited as an author on one or more research records."""

    __tablename__ = "research_authors"
    __table_args__ = {"schema": "research"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResearchCrossAuthor(Base):
    """Many-to-many join between `Research` and `ResearchAuthor`. Keeps
    ``position`` so a record's citation author order can be reproduced.
    """

    __tablename__ = "research_cross_authors"
    __table_args__ = {"schema": "research"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    research_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research.research_records.id", ondelete="CASCADE")
    )
    research_author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research.research_authors.id", ondelete="CASCADE")
    )
    position: Mapped[int] = mapped_column(Integer)


class NewsSource(Base):
    """An outlet where a news item was published. Lives in the ``news`` Postgres schema."""

    __tablename__ = "news_sources"
    __table_args__ = {"schema": "news"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class News(Base):
    """A public news item shown on `/noticias`."""

    __tablename__ = "news_records"
    __table_args__ = {"schema": "news"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    title: Mapped[str] = mapped_column(Text)
    published_at: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("news.news_sources.id", ondelete="RESTRICT")
    )
    abstract: Mapped[str] = mapped_column(Text)
    external_url: Mapped[str] = mapped_column(Text, unique=True)
    image_url: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class NewsAuthor(Base):
    """A person credited as an author on one or more news items."""

    __tablename__ = "news_authors"
    __table_args__ = {"schema": "news"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class NewsCrossAuthor(Base):
    """Many-to-many join between `News` and `NewsAuthor`. Keeps ``position`` so
    a record's citation order can be reproduced.
    """

    __tablename__ = "news_cross_authors"
    __table_args__ = {"schema": "news"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    news_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("news.news_records.id", ondelete="CASCADE")
    )
    news_author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("news.news_authors.id", ondelete="CASCADE")
    )
    position: Mapped[int] = mapped_column(Integer)
