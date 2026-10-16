-- CreateEnum
CREATE TYPE "contact_channel_icon" AS ENUM ('phone', 'instagram', 'location', 'email', 'facebook');

-- CreateTable
CREATE TABLE "contact_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "icon" "contact_channel_icon" NOT NULL,
    "href" TEXT,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_channel_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_channel_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_channel_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_channels_position_idx" ON "contact_channels"("position");

-- CreateIndex
CREATE UNIQUE INDEX "contact_channel_translations_contact_channel_id_locale_key" ON "contact_channel_translations"("contact_channel_id", "locale");

-- AddForeignKey
ALTER TABLE "contact_channel_translations" ADD CONSTRAINT "contact_channel_translations_contact_channel_id_fkey" FOREIGN KEY ("contact_channel_id") REFERENCES "contact_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The two cards /contacto already showed. Spanish lives on the base row.
INSERT INTO "contact_channels" ("id", "icon", "href", "position", "title", "description") VALUES
    ('6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e01', 'phone', NULL, 0, 'Teléfono', '2511-6566'),
    ('6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e02', 'instagram', 'https://www.instagram.com/lasce_ucr/', 1, 'Instagram', '@lasce_ucr');

INSERT INTO "contact_channel_translations" ("contact_channel_id", "locale", "title", "description") VALUES
    ('6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e01', 'en', 'Phone', '2511-6566'),
    ('6c8e1a20-7b4d-4e1a-9c3f-1a2b3c4d5e02', 'en', 'Instagram', '@lasce_ucr');
