-- Scientific tools on /herramientas-cientificas and their translations, managed in Modo edición.
-- Creates the tables only: no tool is inserted, so the page shows its empty state until an
-- editor adds one.

-- CreateTable
CREATE TABLE "public"."scientific_tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "access_url" TEXT NOT NULL,
    "image_url" TEXT,
    "position" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scientific_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scientific_tool_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scientific_tool_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scientific_tool_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scientific_tools_position_key" ON "public"."scientific_tools"("position");

-- CreateIndex
CREATE UNIQUE INDEX "scientific_tool_translations_scientific_tool_id_locale_key" ON "public"."scientific_tool_translations"("scientific_tool_id", "locale");

-- AddForeignKey
ALTER TABLE "public"."scientific_tool_translations" ADD CONSTRAINT "scientific_tool_translations_scientific_tool_id_fkey" FOREIGN KEY ("scientific_tool_id") REFERENCES "public"."scientific_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
