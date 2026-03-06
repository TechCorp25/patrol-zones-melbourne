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
      "621 - Stopped in no parking",
      "623 - Stopped on painted island",
      "624 - Stopped near tram stop sign",
      "626 - Parked across driveway",
      "627 - Stopped near safety zone",
      "701 - Overstayed time limit",
      "702 - Meter expired / failed to pay",
      "704 - Stopped in bicycle parking area",
      "705 - Stopped in motorcycle parking area",
      "706 - Parked contrary to parking area requirements",
      "711 - Parked outside bay",
      "715 - Stopped on pedestrian crossing",
      "716 - Stopped before pedestrian crossing",
      "717 - Stopped after pedestrian crossing",
      "718 - Stopped before bicycle crossing",
      "719 - Stopped after bicycle crossing",
      "720 - Stopped in loading zone",
      "721 - Overstayed loading zone",
      "722 - Overstayed loading zone sign time",
      "723 - Stopped in truck zone",
      "726 - Stopped in taxi zone",
      "727 - Stopped in bus zone",
      "728 - Stopped in permit zone",
      "729 - Double parked",
      "730 - Stopped near fire hydrant",
      "735 - Stopped after bus stop sign",
      "736 - Stopped on bicycle path",
      "737 - Stopped on footpath",
      "742 - Stopped near traffic lights intersection",
      "758 - Stopped at yellow line",
    ]),
    travelMode: z.enum(["foot", "vehicle"]),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCode21Request = z.infer<typeof insertCode21RequestSchema>;
export type Code21Request = InsertCode21Request & { id: string; createdAt: string };
