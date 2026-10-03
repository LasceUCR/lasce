-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "solar";

-- CreateTable
CREATE TABLE "solar"."suvi_frames" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "wavelength" DOUBLE PRECISION NOT NULL,
    "satellite" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "exposure_time" DOUBLE PRECISION,
    "sun_center_x" DOUBLE PRECISION,
    "sun_center_y" DOUBLE PRECISION,
    "sun_radius_px" DOUBLE PRECISION,
    "quality_flag" INTEGER NOT NULL DEFAULT 0,
    "raw_header" JSONB NOT NULL,
    "block_file" TEXT,
    "block_offset" BIGINT,
    "block_size" INTEGER,
    "is_keyframe" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suvi_frames_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suvi_frames_file_name_key" ON "solar"."suvi_frames"("file_name");

-- CreateIndex
CREATE INDEX "suvi_frames_observed_at_idx" ON "solar"."suvi_frames"("observed_at");

-- CreateIndex
CREATE UNIQUE INDEX "suvi_frames_satellite_channel_observed_at_key" ON "solar"."suvi_frames"("satellite", "channel", "observed_at");
