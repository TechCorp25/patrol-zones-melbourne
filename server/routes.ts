import { insertCode21RequestSchema, registerUserSchema, loginSchema } from "@shared/schema";
import type { Code21Status } from "@shared/schema";
import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
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
      if (attempts.size > 5000) {
        for (const [k, v] of attempts) {
          if (v.resetAt <= now) attempts.delete(k);
        }
      }
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

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; officerNumber: string; email: string };
}

const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const token = parseBearerToken(req.header("authorization"));

  if (!token) {
    return res.status(401).json({
      error: { code: "missing_token", message: "Authentication required." },
    });
  }

  const session = await storage.getSession(token);
  if (!session) {
    return res.status(401).json({
      error: { code: "invalid_token", message: "Session expired or invalid." },
    });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    return res.status(401).json({
      error: { code: "invalid_session", message: "User account not found." },
    });
  }

  (req as AuthenticatedRequest).user = {
    id: user.id,
    username: user.username,
    officerNumber: user.officerNumber,
    email: user.email,
  };

  return next();
};

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
    const parsed = registerUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid registration request.",
          details: parsed.error.flatten(),
        },
      });
    }

    const { email, officerNumber, password } = parsed.data;

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        error: {
          code: "email_taken",
          message: "This email address is already registered.",
        },
      });
    }

    const existingOfficer = await storage.getUserByOfficerNumber(officerNumber);
    if (existingOfficer) {
      return res.status(409).json({
        error: {
          code: "officer_number_taken",
          message: "This officer number is already registered.",
        },
      });
    }

    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username: officerNumber,
      email,
      officerNumber,
      password: hashedPassword,
    });

    const session = await storage.createSession(user.id);

    return res.status(201).json({
      user: {
        id: user.id,
        officerNumber: user.officerNumber,
        email: user.email,
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

    const user = await storage.getUserByOfficerNumber(parsed.data.officerNumber);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "invalid_credentials",
          message: "Invalid officer number or password.",
        },
      });
    }

    const matches = await verifyPassword(parsed.data.password, user.password);
    if (!matches) {
      return res.status(401).json({
        error: {
          code: "invalid_credentials",
          message: "Invalid officer number or password.",
        },
      });
    }

    const session = await storage.createSession(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        officerNumber: user.officerNumber,
        email: user.email,
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

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    return res.status(200).json({
      user: {
        id: authReq.user.id,
        officerNumber: authReq.user.officerNumber,
        email: authReq.user.email,
      },
    });
  });

  app.post("/api/code21", requireAuth, async (req, res) => {
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

    const authReq = req as AuthenticatedRequest;
    const data = { ...parsed.data, officerNumber: authReq.user.officerNumber };

    if (data.pin && data.pin.trim() !== "") {
      data.offenceTime = new Date().toISOString();
    }

    const created = await storage.createCode21Request(data);

    return res.status(201).json({ request: created });
  });

  app.get("/api/code21", requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const requests = await storage.getCode21RequestsByOfficerNumber(authReq.user.officerNumber);

    return res.status(200).json({ requests });
  });

  const archiveSearchSchema = z.object({
    q: z.string().min(1).max(64),
  });

  app.get("/api/code21/archive", requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
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

    const requests = await storage.searchCode21Archive(parsed.data.q, authReq.user.officerNumber);

    return res.status(200).json({ requests });
  });

  const patchCode21Schema = z.object({
    status: z.enum(["in_progress", "complete"]),
  });

  app.patch("/api/code21/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: { code: "invalid_id", message: "Missing or invalid request ID." },
      });
    }

    const existing = await storage.getCode21RequestById(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    if (existing.officerNumber !== authReq.user.officerNumber) {
      return res.status(403).json({
        error: { code: "forbidden", message: "You can only update your own requests." },
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

  const updateCode21Schema = z.object({
    serviceRequestNumber: z.string().optional(),
    offenceDate: z.string().optional(),
    offenceTime: z.string().optional(),
    offenceType: z.string().optional(),
    code21Type: z.string().optional(),
    dispatchNotes: z.string().optional(),
    attendanceNotes: z.string().optional(),
    pin: z.string().optional(),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional(),
    vehicleColour: z.string().optional(),
    vehicleRego: z.string().optional(),
    formattedDocument: z.string().optional(),
    description: z.string().optional(),
  });

  app.put("/api/code21/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: { code: "invalid_id", message: "Missing or invalid request ID." },
      });
    }

    const existing = await storage.getCode21RequestById(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    if (existing.officerNumber !== authReq.user.officerNumber) {
      return res.status(403).json({
        error: { code: "forbidden", message: "You can only edit your own requests." },
      });
    }

    const parsed = updateCode21Schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid update payload.",
          details: parsed.error.flatten(),
        },
      });
    }

    const data = parsed.data;

    if (data.pin && data.pin.trim() !== "" && (!existing.offenceTime || existing.offenceTime === "")) {
      data.offenceTime = new Date().toISOString();
    }

    const updated = await storage.updateCode21Request(id, data);

    if (!updated) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    return res.status(200).json({ request: updated });
  });

  const appendNoteSchema = z.object({
    note: z.string().min(1).max(2000),
  });

  app.post("/api/code21/:id/notes", requireAuth, async (req, res) => {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: { code: "invalid_id", message: "Missing or invalid request ID." },
      });
    }

    const existing = await storage.getCode21RequestById(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    if (existing.officerNumber !== authReq.user.officerNumber) {
      return res.status(403).json({
        error: { code: "forbidden", message: "You can only add notes to your own requests." },
      });
    }

    const parsed = appendNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid note payload.",
          details: parsed.error.flatten(),
        },
      });
    }

    const updated = await storage.appendOfficerNote(id, parsed.data.note);

    if (!updated) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    return res.status(200).json({ request: updated });
  });

  app.get("/api/code21/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: { code: "invalid_id", message: "Missing or invalid request ID." },
      });
    }

    const existing = await storage.getCode21RequestById(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: "not_found", message: "Code 21 request not found." },
      });
    }

    if (existing.officerNumber !== authReq.user.officerNumber) {
      return res.status(403).json({
        error: { code: "forbidden", message: "You can only view your own requests." },
      });
    }

    return res.status(200).json({ request: existing });
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

  app.post("/api/route", requireAuth, async (req, res) => {
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

  const elevationLocationSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  });

  const elevationRequestSchema = z.object({
    locations: z.array(elevationLocationSchema).min(1).max(512),
  });

  app.post("/api/elevation", requireAuth, async (req, res) => {
    const parsed = elevationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "validation_error",
          message: "Invalid elevation request.",
          details: parsed.error.flatten(),
        },
      });
    }
    const { locations } = parsed.data;
    try {
      const elevRes = await fetch("https://api.open-elevation.com/api/v1/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
        signal: AbortSignal.timeout(6000),
      });
      const data = await elevRes.json() as { results: { elevation: number }[] };
      if (!Array.isArray(data.results) || data.results.length !== locations.length) {
        return res.json(locations.map(() => 0));
      }
      return res.json(data.results.map((r) => r.elevation));
    } catch {
      return res.json(locations.map(() => 0));
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
