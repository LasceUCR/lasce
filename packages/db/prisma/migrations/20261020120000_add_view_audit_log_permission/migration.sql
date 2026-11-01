-- Grant for the Auditoría section (LASCE-ADM-001-380). Administrators hold it by default; keep in
-- sync with DEFAULT_ROLE_PERMISSIONS.
INSERT INTO "auth"."role_permissions" ("role", "permission") VALUES
    ('admin', 'view_audit_log')
ON CONFLICT DO NOTHING;
