-- Grant for the Descargas section (LASCE-ADM-001-378). Administrators hold it by default; keep in
-- sync with DEFAULT_ROLE_PERMISSIONS. `download_resources` no longer opens the section, because
-- every role holds it.
INSERT INTO "auth"."role_permissions" ("role", "permission") VALUES
    ('admin', 'view_download_history')
ON CONFLICT DO NOTHING;
