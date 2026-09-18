"""SQLAlchemy mirror of the Prisma schema.

``packages/db/prisma/schema.prisma`` is the source of truth and the only place
migrations are written. These classes just let the worker read and write the
same tables. Whenever you change a Prisma model, change the matching class here.
"""

import enum
import uuid
from datetime import date as date_type
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CHAR,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
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
    role: Mapped[UserRole | None] = mapped_column(
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


class UserSession(Base):
    """A browser session for a portal account; mirrors the Prisma ``Session`` model
    (table ``auth.sessions``). Named ``UserSession`` so it is never confused with
    ``sqlalchemy.orm.Session``. Never log ``token_hash``.
    """

    __tablename__ = "sessions"
    __table_args__ = {"schema": "auth"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE")
    )
    token_hash: Mapped[str] = mapped_column(Text, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RolePermission(Base):
    """Permission granted to a ``UserRole``. Mirrors the Prisma ``RolePermission``
    model (table ``auth.role_permissions``). The permission strings are the web
    catalogue; this table only stores the mapping.
    """

    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role", "permission", name="role_permissions_role_permission_key"),
        {"schema": "auth"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    role: Mapped[UserRole] = mapped_column(
        ENUM(
            UserRole,
            name="user_role",
            schema="auth",
            create_type=False,
            values_callable=lambda members: [member.value for member in members],
        )
    )
    permission: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SuviFrame(Base):
    """One SUVI L1b frame, catalogued from its FITS header. Written by
    ``app.services.process_headers.ProcessHeaders``, the only writer this table
    has — the web app never touches it. Photometric and CCD-health numbers
    (``IMG_MEAN``, ``CCD_TMP1``, ...) are deliberately not columns here: they
    change every frame and belong in InfluxDB, queried by time rather than by row.
    """

    __tablename__ = "suvi_frames"
    __table_args__ = (
        UniqueConstraint(
            "satellite",
            "channel",
            "observed_at",
            name="suvi_frames_satellite_channel_observed_at_key",
        ),
        {"schema": "solar"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    wavelength: Mapped[float] = mapped_column(Float)
    satellite: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(Text)
    file_name: Mapped[str] = mapped_column(Text, unique=True)
    source_url: Mapped[str] = mapped_column(Text)
    exposure_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    sun_center_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    sun_center_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    sun_radius_px: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_flag: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    raw_header: Mapped[dict[str, Any]] = mapped_column(JSONB)
    # Pointers into the compressed pixel block. Null until the .sublk writer exists.
    block_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    block_offset: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    block_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_keyframe: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
