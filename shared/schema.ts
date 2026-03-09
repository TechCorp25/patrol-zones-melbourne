import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { CODE21_TYPES } from "../constants/offenceTypes";

export const ALLOWED_EMAIL_DOMAIN = "melbourne.vic.gov.au";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  officerNumber: text("officer_number").notNull().unique(),
  password: text("password").notNull(),
});

export const registerUserSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      (val) => val.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`),
      { message: `Email must end with @${ALLOWED_EMAIL_DOMAIN}` },
    ),
  officerNumber: z
    .string()
    .min(1, "Officer number is required")
    .max(32, "Officer number too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(256),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  officerNumber: z.string().min(1).max(32),
  password: z.string().min(1).max(256),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const code21Requests = pgTable("code21_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  officerNumber: text("officer_number").notNull(),
  serviceRequestNumber: text("service_request_number").notNull().default(""),
  addressLabel: text("address_label").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  requestTime: text("request_time").notNull(),
  offenceDate: text("offence_date").notNull().default(""),
  offenceTime: text("offence_time").notNull().default(""),
  offenceType: text("offence_type").notNull().default("621 - Stopped in no parking"),
  code21Type: text("code21_type").notNull(),
  dispatchNotes: text("dispatch_notes").notNull(),
  attendanceNotes: text("attendance_notes").notNull(),
  pin: text("pin").notNull().default(""),
  vehicleMake: text("vehicle_make").notNull().default(""),
  vehicleModel: text("vehicle_model").notNull().default(""),
  vehicleColour: text("vehicle_colour").notNull().default(""),
  vehicleRego: text("vehicle_rego").notNull().default(""),
  travelMode: text("travel_mode").notNull(),
  description: text("description").notNull(),
  formattedDocument: text("formatted_document").notNull().default(""),
  status: text("status").notNull().default("in_progress"),
  officerNotes: text("officer_notes").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
});

export const insertCode21RequestSchema = createInsertSchema(code21Requests)
  .omit({ id: true, createdAt: true })
  .extend({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    requestTime: z.string().datetime(),
    offenceDate: z.string().optional().default(""),
    offenceTime: z.string().optional().default(""),
    offenceType: z.union([z.enum([...CODE21_TYPES] as [string, ...string[]]), z.literal("")]).default(""),
    code21Type: z.union([z.enum([...CODE21_TYPES] as [string, ...string[]]), z.literal("")]).default(""),
    serviceRequestNumber: z.string().optional().default(""),
    pin: z.string().optional().default(""),
    vehicleMake: z.string().optional().default(""),
    vehicleModel: z.string().optional().default(""),
    vehicleColour: z.string().optional().default(""),
    vehicleRego: z.string().optional().default(""),
    formattedDocument: z.string().optional().default(""),
    travelMode: z.enum(["foot", "vehicle"]),
    status: z.enum(["in_progress", "complete"]).optional().default("in_progress"),
    officerNotes: z.string().optional().default("[]"),
  });

export const sessions = pgTable("sessions", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCode21Request = z.infer<typeof insertCode21RequestSchema>;
export type Code21Request = InsertCode21Request & { id: string; createdAt: string };
export type Code21Status = "in_progress" | "complete";
export type Session = typeof sessions.$inferSelect;
