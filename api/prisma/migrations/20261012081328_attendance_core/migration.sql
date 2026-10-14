-- Attendance void / auto-close fields + extra reject reasons

ALTER TYPE "AttendanceResult" ADD VALUE 'REJECTED_OUTSIDE_SESSION';
ALTER TYPE "AttendanceResult" ADD VALUE 'REJECTED_ALREADY_INSIDE';
ALTER TYPE "AttendanceResult" ADD VALUE 'REJECTED_ARCHIVED';
ALTER TYPE "AttendanceResult" ADD VALUE 'REJECTED_NOT_STARTED';

ALTER TABLE "Attendance" ADD COLUMN "closedAutomatically" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "voidReason" TEXT,
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedById" TEXT;

CREATE INDEX "Attendance_checkOutAt_idx" ON "Attendance"("checkOutAt");

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
