-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "research";

-- CreateTable
CREATE TABLE "research"."publishers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research"."research_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "publication_date" DATE NOT NULL,
    "publisher_id" UUID NOT NULL,
    "abstract" TEXT NOT NULL,
    "external_url" TEXT NOT NULL,
    "doi" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research"."research_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research"."research_cross_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "research_id" UUID NOT NULL,
    "research_author_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "research_cross_authors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publishers_name_key" ON "research"."publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "research_records_external_url_key" ON "research"."research_records"("external_url");

-- CreateIndex
CREATE UNIQUE INDEX "research_records_doi_key" ON "research"."research_records"("doi");

-- CreateIndex
CREATE INDEX "research_records_publication_date_idx" ON "research"."research_records"("publication_date");

-- CreateIndex
CREATE UNIQUE INDEX "research_authors_name_key" ON "research"."research_authors"("name");

-- CreateIndex
CREATE INDEX "research_cross_authors_research_id_position_idx" ON "research"."research_cross_authors"("research_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "research_cross_authors_research_id_research_author_id_key" ON "research"."research_cross_authors"("research_id", "research_author_id");

-- AddForeignKey
ALTER TABLE "research"."research_records" ADD CONSTRAINT "research_records_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "research"."publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research"."research_cross_authors" ADD CONSTRAINT "research_cross_authors_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research"."research_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research"."research_cross_authors" ADD CONSTRAINT "research_cross_authors_research_author_id_fkey" FOREIGN KEY ("research_author_id") REFERENCES "research"."research_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
