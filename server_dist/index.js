var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  code21Requests: () => code21Requests,
  insertCode21RequestSchema: () => insertCode21RequestSchema,
  insertUserSchema: () => insertUserSchema,
  sessions: () => sessions,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// constants/offenceTypes.ts
var CODE21_TYPES = [
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
  "758 - Stopped at yellow line"
];

// shared/schema.ts
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var code21Requests = pgTable("code21_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  vehicleColour: text("vehicle_colour").notNull().default(""),
  vehicleRego: text("vehicle_rego").notNull().default(""),
  travelMode: text("travel_mode").notNull(),
  description: text("description").notNull(),
  formattedDocument: text("formatted_document").notNull().default(""),
  status: text("status").notNull().default("in_progress"),
  createdAt: text("created_at").notNull()
});
var insertCode21RequestSchema = createInsertSchema(code21Requests).omit({ id: true, createdAt: true }).extend({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  requestTime: z.string().datetime(),
  offenceDate: z.string().optional().default(""),
  offenceTime: z.string().optional().default(""),
  offenceType: z.enum([...CODE21_TYPES]).default("621 - Stopped in no parking"),
  code21Type: z.enum([...CODE21_TYPES]),
  serviceRequestNumber: z.string().optional().default(""),
  pin: z.string().optional().default(""),
  vehicleMake: z.string().optional().default(""),
  vehicleColour: z.string().optional().default(""),
  vehicleRego: z.string().optional().default(""),
  formattedDocument: z.string().optional().default(""),
  travelMode: z.enum(["foot", "vehicle"]),
  status: z.enum(["in_progress", "complete"]).optional().default("in_progress")
});
var sessions = pgTable("sessions", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull()
});

// server/routes.ts
import { createServer } from "node:http";
import { z as z2 } from "zod";

// server/auth.ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scrypt = promisify(scryptCallback);
var SCRYPT_KEYLEN = 64;
async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEYLEN);
  return ["scrypt", salt.toString("hex"), derivedKey.toString("hex")].join("$");
}
async function verifyPassword(password, storedHash) {
  const [algorithm, saltHex, keyHex] = storedHash.split("$");
  if (!algorithm || !saltHex || !keyHex) {
    return false;
  }
  if (algorithm !== "scrypt") {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  const derivedKey = await scrypt(password, salt, expectedKey.length);
  return timingSafeEqual(expectedKey, derivedKey);
}
function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

// server/storage.ts
import { eq, lt, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
var SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var DbStorage = class {
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async createSession(userId) {
    const token = generateSessionToken();
    const now = /* @__PURE__ */ new Date();
    const session = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString()
    };
    await db.insert(sessions).values(session);
    return session;
  }
  async getSession(token) {
    const result = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    const row = result[0];
    if (!row) return void 0;
    if (row.expiresAt < (/* @__PURE__ */ new Date()).toISOString()) {
      await db.delete(sessions).where(eq(sessions.token, token));
      return void 0;
    }
    return row;
  }
  async deleteSession(token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  async purgeExpiredSessions() {
    await db.delete(sessions).where(lt(sessions.expiresAt, (/* @__PURE__ */ new Date()).toISOString()));
  }
  async createCode21Request(request) {
    const id = randomUUID();
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      ...request,
      id,
      latitude: String(request.latitude),
      longitude: String(request.longitude),
      createdAt
    };
    await db.insert(code21Requests).values(row);
    return {
      ...request,
      id,
      createdAt
    };
  }
  async getCode21RequestsByOfficerNumber(officerNumber) {
    const rows = await db.select().from(code21Requests).where(eq(code21Requests.officerNumber, officerNumber));
    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude)
    }));
  }
  async updateCode21RequestStatus(id, status) {
    const rows = await db.update(code21Requests).set({ status }).where(eq(code21Requests.id, id)).returning();
    if (!rows[0]) return null;
    return {
      ...rows[0],
      latitude: Number(rows[0].latitude),
      longitude: Number(rows[0].longitude)
    };
  }
  async searchCode21Archive(query) {
    const pattern = `%${query}%`;
    const rows = await db.select().from(code21Requests).where(
      or(
        ilike(code21Requests.serviceRequestNumber, pattern),
        ilike(code21Requests.officerNumber, pattern)
      )
    );
    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude)
    }));
  }
};
var storage = new DbStorage();

// server/routes.ts
function isReadyForTraffic() {
  return true;
}
function buildAuthRateLimiter({
  windowMs,
  maxRequests
}) {
  const attempts = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      if (attempts.size > 5e3) {
        for (const [k, v] of attempts) {
          if (v.resetAt <= now) attempts.delete(k);
        }
      }
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1e3);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: {
          code: "rate_limited",
          message: "Too many auth attempts, please try again later."
        }
      });
    }
    current.count += 1;
    attempts.set(key, current);
    return next();
  };
}
function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }
  return authorizationHeader.slice("Bearer ".length).trim() || null;
}
var loginSchema = z2.object({
  username: z2.string().min(3).max(64),
  password: z2.string().min(8).max(256)
});
var listCode21Schema = z2.object({
  officerNumber: z2.string().min(1)
});
async function registerRoutes(app2) {
  app2.get("/api/health/live", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/health/ready", (_req, res) => {
    const ready = isReadyForTraffic();
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  const authRateLimiter = buildAuthRateLimiter({
    windowMs: 15 * 60 * 1e3,
    maxRequests: 10
  });
  app2.post("/api/auth/register", authRateLimiter, async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid registration request.",
          details: parsed.error.flatten()
        }
      });
    }
    const existingUser = await storage.getUserByUsername(parsed.data.username);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "username_taken",
          message: "Username is already in use."
        }
      });
    }
    const password = await hashPassword(parsed.data.password);
    const user = await storage.createUser({
      username: parsed.data.username,
      password
    });
    const session = await storage.createSession(user.id);
    return res.status(201).json({
      user: {
        id: user.id,
        username: user.username
      },
      session: {
        token: session.token
      }
    });
  });
  app2.post("/api/auth/login", authRateLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid login request.",
          details: parsed.error.flatten()
        }
      });
    }
    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "invalid_credentials",
          message: "Invalid username or password."
        }
      });
    }
    const matches = await verifyPassword(parsed.data.password, user.password);
    if (!matches) {
      return res.status(401).json({
        error: {
          code: "invalid_credentials",
          message: "Invalid username or password."
        }
      });
    }
    const session = await storage.createSession(user.id);
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username
      },
      session: {
        token: session.token
      }
    });
  });
  app2.post("/api/auth/logout", async (req, res) => {
    const token = parseBearerToken(req.header("authorization"));
    if (token) {
      await storage.deleteSession(token);
    }
    return res.status(204).send();
  });
  app2.get("/api/auth/session", async (req, res) => {
    const token = parseBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({
        error: {
          code: "missing_token",
          message: "Missing session token."
        }
      });
    }
    const session = await storage.getSession(token);
    if (!session) {
      return res.status(401).json({
        error: {
          code: "invalid_token",
          message: "Session token is invalid."
        }
      });
    }
    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "invalid_session",
          message: "Session is no longer valid."
        }
      });
    }
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username
      }
    });
  });
  app2.post("/api/code21", async (req, res) => {
    const parsed = insertCode21RequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid code21 request payload.",
          details: parsed.error.flatten()
        }
      });
    }
    const created = await storage.createCode21Request(parsed.data);
    return res.status(201).json({ request: created });
  });
  app2.get("/api/code21", async (req, res) => {
    const parsed = listCode21Schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Missing or invalid officer number.",
          details: parsed.error.flatten()
        }
      });
    }
    const requests = await storage.getCode21RequestsByOfficerNumber(parsed.data.officerNumber);
    return res.status(200).json({ requests });
  });
  const archiveSearchSchema = z2.object({
    q: z2.string().min(1).max(64)
  });
  app2.get("/api/code21/archive", async (req, res) => {
    const parsed = archiveSearchSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Missing or invalid search query.",
          details: parsed.error.flatten()
        }
      });
    }
    const requests = await storage.searchCode21Archive(parsed.data.q);
    return res.status(200).json({ requests });
  });
  const patchCode21Schema = z2.object({
    status: z2.enum(["in_progress", "complete"])
  });
  app2.patch("/api/code21/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: { code: "invalid_id", message: "Missing or invalid request ID." }
      });
    }
    const parsed = patchCode21Schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid patch payload.",
          details: parsed.error.flatten()
        }
      });
    }
    const updated = await storage.updateCode21RequestStatus(id, parsed.data.status);
    if (!updated) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." }
      });
    }
    return res.status(200).json({ request: updated });
  });
  const routeRequestSchema = z2.object({
    waypoints: z2.array(z2.object({ lat: z2.number(), lng: z2.number() })).min(2).max(25),
    mode: z2.enum(["foot", "vehicle"])
  });
  app2.post("/api/route", async (req, res) => {
    const parsed = routeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid route request.",
          details: parsed.error.flatten()
        }
      });
    }
    const { waypoints, mode } = parsed.data;
    const profile = mode === "foot" ? "foot" : "driving";
    const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;
    let osrmData;
    try {
      const osrmRes = await fetch(osrmUrl, {
        signal: AbortSignal.timeout(8e3)
      });
      osrmData = await osrmRes.json();
    } catch {
      return res.status(502).json({
        error: { code: "routing_unavailable", message: "Routing service unavailable." }
      });
    }
    if (osrmData.code !== "Ok" || !osrmData.routes?.[0]) {
      return res.status(422).json({
        error: { code: "route_not_found", message: "No route found for the given waypoints." }
      });
    }
    const route = osrmData.routes[0];
    const polyline = route.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng
    }));
    const legs = route.legs.map((leg) => ({
      distanceMetres: leg.distance,
      durationSeconds: leg.duration
    }));
    return res.status(200).json({
      polyline,
      distanceMetres: route.distance,
      durationSeconds: route.duration,
      legs
    });
  });
  const elevationLocationSchema = z2.object({
    latitude: z2.number().min(-90).max(90),
    longitude: z2.number().min(-180).max(180)
  });
  const elevationRequestSchema = z2.object({
    locations: z2.array(elevationLocationSchema).min(1).max(512)
  });
  app2.post("/api/elevation", async (req, res) => {
    const parsed = elevationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid elevation request.",
          details: parsed.error.flatten()
        }
      });
    }
    const { locations } = parsed.data;
    try {
      const elevRes = await fetch("https://api.open-elevation.com/api/v1/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
        signal: AbortSignal.timeout(6e3)
      });
      const data = await elevRes.json();
      if (!Array.isArray(data.results) || data.results.length !== locations.length) {
        return res.json(locations.map(() => 0));
      }
      return res.json(data.results.map((r) => r.elevation));
    } catch {
      return res.json(locations.map(() => 0));
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";

// server/errors.ts
var AppError = class extends Error {
  statusCode;
  code;
  details;
  constructor({
    message,
    statusCode,
    code,
    details
  }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
};
function classifyUnknownError(error) {
  if (error instanceof AppError) {
    return error;
  }
  const asErrorWithStatus = error;
  const statusCode = asErrorWithStatus.statusCode || asErrorWithStatus.status || 500;
  if (statusCode >= 400 && statusCode < 500) {
    return new AppError({
      message: asErrorWithStatus.message || "Request failed",
      statusCode,
      code: "BAD_REQUEST"
    });
  }
  return new AppError({
    message: "Internal Server Error",
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR"
  });
}

// server/observability.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var REDACTED = "[REDACTED]";
var SENSITIVE_KEYS = /* @__PURE__ */ new Set([
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "secret",
  "api_key",
  "apikey"
]);
function logStructured(level, message, context) {
  const payload = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    message,
    ...context ? { context: redactSensitiveValues(context) } : {}
  };
  console.log(JSON.stringify(payload));
}
function redactSensitiveValues(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveValues(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value;
  const redacted = {};
  for (const [key, entry] of Object.entries(record)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = REDACTED;
      continue;
    }
    redacted[key] = redactSensitiveValues(entry);
  }
  return redacted;
}
function getOrCreateRequestId(req) {
  const existingRequestId = req.header("x-request-id");
  return existingRequestId || randomUUID2();
}
function buildRequestLogContext(req, res) {
  return {
    requestId: res.getHeader("x-request-id"),
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    origin: req.header("origin") || null,
    userAgent: req.header("user-agent") || null,
    remoteAddress: req.ip
  };
}

// server/env.ts
var REQUIRED_ENV_BY_MODE = {
  production: ["PORT"]
};
var RECOMMENDED_ENV = [
  "REPLIT_DEV_DOMAIN",
  "REPLIT_DOMAINS",
  "CODESPACES_BACKEND_URL",
  "CODESPACES_FRONTEND_URL"
];
function validateEnvGuardrails() {
  const mode = process.env.NODE_ENV || "development";
  const required = REQUIRED_ENV_BY_MODE[mode] || [];
  const missingRequired = required.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variables for ${mode}: ${missingRequired.join(", ")}`
    );
  }
  const missingRecommended = RECOMMENDED_ENV.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    logStructured("warn", "Recommended environment variables are missing", {
      mode,
      missingRecommended
    });
  }
}

// server/index.ts
var app = express();
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    const mode = process.env.NODE_ENV || "development";
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    if (process.env.CODESPACES_BACKEND_URL) {
      origins.add(process.env.CODESPACES_BACKEND_URL);
    }
    if (process.env.CODESPACES_FRONTEND_URL) {
      origins.add(process.env.CODESPACES_FRONTEND_URL);
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    const isCodespaces = origin?.endsWith(".preview.app.github.dev") || origin?.endsWith(".app.github.dev");
    const devOriginAllowed = mode !== "production" && (isLocalhost || isCodespaces);
    const isAllowedOrigin = !!origin && (origins.has(origin) || devOriginAllowed);
    if (isAllowedOrigin && origin) {
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Request-Id"
      );
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") {
      if (!isAllowedOrigin) {
        return res.sendStatus(403);
      }
      return res.sendStatus(204);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const requestId = getOrCreateRequestId(req);
    res.setHeader("x-request-id", requestId);
    const start = Date.now();
    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;
      const durationMs = Date.now() - start;
      logStructured("info", "API request completed", {
        ...buildRequestLogContext(req, res),
        durationMs
      });
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  logStructured("info", "Resolved landing page host", {
    baseUrl,
    expsUrl
  });
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  logStructured("info", "Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    const isDev = process.env.NODE_ENV !== "production";
    if (platform && (platform === "ios" || platform === "android")) {
      if (isDev) {
        return next();
      }
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  if (process.env.NODE_ENV !== "production") {
    const metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, _req, res) => {
          logStructured("warn", "Metro proxy error (bundler may still be starting)", {
            message: err.message
          });
          if (res && "writeHead" in res) {
            res.status(502).send("Metro bundler not ready yet");
          }
        }
      }
    });
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      return metroProxy(req, res, next);
    });
    logStructured("info", "Metro dev proxy configured \u2192 localhost:8081");
  }
  logStructured("info", "Expo routing configured");
}
function setupErrorHandler(app2) {
  app2.use((err, req, res, next) => {
    const classifiedError = classifyUnknownError(err);
    logStructured("error", "Unhandled request error", {
      requestId: res.getHeader("x-request-id") || getOrCreateRequestId(req),
      path: req.path,
      method: req.method,
      statusCode: classifiedError.statusCode,
      code: classifiedError.code,
      details: classifiedError.details
    });
    if (res.headersSent) {
      return next(err);
    }
    const response = {
      error: {
        code: classifiedError.code,
        message: classifiedError.message,
        requestId: String(res.getHeader("x-request-id") || "unknown"),
        ...classifiedError.details ? { details: classifiedError.details } : {}
      }
    };
    return res.status(classifiedError.statusCode).json(response);
  });
}
(async () => {
  validateEnvGuardrails();
  app.set("trust proxy", 1);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  await storage.purgeExpiredSessions();
  setInterval(() => {
    void storage.purgeExpiredSessions();
  }, 6 * 60 * 60 * 1e3);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      logStructured("info", "Express server started", { port });
    }
  );
})();
