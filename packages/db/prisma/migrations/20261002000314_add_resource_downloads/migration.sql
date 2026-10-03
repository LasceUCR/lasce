-- CreateTable
CREATE TABLE "resource_downloads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "source" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "object_key" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "row_count" INTEGER,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_downloads_user_id_created_at_idx" ON "resource_downloads"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "resource_downloads_source_instrument_created_at_idx" ON "resource_downloads"("source", "instrument", "created_at");

-- AddForeignKey
ALTER TABLE "resource_downloads" ADD CONSTRAINT "resource_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
