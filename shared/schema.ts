import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  addressLabel: text("address_label").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  requestTime: text("request_time").notNull(),
  code21Type: text("code21_type").notNull(),
  dispatchNotes: text("dispatch_notes").notNull(),
  attendanceNotes: text("attendance_notes").notNull(),
  pin: text("pin").notNull(),
  travelMode: text("travel_mode").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertCode21RequestSchema = createInsertSchema(code21Requests)
  .omit({ id: true, createdAt: true })
  .extend({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    requestTime: z.string().datetime(),
    code21Type: z.enum([
      "Welfare Check",
      "Disorder",
      "Theft",
      "Trespass",
      "Traffic Incident",
      "Other",
    ]),
    travelMode: z.enum(["foot", "vehicle"]),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCode21Request = z.infer<typeof insertCode21RequestSchema>;
export type Code21Request = InsertCode21Request & { id: string; createdAt: string };
