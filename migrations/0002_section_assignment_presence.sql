CREATE TABLE IF NOT EXISTS "section_assignments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "section_id" varchar NOT NULL,
  "officer_user_id" varchar NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "ended_at" timestamptz,
  "assigned_by_user_id" varchar,
  "ended_by_user_id" varchar,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_section_active_assignment"
  ON "section_assignments" ("section_id")
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "idx_assignment_officer_active"
  ON "section_assignments" ("officer_user_id", "status");

CREATE TABLE IF NOT EXISTS "user_presence" (
  "user_id" varchar PRIMARY KEY,
  "is_online" boolean NOT NULL DEFAULT false,
  "session_id" varchar,
  "connected_at" timestamptz,
  "last_seen_at" timestamptz,
  "offline_at" timestamptz,
  "client_type" varchar(30),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_presence_online"
  ON "user_presence" ("is_online");
