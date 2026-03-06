import { logStructured } from "./observability";

const REQUIRED_ENV_BY_MODE: Record<string, string[]> = {
  production: ["PORT"],
};

const RECOMMENDED_ENV = [
  "REPLIT_DEV_DOMAIN",
  "REPLIT_DOMAINS",
  "CODESPACES_BACKEND_URL",
  "CODESPACES_FRONTEND_URL",
];

export function validateEnvGuardrails(): void {
  const mode = process.env.NODE_ENV || "development";
  const required = REQUIRED_ENV_BY_MODE[mode] || [];

  const missingRequired = required.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variables for ${mode}: ${missingRequired.join(", ")}`,
    );
  }

  const missingRecommended = RECOMMENDED_ENV.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    logStructured("warn", "Recommended environment variables are missing", {
      mode,
      missingRecommended,
    });
  }
}
