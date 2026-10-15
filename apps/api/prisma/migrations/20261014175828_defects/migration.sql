-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('new', 'open', 'in_progress', 'fixed', 'reopened', 'closed', 'rejected');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('critical', 'major', 'minor', 'trivial');

-- CreateEnum
CREATE TYPE "DefectPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "Reproducibility" AS ENUM ('always', 'intermittent', 'once');

-- CreateEnum
CREATE TYPE "DetectedIn" AS ENUM ('qa', 'uat', 'production');

-- CreateEnum
CREATE TYPE "Resolution" AS ENUM ('duplicate', 'cannot_reproduce', 'works_as_designed', 'not_a_defect', 'wont_fix');

-- CreateEnum
CREATE TYPE "DefectSource" AS ENUM ('result', 'manual');

-- CreateEnum
CREATE TYPE "DefectLinkKind" AS ENUM ('failed', 'blocked', 'passed');

-- CreateTable
CREATE TABLE "defects" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "steps" TEXT NOT NULL,
    "expected" TEXT NOT NULL DEFAULT '',
    "actual" TEXT NOT NULL,
    "status" "DefectStatus" NOT NULL DEFAULT 'new',
    "severity" "Severity" NOT NULL,
    "priority" "DefectPriority",
    "reproducibility" "Reproducibility" NOT NULL DEFAULT 'always',
    "detected_in" "DetectedIn" NOT NULL DEFAULT 'qa',
    "environment" TEXT NOT NULL DEFAULT '',
    "source" "DefectSource" NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "developer" TEXT NOT NULL DEFAULT '',
    "tracker_url" TEXT NOT NULL DEFAULT '',
    "case_id" UUID,
    "found_in_run_id" UUID,
    "found_in_release_id" UUID,
    "fixed_in_release_id" UUID,
    "fixed_in_build" TEXT NOT NULL DEFAULT '',
    "resolution" "Resolution",
    "duplicate_of_id" UUID,
    "reopen_count" INTEGER NOT NULL DEFAULT 0,
    "opened_at" TIMESTAMPTZ(3),
    "fixed_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_status_changes" (
    "id" UUID NOT NULL,
    "defect_id" UUID NOT NULL,
    "from_status" "DefectStatus",
    "to_status" "DefectStatus" NOT NULL,
    "resolution" "Resolution",
    "note" TEXT NOT NULL DEFAULT '',
    "actor_id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_comments" (
    "id" UUID NOT NULL,
    "defect_id" UUID NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_result_links" (
    "id" UUID NOT NULL,
    "defect_id" UUID NOT NULL,
    "result_id" UUID NOT NULL,
    "run_case_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" "DefectLinkKind" NOT NULL,
    "linked_by_id" TEXT NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_result_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defects_project_id_status_updated_at_idx" ON "defects"("project_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "defects_project_id_severity_idx" ON "defects"("project_id", "severity");

-- CreateIndex
CREATE INDEX "defects_reporter_id_idx" ON "defects"("reporter_id");

-- CreateIndex
CREATE INDEX "defects_assignee_id_idx" ON "defects"("assignee_id");

-- CreateIndex
CREATE INDEX "defects_case_id_idx" ON "defects"("case_id");

-- CreateIndex
CREATE INDEX "defects_found_in_run_id_idx" ON "defects"("found_in_run_id");

-- CreateIndex
CREATE INDEX "defects_found_in_release_id_idx" ON "defects"("found_in_release_id");

-- CreateIndex
CREATE INDEX "defects_fixed_in_release_id_idx" ON "defects"("fixed_in_release_id");

-- CreateIndex
CREATE INDEX "defects_duplicate_of_id_idx" ON "defects"("duplicate_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "defects_project_id_number_key" ON "defects"("project_id", "number");

-- CreateIndex
CREATE INDEX "defect_status_changes_defect_id_at_idx" ON "defect_status_changes"("defect_id", "at");

-- CreateIndex
CREATE INDEX "defect_status_changes_actor_id_idx" ON "defect_status_changes"("actor_id");

-- CreateIndex
CREATE INDEX "defect_comments_defect_id_created_at_idx" ON "defect_comments"("defect_id", "created_at");

-- CreateIndex
CREATE INDEX "defect_comments_author_id_idx" ON "defect_comments"("author_id");

-- CreateIndex
CREATE INDEX "defect_result_links_result_id_idx" ON "defect_result_links"("result_id");

-- CreateIndex
CREATE INDEX "defect_result_links_run_case_id_idx" ON "defect_result_links"("run_case_id");

-- CreateIndex
CREATE INDEX "defect_result_links_run_id_idx" ON "defect_result_links"("run_id");

-- CreateIndex
CREATE INDEX "defect_result_links_case_id_idx" ON "defect_result_links"("case_id");

-- CreateIndex
CREATE INDEX "defect_result_links_linked_by_id_idx" ON "defect_result_links"("linked_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "defect_result_links_defect_id_result_id_key" ON "defect_result_links"("defect_id", "result_id");

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_found_in_run_id_fkey" FOREIGN KEY ("found_in_run_id") REFERENCES "test_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_found_in_release_id_fkey" FOREIGN KEY ("found_in_release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_fixed_in_release_id_fkey" FOREIGN KEY ("fixed_in_release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_status_changes" ADD CONSTRAINT "defect_status_changes_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_status_changes" ADD CONSTRAINT "defect_status_changes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_comments" ADD CONSTRAINT "defect_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_result_links" ADD CONSTRAINT "defect_result_links_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_result_links" ADD CONSTRAINT "defect_result_links_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "test_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_result_links" ADD CONSTRAINT "defect_result_links_run_case_id_fkey" FOREIGN KEY ("run_case_id") REFERENCES "run_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_result_links" ADD CONSTRAINT "defect_result_links_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "test_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_result_links" ADD CONSTRAINT "defect_result_links_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_result_links" ADD CONSTRAINT "defect_result_links_linked_by_id_fkey" FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written guards (not expressible in the Prisma schema).
ALTER TABLE "defects" ADD CONSTRAINT "defects_number_positive" CHECK ("number" > 0);
-- A rejection always says why; only a rejection has a reason.
ALTER TABLE "defects" ADD CONSTRAINT "defects_resolution_when_rejected"
  CHECK (("status" = 'rejected') = ("resolution" IS NOT NULL));
ALTER TABLE "defects" ADD CONSTRAINT "defects_duplicate_of"
  CHECK (("resolution" = 'duplicate') = ("duplicate_of_id" IS NOT NULL) AND "duplicate_of_id" IS DISTINCT FROM "id");
ALTER TABLE "defects" ADD CONSTRAINT "defects_reopen_count" CHECK ("reopen_count" >= 0);
-- A logged-from-result defect remembers its run.
ALTER TABLE "defects" ADD CONSTRAINT "defects_source_run"
  CHECK (("source" = 'result') = ("found_in_run_id" IS NOT NULL));
