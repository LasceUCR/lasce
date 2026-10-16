"""Sanity checks for the SQLAlchemy mirror of the Prisma schema.

Even though the worker doesn't have a job using these tables yet, the convention
is to replicate everything here so the two languages never disagree about a column.
"""

from sqlalchemy import UniqueConstraint

from app.db import (
    Collaboration,
    CollaborationScope,
    CollaborationTranslation,
    ContactChannel,
    ContactChannelTranslation,
    ExisFile,
    GalleryAlbum,
    GalleryMedia,
    MagFile,
    GeomagneticIndex,
    GeomagneticIndexSource,
    GeomagneticIndexTranslation,
    HomeHero,
    HomeHeroTranslation,
    News,
    NewsAuthor,
    NewsCrossAuthor,
    NewsSource,
    Publisher,
    Research,
    ResearchAuthor,
    ResearchCrossAuthor,
    ResearchTranslation,
    ResourceDownload,
    RolePermission,
    SuviFrame,
    User,
    UserRole,
    UserSession,
)


def test_collaboration_classification_and_defaults_match_prisma() -> None:
    columns = Collaboration.__table__.columns
    assert Collaboration.__table__.schema == "research"
    assert columns["acronym"].nullable
    assert not columns["country"].nullable
    assert columns["id"].server_default is not None
    assert columns["updated_at"].server_default is not None
    assert [member.value for member in CollaborationScope] == ["national", "international"]
    assert columns["scope"].type.enums == ["national", "international"]
    assert columns["scope"].type.schema == "research"
    assert columns["scope"].type.create_type is False


def test_collaboration_translations_are_owned_by_one_record_per_locale() -> None:
    columns = CollaborationTranslation.__table__.columns
    (parent_fk,) = columns["collaboration_id"].foreign_keys
    assert CollaborationTranslation.__table__.schema == "research"
    assert parent_fk.target_fullname == "research.collaborations.id"
    assert parent_fk.ondelete == "CASCADE"
    assert columns["locale"].type.length == 5
    assert not columns["country"].nullable
    assert any(
        {column.name for column in constraint.columns} == {"collaboration_id", "locale"}
        for constraint in CollaborationTranslation.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    )


def test_research_tables_live_in_the_research_schema() -> None:
    for model in (Publisher, Research, ResearchAuthor, ResearchCrossAuthor, ResearchTranslation):
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


def test_research_translation_matches_the_prisma_columns() -> None:
    columns = ResearchTranslation.__table__.columns
    (research_fk,) = columns["research_id"].foreign_keys

    assert set(columns.keys()) == {
        "id",
        "research_id",
        "locale",
        "title",
        "abstract",
        "created_at",
        "updated_at",
    }
    assert research_fk.target_fullname == "research.research_records.id"
    assert research_fk.ondelete == "CASCADE"
    assert columns["locale"].type.length == 5
    assert any(
        {column.name for column in constraint.columns} == {"research_id", "locale"}
        for constraint in ResearchTranslation.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    )


def test_research_cross_author_links_research_and_authors() -> None:
    columns = ResearchCrossAuthor.__table__.columns
    (research_fk,) = columns["research_id"].foreign_keys
    (author_fk,) = columns["research_author_id"].foreign_keys

    assert research_fk.target_fullname == "research.research_records.id"
    assert author_fk.target_fullname == "research.research_authors.id"


def test_research_belongs_to_a_publisher() -> None:
    (publisher_fk,) = Research.__table__.columns["publisher_id"].foreign_keys
    assert publisher_fk.target_fullname == "research.publishers.id"


"""Sanity checks for the SQLAlchemy mirror of the Prisma `news` schema.

Even though the worker doesn't have a job using this yet, the convention is to
replicate everything here.
"""


def test_news_tables_live_in_the_news_schema() -> None:
    for model in (NewsSource, News, NewsAuthor, NewsCrossAuthor):
        assert model.__table__.schema == "news"


def test_news_record_matches_the_prisma_columns() -> None:
    columns = News.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "title",
        "published_at",
        "source_id",
        "abstract",
        "external_url",
        "created_at",
        "updated_at",
    }
    assert columns["external_url"].unique
    assert columns["published_at"].nullable
    assert not columns["title"].nullable


def test_news_cross_author_links_news_and_authors() -> None:
    columns = NewsCrossAuthor.__table__.columns
    (news_fk,) = columns["news_id"].foreign_keys
    (author_fk,) = columns["news_author_id"].foreign_keys

    assert news_fk.target_fullname == "news.news_records.id"
    assert author_fk.target_fullname == "news.news_authors.id"


def test_news_belongs_to_a_source() -> None:
    (source_fk,) = News.__table__.columns["source_id"].foreign_keys
    assert source_fk.target_fullname == "news.news_sources.id"


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


def test_gallery_tables_live_in_the_gallery_schema() -> None:
    for model in (GalleryAlbum, GalleryMedia):
        assert model.__table__.schema == "gallery"


def test_gallery_album_matches_the_prisma_columns() -> None:
    columns = GalleryAlbum.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "slug",
        "title",
        "description",
        "years_label",
        "parent_album_id",
        "cover_object_key",
        "created_at",
        "updated_at",
    }
    assert columns["slug"].unique
    assert columns["parent_album_id"].nullable
    assert columns["years_label"].nullable
    assert columns["cover_object_key"].nullable
    assert not columns["title"].nullable


def test_gallery_album_can_nest_under_another_album() -> None:
    (parent_fk,) = GalleryAlbum.__table__.columns["parent_album_id"].foreign_keys

    assert parent_fk.target_fullname == "gallery.gallery_albums.id"
    assert parent_fk.ondelete == "CASCADE"


def test_gallery_media_matches_the_prisma_columns() -> None:
    columns = GalleryMedia.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "album_id",
        "title",
        "description",
        "alt_text",
        "object_key",
        "format",
        "is_video",
        "col_span",
        "row_span",
        "captured_at",
        "uploader_name",
        "position",
        "created_at",
        "updated_at",
    }
    assert columns["object_key"].unique
    assert not columns["alt_text"].nullable
    assert not columns["title"].nullable


def test_gallery_media_belongs_to_an_album_and_dies_with_it() -> None:
    (album_fk,) = GalleryMedia.__table__.columns["album_id"].foreign_keys

    assert album_fk.target_fullname == "gallery.gallery_albums.id"
    assert album_fk.ondelete == "CASCADE"


def test_role_permissions_live_in_the_auth_schema() -> None:
    assert RolePermission.__table__.schema == "auth"


def test_role_permission_matches_the_prisma_columns() -> None:
    columns = RolePermission.__table__.columns

    assert set(columns.keys()) == {"id", "role", "permission", "created_at"}
    assert not columns["role"].nullable
    assert not columns["permission"].nullable
    assert columns["role"].type.enums == ["visitor", "assistant", "admin"]
    assert columns["role"].type.name == "user_role"
    assert columns["role"].type.schema == "auth"
    assert columns["role"].type.create_type is False


def test_role_permission_is_unique_per_role_and_permission() -> None:
    constraint_names = {constraint.name for constraint in RolePermission.__table__.constraints}
    assert "role_permissions_role_permission_key" in constraint_names


def test_suvi_frames_live_in_the_solar_schema() -> None:
    assert SuviFrame.__table__.schema == "solar"


def test_suvi_frame_matches_the_prisma_columns() -> None:
    columns = SuviFrame.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "observed_at",
        "wavelength",
        "satellite",
        "channel",
        "file_name",
        "source_url",
        "exposure_time",
        "sun_center_x",
        "sun_center_y",
        "sun_radius_px",
        "quality_flag",
        "raw_header",
        "preview_file",
        "created_at",
        "updated_at",
    }
    assert columns["file_name"].unique
    assert not columns["wavelength"].nullable
    assert not columns["satellite"].nullable
    assert columns["exposure_time"].nullable
    assert columns["preview_file"].nullable


def test_suvi_frame_is_unique_per_satellite_channel_and_observed_at() -> None:
    constraint_names = {constraint.name for constraint in SuviFrame.__table__.constraints}
    assert "suvi_frames_satellite_channel_observed_at_key" in constraint_names


def test_exis_files_live_in_the_solar_schema() -> None:
    assert ExisFile.__table__.schema == "solar"


def test_exis_file_matches_the_prisma_columns() -> None:
    columns = ExisFile.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "satellite",
        "product",
        "day",
        "file_name",
        "version",
        "source_url",
        "source_modified_at",
        "first_observed_at",
        "last_observed_at",
        "point_count",
        "attributes",
        "created_at",
        "updated_at",
    }
    assert columns["file_name"].unique
    assert not columns["day"].nullable
    assert columns["source_modified_at"].nullable
    assert columns["first_observed_at"].nullable


def test_exis_file_is_unique_per_satellite_product_and_day() -> None:
    constraint_names = {constraint.name for constraint in ExisFile.__table__.constraints}
    assert "exis_files_satellite_product_day_key" in constraint_names


def test_mag_files_live_in_the_solar_schema() -> None:
    assert MagFile.__table__.schema == "solar"


def test_mag_file_matches_the_prisma_columns() -> None:
    columns = MagFile.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "satellite",
        "product",
        "day",
        "file_name",
        "version",
        "source_url",
        "source_modified_at",
        "first_observed_at",
        "last_observed_at",
        "point_count",
        "attributes",
        "created_at",
        "updated_at",
    }
    assert columns["file_name"].unique
    assert not columns["day"].nullable
    assert columns["source_modified_at"].nullable
    assert columns["first_observed_at"].nullable


def test_mag_file_is_unique_per_satellite_product_and_day() -> None:
    constraint_names = {constraint.name for constraint in MagFile.__table__.constraints}
    assert "mag_files_satellite_product_day_key" in constraint_names


def test_resource_downloads_live_in_the_public_schema() -> None:
    assert ResourceDownload.__table__.schema == "public"


def test_resource_download_matches_the_prisma_columns() -> None:
    columns = ResourceDownload.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "user_id",
        "source",
        "instrument",
        "product",
        "format",
        "params",
        "object_key",
        "byte_size",
        "row_count",
        "expires_at",
        "created_at",
    }
    assert columns["user_id"].nullable
    assert columns["row_count"].nullable
    assert not columns["object_key"].nullable


def test_contact_channels_live_in_the_public_schema() -> None:
    assert ContactChannel.__table__.schema == "public"
    assert ContactChannelTranslation.__table__.schema == "public"


def test_contact_channel_matches_the_prisma_columns() -> None:
    columns = ContactChannel.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "icon",
        "href",
        "position",
        "title",
        "description",
        "created_at",
        "updated_at",
    }
    assert columns["href"].nullable
    assert not columns["title"].nullable


def test_contact_channel_translation_cascades_with_its_channel() -> None:
    (channel_fk,) = ContactChannelTranslation.__table__.columns["contact_channel_id"].foreign_keys

    assert channel_fk.target_fullname == "public.contact_channels.id"
    assert channel_fk.ondelete == "CASCADE"


def test_resource_download_outlives_its_user() -> None:
    (user_fk,) = ResourceDownload.__table__.columns["user_id"].foreign_keys

    assert user_fk.target_fullname == "auth.users.id"
    assert user_fk.ondelete == "SET NULL"


def test_home_tables_live_in_the_public_schema() -> None:
    for model in (HomeHero, HomeHeroTranslation, GeomagneticIndex, GeomagneticIndexTranslation):
        assert model.__table__.schema == "public"


def test_home_hero_matches_the_prisma_columns() -> None:
    assert set(HomeHero.__table__.columns.keys()) == {
        "id",
        "title",
        "lead",
        "created_at",
        "updated_at",
    }


def test_home_hero_translation_is_unique_per_hero_and_locale() -> None:
    columns = HomeHeroTranslation.__table__.columns
    (hero_fk,) = columns["home_hero_id"].foreign_keys

    assert set(columns.keys()) == {
        "id",
        "home_hero_id",
        "locale",
        "title",
        "lead",
        "created_at",
        "updated_at",
    }
    assert hero_fk.target_fullname == "public.home_hero.id"
    assert hero_fk.ondelete == "CASCADE"
    assert columns["locale"].type.length == 5
    assert any(
        {column.name for column in constraint.columns} == {"home_hero_id", "locale"}
        for constraint in HomeHeroTranslation.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    )


def test_geomagnetic_index_matches_the_prisma_columns() -> None:
    columns = GeomagneticIndex.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "code",
        "value",
        "description",
        "position",
        "source",
        "observed_at",
        "created_at",
        "updated_at",
    }
    assert columns["code"].unique
    assert columns["position"].unique
    assert columns["position"].server_default is not None
    assert "geomagnetic_indices_position_seq" in str(columns["position"].server_default.arg)
    assert columns["code"].type.length == 8
    assert columns["value"].type.length == 15
    assert columns["description"].type.length == 15
    assert columns["observed_at"].nullable


def test_geomagnetic_index_source_mirrors_the_prisma_enum() -> None:
    source = GeomagneticIndex.__table__.columns["source"]

    assert [member.value for member in GeomagneticIndexSource] == ["manual", "automatic"]
    assert source.type.enums == ["manual", "automatic"]
    assert source.type.name == "geomagnetic_index_source"
    assert source.type.schema == "public"
    assert source.type.create_type is False
    assert source.server_default is not None
    assert str(source.server_default.arg) == "'manual'"


def test_geomagnetic_index_translation_is_unique_per_index_and_locale() -> None:
    columns = GeomagneticIndexTranslation.__table__.columns
    (index_fk,) = columns["geomagnetic_index_id"].foreign_keys

    assert set(columns.keys()) == {
        "id",
        "geomagnetic_index_id",
        "locale",
        "description",
        "created_at",
        "updated_at",
    }
    assert index_fk.target_fullname == "public.geomagnetic_indices.id"
    assert index_fk.ondelete == "CASCADE"
    assert columns["description"].type.length == 15
    assert any(
        {column.name for column in constraint.columns} == {"geomagnetic_index_id", "locale"}
        for constraint in GeomagneticIndexTranslation.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    )
