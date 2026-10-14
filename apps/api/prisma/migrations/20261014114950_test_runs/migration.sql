-- CreateEnum
CREATE TYPE "run_state" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "run_case_status" AS ENUM ('passed', 'failed', 'blocked', 'skipped', 'untested');

-- CreateTable
CREATE TABLE "test_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "environment" TEXT NOT NULL DEFAULT '',
    "release_id" UUID,
    "state" "run_state" NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMPTZ(3),
    "closed_by_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_cases" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL DEFAULT '',
    "steps" JSONB NOT NULL,
    "suite_path" TEXT NOT NULL DEFAULT '',
    "priority" "case_priority" NOT NULL,
    "type" "case_type" NOT NULL,
    "case_status" "case_status" NOT NULL,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revision" INTEGER NOT NULL,
    "assignee_id" TEXT,
    "status" "run_case_status" NOT NULL DEFAULT 'untested',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "run_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" UUID NOT NULL,
    "run_case_id" UUID NOT NULL,
    "status" "run_case_status" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "failed_step" INTEGER,
    "revision" INTEGER NOT NULL,
    "recorded_by_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_runs_project_id_state_updated_at_idx" ON "test_runs"("project_id", "state", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "test_runs_release_id_idx" ON "test_runs"("release_id");

-- CreateIndex
CREATE INDEX "test_runs_created_by_id_idx" ON "test_runs"("created_by_id");

-- CreateIndex
CREATE INDEX "test_runs_closed_by_id_idx" ON "test_runs"("closed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_runs_project_id_number_key" ON "test_runs"("project_id", "number");

-- CreateIndex
CREATE INDEX "run_cases_run_id_position_idx" ON "run_cases"("run_id", "position");

-- CreateIndex
CREATE INDEX "run_cases_run_id_status_idx" ON "run_cases"("run_id", "status");

-- CreateIndex
CREATE INDEX "run_cases_case_id_idx" ON "run_cases"("case_id");

-- CreateIndex
CREATE INDEX "run_cases_assignee_id_idx" ON "run_cases"("assignee_id");

-- CreateIndex
CREATE UNIQUE INDEX "run_cases_run_id_case_id_key" ON "run_cases"("run_id", "case_id");

-- CreateIndex
CREATE INDEX "test_results_run_case_id_recorded_at_idx" ON "test_results"("run_case_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "test_results_recorded_by_id_idx" ON "test_results"("recorded_by_id");

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_cases" ADD CONSTRAINT "run_cases_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "test_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_cases" ADD CONSTRAINT "run_cases_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_cases" ADD CONSTRAINT "run_cases_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_run_case_id_fkey" FOREIGN KEY ("run_case_id") REFERENCES "run_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written guards (not expressible in the Prisma schema).
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_number_positive" CHECK ("number" > 0);
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_closed_consistent"
  CHECK (("state" = 'closed') = ("closed_at" IS NOT NULL));
ALTER TABLE "run_cases" ADD CONSTRAINT "run_cases_steps_array" CHECK (jsonb_typeof("steps") = 'array');
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_failed_step"
  CHECK ("failed_step" IS NULL OR ("failed_step" > 0 AND "status" IN ('failed', 'blocked')));
