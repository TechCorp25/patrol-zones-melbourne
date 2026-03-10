ALTER TABLE "code21_requests" ADD COLUMN IF NOT EXISTS "vehicle_model" text NOT NULL DEFAULT '';
ALTER TABLE "code21_requests" ADD COLUMN IF NOT EXISTS "officer_notes" text NOT NULL DEFAULT '[]';
ALTER TABLE "code21_requests" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'in_progress';
