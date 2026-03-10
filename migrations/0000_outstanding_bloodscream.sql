CREATE TABLE "code21_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_number" text NOT NULL,
	"service_request_number" text DEFAULT '' NOT NULL,
	"address_label" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"request_time" text NOT NULL,
	"offence_date" text DEFAULT '' NOT NULL,
	"offence_time" text DEFAULT '' NOT NULL,
	"offence_type" text DEFAULT '621 - Stopped in no parking' NOT NULL,
	"code21_type" text NOT NULL,
	"dispatch_notes" text NOT NULL,
	"attendance_notes" text NOT NULL,
	"pin" text DEFAULT '' NOT NULL,
	"vehicle_make" text DEFAULT '' NOT NULL,
	"vehicle_colour" text DEFAULT '' NOT NULL,
	"vehicle_rego" text DEFAULT '' NOT NULL,
	"travel_mode" text NOT NULL,
	"description" text NOT NULL,
	"formatted_document" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
