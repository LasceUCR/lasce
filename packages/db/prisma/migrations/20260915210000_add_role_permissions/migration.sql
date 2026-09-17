-- CreateTable
CREATE TABLE "auth"."role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role" "auth"."user_role" NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_key" ON "auth"."role_permissions"("role", "permission");

-- Default matrix (LASCE-SEC-008-073): keep in sync with DEFAULT_ROLE_PERMISSIONS.
INSERT INTO "auth"."role_permissions" ("role", "permission") VALUES
    ('visitor', 'download_resources'),
    ('assistant', 'edit_components'),
    ('assistant', 'download_resources'),
    ('admin', 'create_components'),
    ('admin', 'edit_components'),
    ('admin', 'delete_components'),
    ('admin', 'download_resources'),
    ('admin', 'manage_users'),
    ('admin', 'manage_permissions');
