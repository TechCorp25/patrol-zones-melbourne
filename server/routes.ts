import { insertCode21RequestSchema, insertUserSchema } from "@shared/schema";
import type { Code21Status } from "@shared/schema";
import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "node:http";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./auth";
import { storage } from "./storage";

function isReadyForTraffic(): boolean {
  return true;
}

function buildAuthRateLimiter({
  windowMs,
  maxRequests,
}: {
  windowMs: number;
  maxRequests: number;
}): RequestHandler {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: {
          code: "rate_limited",
          message: "Too many auth attempts, please try again later.",
        },
      });
    }

    current.count += 1;
    attempts.set(key, current);

    return next();
  };
}

function parseBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

const loginSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(256),
});


const listCode21Schema = z.object({
  officerNumber: z.string().min(1),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health/live", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/health/ready", (_req, res) => {
    const ready = isReadyForTraffic();
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
    });
  });

  const authRateLimiter = buildAuthRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  });

  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid registration request.",
          details: parsed.error.flatten(),
        },
      });
    }

    const existingUser = await storage.getUserByUsername(parsed.data.username);
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: "username_taken",
          message: "Username is already in use.",
        },
      });
    }

    const password = await hashPassword(parsed.data.password);
    const user = await storage.createUser({
      username: parsed.data.username,
      password,
    });

    const session = await storage.createSession(user.id);

    return res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
      },
      session: {
        token: session.token,
      },
    });
  });

  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid login request.",
          details: parsed.error.flatten(),
        },
      });
    }

    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "invalid_credentials",
          message: "Invalid username or password.",
        },
      });
    }

    const matches = await verifyPassword(parsed.data.password, user.password);
    if (!matches) {
      return res.status(401).json({
        error: {
          code: "invalid_credentials",
          message: "Invalid username or password.",
        },
      });
    }

    const session = await storage.createSession(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
      session: {
        token: session.token,
      },
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = parseBearerToken(req.header("authorization"));

    if (token) {
      await storage.deleteSession(token);
    }

    return res.status(204).send();
  });

  app.get("/api/auth/session", async (req, res) => {
    const token = parseBearerToken(req.header("authorization"));

    if (!token) {
      return res.status(401).json({
        error: {
          code: "missing_token",
          message: "Missing session token.",
        },
      });
    }

    const session = await storage.getSession(token);
    if (!session) {
      return res.status(401).json({
        error: {
          code: "invalid_token",
          message: "Session token is invalid.",
        },
      });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "invalid_session",
          message: "Session is no longer valid.",
        },
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });



  app.post("/api/code21", async (req, res) => {
    const parsed = insertCode21RequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid code21 request payload.",
          details: parsed.error.flatten(),
        },
      });
    }

    const created = await storage.createCode21Request(parsed.data);

    return res.status(201).json({ request: created });
  });

  app.get("/api/code21", async (req, res) => {
    const parsed = listCode21Schema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Missing or invalid officer number.",
          details: parsed.error.flatten(),
        },
      });
    }

    const requests = await storage.getCode21RequestsByOfficerNumber(parsed.data.officerNumber);

    return res.status(200).json({ requests });
  });

  const archiveSearchSchema = z.object({
    q: z.string().min(1).max(64),
  });

  app.get("/api/code21/archive", async (req, res) => {
    const parsed = archiveSearchSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Missing or invalid search query.",
          details: parsed.error.flatten(),
        },
      });
    }

    const requests = await storage.searchCode21Archive(parsed.data.q);

    return res.status(200).json({ requests });
  });

  const patchCode21Schema = z.object({
    status: z.enum(["in_progress", "complete"]),
  });

  app.patch("/api/code21/:id", async (req, res) => {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: { code: "invalid_id", message: "Missing or invalid request ID." },
      });
    }

    const parsed = patchCode21Schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid patch payload.",
          details: parsed.error.flatten(),
        },
      });
    }

    const updated = await storage.updateCode21RequestStatus(id, parsed.data.status as Code21Status);

    if (!updated) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    return res.status(200).json({ request: updated });
  });

  const routeRequestSchema = z.object({
    waypoints: z.array(z.object({ lat: z.number(), lng: z.number() })).min(2).max(25),
    mode: z.enum(["foot", "vehicle"]),
  });

  interface OsrmLeg {
    distance: number;
    duration: number;
  }

  interface OsrmRoute {
    distance: number;
    duration: number;
    geometry: {
      type: string;
      coordinates: [number, number][];
    };
    legs: OsrmLeg[];
  }

  interface OsrmResponse {
    code: string;
    routes?: OsrmRoute[];
  }

  app.post("/api/route", async (req, res) => {
    const parsed = routeRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid route request.",
          details: parsed.error.flatten(),
        },
      });
    }

    const { waypoints, mode } = parsed.data;
    const profile = mode === "foot" ? "foot" : "driving";
    const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;

    let osrmData: OsrmResponse;
    try {
      const osrmRes = await fetch(osrmUrl, {
        signal: AbortSignal.timeout(8000),
      });
      osrmData = (await osrmRes.json()) as OsrmResponse;
    } catch {
      return res.status(502).json({
        error: { code: "routing_unavailable", message: "Routing service unavailable." },
      });
    }

    if (osrmData.code !== "Ok" || !osrmData.routes?.[0]) {
      return res.status(422).json({
        error: { code: "route_not_found", message: "No route found for the given waypoints." },
      });
    }

    const route = osrmData.routes[0];
    const polyline = route.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const legs = route.legs.map((leg) => ({
      distanceMetres: leg.distance,
      durationSeconds: leg.duration,
    }));

    return res.status(200).json({
      polyline,
      distanceMetres: route.distance,
      durationSeconds: route.duration,
      legs,
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
