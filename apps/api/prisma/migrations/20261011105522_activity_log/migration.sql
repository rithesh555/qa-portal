-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL,
    "actor_id" TEXT NOT NULL,
    "project_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_log_actor_id_created_at_idx" ON "activity_log"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_log_project_id_created_at_idx" ON "activity_log"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_created_at_idx" ON "activity_log"("entity_type", "entity_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 2 access model: the only portal roles are "admin" and "user".
-- Project roles (lead/tester/viewer) move to project memberships.
UPDATE "users"
SET "role" = CASE
  WHEN 'admin' = ANY (string_to_array(replace(COALESCE("role", ''), ' ', ''), ',')) THEN 'admin'
  ELSE 'user'
END
WHERE "role" IS DISTINCT FROM 'admin' AND "role" IS DISTINCT FROM 'user';
