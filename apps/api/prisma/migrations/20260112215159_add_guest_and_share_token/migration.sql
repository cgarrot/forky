ALTER TABLE "users" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects" ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "projects_shareToken_key" ON "projects"("shareToken");
