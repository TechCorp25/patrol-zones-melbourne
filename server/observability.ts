import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "secret",
  "api_key",
  "apikey",
]);

export type LogLevel = "info" | "warn" | "error";

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export function logStructured(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const payload: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: redactSensitiveValues(context) as Record<string, unknown> } : {}),
  };

  console.log(JSON.stringify(payload));
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveValues(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = REDACTED;
      continue;
    }

    redacted[key] = redactSensitiveValues(entry);
  }

  return redacted;
}

export function getOrCreateRequestId(req: Request): string {
  const existingRequestId = req.header("x-request-id");
  return existingRequestId || randomUUID();
}

export function buildRequestLogContext(req: Request, res: Response): Record<string, unknown> {
  return {
    requestId: res.getHeader("x-request-id"),
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    origin: req.header("origin") || null,
    userAgent: req.header("user-agent") || null,
    remoteAddress: req.ip,
  };
}
