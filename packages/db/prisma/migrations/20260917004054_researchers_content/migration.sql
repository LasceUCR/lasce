-- CreateTable
CREATE TABLE "researchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "photo_url" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "email" TEXT,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by" UUID NOT NULL,
    "modified_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researchers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "researchers" ADD CONSTRAINT "researchers_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
