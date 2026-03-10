import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { classifyUnknownError, type ApiErrorShape } from "./errors";
import {
  buildRequestLogContext,
  getOrCreateRequestId,
  logStructured,
} from "./observability";
import { validateEnvGuardrails } from "./env";
import { storage } from "./storage";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();
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

    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    const isCodespaces =
      origin?.endsWith(".preview.app.github.dev") ||
      origin?.endsWith(".app.github.dev");

    const devOriginAllowed = mode !== "production" && (isLocalhost || isCodespaces);
    const isAllowedOrigin = !!origin && (origins.has(origin) || devOriginAllowed);

    if (isAllowedOrigin && origin) {
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Request-Id",
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

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const requestId = getOrCreateRequestId(req);
    res.setHeader("x-request-id", requestId);

    const start = Date.now();

    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;

      const durationMs = Date.now() - start;
      logStructured("info", "API request completed", {
        ...buildRequestLogContext(req, res),
        durationMs,
      });
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
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
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  logStructured("info", "Resolved landing page host", {
    baseUrl,
    expsUrl,
  });

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  logStructured("info", "Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
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
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  if (process.env.NODE_ENV !== "production") {
    const metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, _req, res) => {
          logStructured("warn", "Metro proxy error (bundler may still be starting)", {
            message: (err as Error).message,
          });
          if (res && "writeHead" in res) {
            (res as Response).status(502).send("Metro bundler not ready yet");
          }
        },
      },
    });
    // Exclude /api routes so they reach Express handlers, not Metro
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      return metroProxy(req, res, next);
    });
    logStructured("info", "Metro dev proxy configured → localhost:8081");
  }

  logStructured("info", "Expo routing configured");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const classifiedError = classifyUnknownError(err);

    logStructured("error", "Unhandled request error", {
      requestId: res.getHeader("x-request-id") || getOrCreateRequestId(req),
      path: req.path,
      method: req.method,
      statusCode: classifiedError.statusCode,
      code: classifiedError.code,
      details: classifiedError.details,
    });

    if (res.headersSent) {
      return next(err);
    }

    const response: ApiErrorShape = {
      error: {
        code: classifiedError.code,
        message: classifiedError.message,
        requestId: String(res.getHeader("x-request-id") || "unknown"),
        ...(classifiedError.details
          ? { details: classifiedError.details }
          : {}),
      },
    };

    return res.status(classifiedError.statusCode).json(response);
  });
}

(async () => {
  validateEnvGuardrails();

  // Trust the first proxy hop so req.ip resolves the real client IP
  // behind Replit's reverse proxy (mTLS termination layer)
  app.set("trust proxy", 1);

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  await storage.purgeExpiredSessions();
  setInterval(() => { void storage.purgeExpiredSessions(); }, 6 * 60 * 60 * 1000);

  const PRESENCE_TIMEOUT_MS = 90_000;
  const PRESENCE_SWEEP_INTERVAL_MS = 60_000;
  void storage.sweepStalePresence(PRESENCE_TIMEOUT_MS);
  setInterval(() => { void storage.sweepStalePresence(PRESENCE_TIMEOUT_MS); }, PRESENCE_SWEEP_INTERVAL_MS);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logStructured("info", "Express server started", { port });
    },
  );
})();
