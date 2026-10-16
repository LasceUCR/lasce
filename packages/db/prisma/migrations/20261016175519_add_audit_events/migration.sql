-- The audit trail behind the administration summary's "Actividad reciente" (LASCE-CON-012-151).
-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id"),
    -- Mirrors AUDIT_ACTOR_TYPES in apps/web/app/lib/audit-log.ts; Prisma does not model CHECKs.
    CONSTRAINT "audit_events_actor_type_check" CHECK ("actor_type" IN ('user', 'system', 'worker'))
);

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_created_at_idx" ON "audit_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_created_at_idx" ON "audit_events"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
