"""SQLAlchemy mirror of the Prisma schema.

``packages/db/prisma/schema.prisma`` is the source of truth and the only place
migrations are written. These classes just let the worker read and write the
same tables. Whenever you change a Prisma model, change the matching class here.
"""

import enum
import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import CHAR, Date, DateTime, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import ENUM, UUID
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


class UserRole(enum.StrEnum):
    """Access level of a portal account. Mirrors the Prisma ``UserRole`` enum, whose
    database values are the lower-case strings below (``@map`` in the schema).
    """

    VISITOR = "visitor"
    ASSISTANT = "assistant"
    ADMIN = "admin"


class User(Base):
    """A portal account created by the public ``/registro`` form. Lives in the
    ``auth`` Postgres schema. No job touches it yet; it is mirrored by convention.
    Never log ``password_hash``.
    """

    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    institution: Mapped[str] = mapped_column(Text)
    country_code: Mapped[str] = mapped_column(CHAR(2))
    password_hash: Mapped[str] = mapped_column(Text)
    # The Postgres-specific ENUM is used on purpose: the generic `sqlalchemy.Enum`
    # silently drops `create_type`. Prisma owns the `auth.user_role` type and
    # creates it in the migration, so SQLAlchemy must never emit CREATE TYPE.
    role: Mapped[UserRole] = mapped_column(
        ENUM(
            UserRole,
            name="user_role",
            schema="auth",
            create_type=False,
            values_callable=lambda members: [member.value for member in members],
        ),
        server_default=text("'visitor'"),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
