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
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID
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


class ResearchArea(Base):
    """An editable research area shown on the public investigation page."""

    __tablename__ = "research_areas"
    __table_args__ = {"schema": "areas"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    src: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResearchAreaTranslation(Base):
    """The ``title`` and ``description`` of a `ResearchArea` in a language other
    than Spanish. One row per (area, locale); the Spanish text stays on
    ``research_areas`` and the photograph is shared.
    """

    __tablename__ = "research_area_translations"
    __table_args__ = (
        UniqueConstraint(
            "research_area_id",
            "locale",
            name="research_area_translations_research_area_id_locale_key",
        ),
        {"schema": "areas"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    research_area_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.research_areas.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
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
    external_url: Mapped[str] = mapped_column(Text, unique=True, nullable=True)
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


class ResearchTranslation(Base):
    """The ``title`` and ``abstract`` of a `Research` record in a language other
    than the source one. One row per (record, locale); the source text stays on
    ``research_records``.
    """

    __tablename__ = "research_record_translations"
    __table_args__ = (
        UniqueConstraint(
            "research_id", "locale", name="research_record_translations_research_id_locale_key"
        ),
        {"schema": "research"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    research_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research.research_records.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    abstract: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SolarPhysicsSection(Base):
    """An editable text section of the solar physics page (``/fisica-solar``).

    ``title`` and ``body`` are the Spanish source text; the other languages live in
    `SolarPhysicsSectionTranslation`. ``body`` is plain text with blank lines between paragraphs.
    """

    __tablename__ = "solar_physics_sections"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    key: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SolarPhysicsSectionTranslation(Base):
    """The ``title`` and ``body`` of a `SolarPhysicsSection` in a language other than the
    source one. One row per (section, locale); the source text stays on the section.
    """

    __tablename__ = "solar_physics_section_translations"
    __table_args__ = (
        UniqueConstraint(
            "section_id",
            "locale",
            name="solar_physics_section_translations_section_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.solar_physics_sections.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CollaborationScope(enum.StrEnum):
    """Language-independent classification of a partner organization."""

    NATIONAL = "national"
    INTERNATIONAL = "international"


class Collaboration(Base):
    """Partner organization; the base country is the source-language text."""

    __tablename__ = "collaborations"
    __table_args__ = {"schema": "research"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text)
    acronym: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str] = mapped_column(Text)
    scope: Mapped[CollaborationScope] = mapped_column(
        ENUM(
            CollaborationScope,
            name="collaboration_scope",
            schema="research",
            create_type=False,
            values_callable=lambda members: [member.value for member in members],
        )
    )
    position: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )


class CollaborationTranslation(Base):
    """Country in an additional locale, owned by the corresponding collaboration."""

    __tablename__ = "collaboration_translations"
    __table_args__ = (
        UniqueConstraint(
            "collaboration_id",
            "locale",
            name="collaboration_translations_collaboration_id_locale_key",
        ),
        {"schema": "research"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    collaboration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("research.collaborations.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    country: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )


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


class NewsTranslation(Base):
    """The ``title`` and ``abstract`` of a `News` item in a language other than
    the source one. One row per (item, locale); the source text stays on
    ``news_records``.
    """

    __tablename__ = "news_record_translations"
    __table_args__ = (
        UniqueConstraint("news_id", "locale", name="news_record_translations_news_id_locale_key"),
        {"schema": "news"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    news_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("news.news_records.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    abstract: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


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


class GalleryAlbum(Base):
    """A top-level gallery album or, when ``parent_album_id`` is set, a sub-album
    nested one level under one. Lives in the ``gallery`` Postgres schema. No job
    touches it yet; it is mirrored by convention.
    """

    __tablename__ = "gallery_albums"
    __table_args__ = {"schema": "gallery"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    slug: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    years_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_album_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("gallery.gallery_albums.id", ondelete="CASCADE"),
        nullable=True,
    )
    cover_object_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GalleryAlbumTranslation(Base):
    """The ``title`` and ``description`` of a `GalleryAlbum` in a language other
    than the source one. One row per (album, locale); the source text stays on
    ``gallery_albums``.
    """

    __tablename__ = "gallery_album_translations"
    __table_args__ = (
        UniqueConstraint(
            "album_id", "locale", name="gallery_album_translations_album_id_locale_key"
        ),
        {"schema": "gallery"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    album_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gallery.gallery_albums.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GalleryMedia(Base):
    """One photo or video shown in an album's masonry grid and lightbox. Lives in
    the ``gallery`` Postgres schema. No job touches it yet; it is mirrored by
    convention.
    """

    __tablename__ = "gallery_media"
    __table_args__ = {"schema": "gallery"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    album_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gallery.gallery_albums.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    alt_text: Mapped[str] = mapped_column(Text)
    object_key: Mapped[str] = mapped_column(Text, unique=True)
    format: Mapped[str] = mapped_column(Text)
    is_video: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    col_span: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    row_span: Mapped[int] = mapped_column(Integer, server_default=text("1"))
    captured_at: Mapped[date_type] = mapped_column(Date)
    uploader_name: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GalleryMediaTranslation(Base):
    """The ``title``, ``description``, and ``alt_text`` of a
    ``GalleryMedia`` record in a language other than the source one.
    One row per (media, locale); the source text stays on ``gallery_media``.
    """

    __tablename__ = "gallery_media_translations"
    __table_args__ = (
        UniqueConstraint(
            "gallery_media_id",
            "locale",
            name="gallery_media_translations_gallery_media_id_locale_key",
        ),
        {"schema": "gallery"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    gallery_media_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("gallery.gallery_media.id", ondelete="CASCADE"),
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    alt_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


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
    # MinIO key of this frame's rendered PNG (illustrative only, not a scientific product),
    # written by app.services.suvi_preview.publish_preview. Null only for a frame whose FITS HDU
    # carried no data array.
    preview_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ExisFile(Base):
    """One daily EXIS L1b file (one product, one UTC day). Written by
    ``app.services.exis_readings.ExisReadings``, the only writer this table
    has. The readings themselves are in the ``exis_irradiance`` InfluxDB
    measurement; this row records that the day was ingested, from which
    version of the archive's file, and how many points each channel produced.
    """

    __tablename__ = "exis_files"
    __table_args__ = (
        UniqueConstraint(
            "satellite",
            "product",
            "day",
            name="exis_files_satellite_product_day_key",
        ),
        {"schema": "solar"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    satellite: Mapped[str] = mapped_column(Text)
    product: Mapped[str] = mapped_column(Text)
    day: Mapped[date_type] = mapped_column(Date)
    file_name: Mapped[str] = mapped_column(Text, unique=True)
    version: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    source_modified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    first_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    point_count: Mapped[dict[str, int]] = mapped_column(JSONB)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MagFile(Base):
    """One daily MAG L2 1-minute geomagnetic field file (one UTC day). Written
    by ``app.services.mag_readings.MagReadings``, the only writer this table
    has. The readings themselves are in the ``mag_field`` InfluxDB
    measurement; this row records that the day was ingested, from which
    version of the archive's file, and how many points each channel produced.
    """

    __tablename__ = "mag_files"
    __table_args__ = (
        UniqueConstraint(
            "satellite",
            "product",
            "day",
            name="mag_files_satellite_product_day_key",
        ),
        {"schema": "solar"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    satellite: Mapped[str] = mapped_column(Text)
    product: Mapped[str] = mapped_column(Text)
    day: Mapped[date_type] = mapped_column(Date)
    file_name: Mapped[str] = mapped_column(Text, unique=True)
    version: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    source_modified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    first_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    point_count: Mapped[dict[str, int]] = mapped_column(JSONB)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EhisFile(Base):
    """One daily SEISS EHIS L1b heavy ion file (one UTC day). Written by
    ``app.services.ehis_readings.EhisReadings``, the only writer this table
    has. The readings themselves are in the ``ehis_flux`` InfluxDB
    measurement; this row records that the day was ingested, from which
    version of the archive's file, and how many points each channel produced.
    """

    __tablename__ = "ehis_files"
    __table_args__ = (
        UniqueConstraint(
            "satellite",
            "product",
            "day",
            name="ehis_files_satellite_product_day_key",
        ),
        {"schema": "solar"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    satellite: Mapped[str] = mapped_column(Text)
    product: Mapped[str] = mapped_column(Text)
    day: Mapped[date_type] = mapped_column(Date)
    file_name: Mapped[str] = mapped_column(Text, unique=True)
    version: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    source_modified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    first_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    point_count: Mapped[dict[str, int]] = mapped_column(JSONB)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResourceDownload(Base):
    """One file a signed-in user downloaded from ``/datos`` (a chart image or a data
    export). Lives in the ``public`` Postgres schema. Written only by
    ``apps/web/app/services/downloads/downloadService.ts``; no job touches it, it is
    mirrored by convention. The row outlives the account (``user_id`` is set to null).
    """

    __tablename__ = "resource_downloads"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[str] = mapped_column(Text)
    instrument: Mapped[str] = mapped_column(Text)
    product: Mapped[str] = mapped_column(Text)
    format: Mapped[str] = mapped_column(Text)
    params: Mapped[dict[str, Any]] = mapped_column(JSONB)
    object_key: Mapped[str] = mapped_column(Text)
    byte_size: Mapped[int] = mapped_column(Integer)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class HomeHero(Base):
    """The hero banner of the public home page: its Spanish ``title`` and ``lead``.
    A single row, edited from the web CMS. Mirrored by convention; no job touches it.
    """

    __tablename__ = "home_hero"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    title: Mapped[str] = mapped_column(Text)
    lead: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class HomeHeroTranslation(Base):
    """The ``title`` and ``lead`` of the `HomeHero` in a language other than Spanish."""

    __tablename__ = "home_hero_translations"
    __table_args__ = (
        UniqueConstraint(
            "home_hero_id", "locale", name="home_hero_translations_home_hero_id_locale_key"
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    home_hero_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.home_hero.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    lead: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GeomagneticIndexSource(enum.StrEnum):
    """Who wrote a geomagnetic index's current value. Mirrors the Prisma
    ``GeomagneticIndexSource`` enum, whose database values are the strings below.
    """

    MANUAL = "manual"
    AUTOMATIC = "automatic"


class GeomagneticIndex(Base):
    """One geomagnetic index card on the home page (Kp, Dst, AE, Ap).

    Edited by hand from the web CMS today. A future loading job would upsert by
    ``code``, write ``value``, ``description`` (and its translations), set
    ``source`` to ``automatic`` with ``observed_at``, and set ``updated_at`` to
    now so an editor holding an older version gets a conflict. ``position`` is
    editorial and must never be written by a job: leave it out of an insert and the
    database gives the new row the next number.
    """

    __tablename__ = "geomagnetic_indices"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    code: Mapped[str] = mapped_column(String(8), unique=True)
    value: Mapped[str] = mapped_column(String(15))
    description: Mapped[str] = mapped_column(String(15))
    # Unique; left out of an insert, it takes the next number of its sequence (Prisma's
    # `@default(autoincrement())`), so a new index lands last.
    position: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        server_default=text("nextval('geomagnetic_indices_position_seq')"),
    )
    # Postgres-specific ENUM for the same reason as `User.role`: Prisma owns the type.
    source: Mapped[GeomagneticIndexSource] = mapped_column(
        ENUM(
            GeomagneticIndexSource,
            name="geomagnetic_index_source",
            schema="public",
            create_type=False,
            values_callable=lambda members: [member.value for member in members],
        ),
        server_default=text("'manual'"),
    )
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GeomagneticIndexTranslation(Base):
    """The ``description`` of a `GeomagneticIndex` in a language other than Spanish."""

    __tablename__ = "geomagnetic_index_translations"
    __table_args__ = (
        UniqueConstraint(
            "geomagnetic_index_id",
            "locale",
            name="geomagnetic_index_translations_geomagnetic_index_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    geomagnetic_index_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.geomagnetic_indices.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    description: Mapped[str] = mapped_column(String(15))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContactChannelIcon(enum.StrEnum):
    """Icon of a `/contacto` card. Database values match the Prisma ``@map`` names."""

    PHONE = "phone"
    INSTAGRAM = "instagram"
    LOCATION = "location"
    EMAIL = "email"
    FACEBOOK = "facebook"


class ContactChannel(Base):
    """One card in the contact page's channel list. Spanish text lives here."""

    __tablename__ = "contact_channels"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    icon: Mapped[ContactChannelIcon] = mapped_column(
        ENUM(
            ContactChannelIcon,
            name="contact_channel_icon",
            schema="public",
            create_type=False,
            values_callable=lambda members: [member.value for member in members],
        )
    )
    href: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContactChannelTranslation(Base):
    """Title and description of a contact card in a language other than Spanish."""

    __tablename__ = "contact_channel_translations"
    __table_args__ = (
        UniqueConstraint(
            "contact_channel_id",
            "locale",
            name="contact_channel_translations_contact_channel_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    contact_channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.contact_channels.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SpaceWeatherSection(Base):
    """An editable text section of the space weather page, looked up by its unique ``key``
    (today only ``costa-rica``). ``title`` and ``body`` are the Spanish text; a blank line in
    ``body`` separates paragraphs. Edited from the web CMS. Mirrored by convention; no job
    touches it.
    """

    __tablename__ = "space_weather_sections"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    key: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SpaceWeatherSectionTranslation(Base):
    """The ``title`` and ``body`` of a `SpaceWeatherSection` in a language other than Spanish."""

    __tablename__ = "space_weather_section_translations"
    __table_args__ = (
        UniqueConstraint(
            "section_id",
            "locale",
            name="space_weather_section_translations_section_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.space_weather_sections.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacCharacteristic(Base):
    """One characteristic card on `/radioastronomia` (Section 1)."""

    __tablename__ = "rosac_characteristics"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    key: Mapped[str] = mapped_column(Text, unique=True)
    icon: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacActivity(Base):
    """One activity card on `/radioastronomia` (Section 3)."""

    __tablename__ = "rosac_activities"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    key: Mapped[str] = mapped_column(Text, unique=True)
    icon: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacStage(Base):
    """One construction stage on `/radioastronomia` (Section 4)."""

    __tablename__ = "rosac_stages"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    key: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    images: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacInstrument(Base):
    """One scientific instrument card on `/radioastronomia` (Section 6)."""

    __tablename__ = "rosac_instruments"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text)
    pending_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_src: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_alt: Mapped[str | None] = mapped_column(Text, nullable=True)
    consultation_href: Mapped[str | None] = mapped_column(Text, nullable=True)
    consultation_label: Mapped[str] = mapped_column(Text)
    consultation_notice: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacAcknowledgment(Base):
    """One institution acknowledgment card on `/radioastronomia` (Section 9)."""

    __tablename__ = "rosac_acknowledgments"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(Text)
    href: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_src: Mapped[str] = mapped_column(Text)
    logo_alt: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Researcher(Base):
    """A researcher profile card."""

    __tablename__ = "researchers"
    __table_args__ = {"schema": "public"}  # noqa: RUF012 -- SQLAlchemy reads this as a class var

    id: Mapped[uuid.UUID] = _uuid_pk()
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    institution: Mapped[str] = mapped_column(Text)
    email: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    modified_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="RESTRICT")
    )
    modified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResearcherTranslation(Base):
    """The ``role`` and ``description`` of a `Researcher` in a language other than Spanish."""

    __tablename__ = "researcher_translations"
    __table_args__ = (
        UniqueConstraint(
            "researcher_id",
            "locale",
            name="researcher_translations_researcher_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    researcher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.researchers.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    role: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacCharacteristicTranslation(Base):
    """The ``title`` and ``description`` of a `RosacCharacteristic` in a language
    other than Spanish.
    """

    __tablename__ = "rosac_characteristic_translations"
    __table_args__ = (
        UniqueConstraint(
            "characteristic_id",
            "locale",
            name="rosac_characteristic_translations_characteristic_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    characteristic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.rosac_characteristics.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacActivityTranslation(Base):
    """The ``title`` and ``description`` of a `RosacActivity` in a language other than Spanish."""

    __tablename__ = "rosac_activity_translations"
    __table_args__ = (
        UniqueConstraint(
            "activity_id",
            "locale",
            name="rosac_activity_translations_activity_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.rosac_activities.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacStageTranslation(Base):
    """The ``title`` and ``description`` of a `RosacStage` in a language other than Spanish."""

    __tablename__ = "rosac_stage_translations"
    __table_args__ = (
        UniqueConstraint(
            "stage_id",
            "locale",
            name="rosac_stage_translations_stage_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    stage_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.rosac_stages.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacInstrumentTranslation(Base):
    """The translatable text of a `RosacInstrument` in a language other than Spanish."""

    __tablename__ = "rosac_instrument_translations"
    __table_args__ = (
        UniqueConstraint(
            "instrument_id",
            "locale",
            name="rosac_instrument_translations_instrument_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.rosac_instruments.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    name: Mapped[str] = mapped_column(Text)
    consultation_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    consultation_notice: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RosacAcknowledgmentTranslation(Base):
    """The ``name`` of a `RosacAcknowledgment` in a language other than Spanish."""

    __tablename__ = "rosac_acknowledgment_translations"
    __table_args__ = (
        UniqueConstraint(
            "acknowledgment_id",
            "locale",
            name="rosac_acknowledgment_translations_acknowledgment_id_locale_key",
        ),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    acknowledgment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public.rosac_acknowledgments.id", ondelete="CASCADE")
    )
    locale: Mapped[str] = mapped_column(String(5))
    name: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
