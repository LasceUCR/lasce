-- Default grant (LASCE-SEC-008-073): keep in sync with DEFAULT_ROLE_PERMISSIONS.
INSERT INTO "auth"."role_permissions" ("role", "permission") VALUES
    ('admin', 'download_goes_resources')
ON CONFLICT ("role", "permission") DO NOTHING;
