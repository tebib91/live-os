-- AlterTable
ALTER TABLE "InstalledApp" ADD COLUMN "container" JSONB;
ALTER TABLE "InstalledApp" ADD COLUMN "source" TEXT;

-- CreateIndex
CREATE INDEX "InstalledApp_appId_source_idx" ON "InstalledApp"("appId", "source");
