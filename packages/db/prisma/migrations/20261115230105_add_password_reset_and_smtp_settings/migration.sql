-- Forgot password (LASCE-CON-0012-448): single-use reset tokens, the SMTP settings that send the
-- reset email, and the grant that lets administrators manage those settings.

-- CreateTable
CREATE TABLE "auth"."password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smtp_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "security" TEXT NOT NULL,
    "username" TEXT,
    "password_ciphertext" TEXT,
    "from_address" TEXT NOT NULL,
    "from_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id"),
    -- Prisma does not model CHECKs. `singleton` is always true, so its unique index allows one row.
    CONSTRAINT "smtp_settings_singleton_check" CHECK ("singleton"),
    -- Mirrors SMTP_SECURITY_MODES in apps/web/app/lib/mail-settings.ts.
    CONSTRAINT "smtp_settings_security_check" CHECK ("security" IN ('tls', 'starttls', 'none')),
    CONSTRAINT "smtp_settings_port_check" CHECK ("port" BETWEEN 1 AND 65535)
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "auth"."password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "auth"."password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "smtp_settings_singleton_key" ON "smtp_settings"("singleton");

-- AddForeignKey
ALTER TABLE "auth"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant for the Correo section. Administrators hold it by default; keep in sync with
-- DEFAULT_ROLE_PERMISSIONS in apps/web/app/lib/auth/permissions.ts.
INSERT INTO "auth"."role_permissions" ("role", "permission") VALUES
    ('admin', 'manage_email_settings')
ON CONFLICT DO NOTHING;
