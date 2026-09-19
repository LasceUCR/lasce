-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "areas";

-- CreateTable
CREATE TABLE "areas"."research_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "src" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_areas_pkey" PRIMARY KEY ("id")
);
