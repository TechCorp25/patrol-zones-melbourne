export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR";

export interface ApiErrorShape {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: unknown;

  constructor({
    message,
    statusCode,
    code,
    details,
  }: {
    message: string;
    statusCode: number;
    code: ErrorCode;
    details?: unknown;
  }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function classifyUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const asErrorWithStatus = error as {
    status?: number;
    statusCode?: number;
    message?: string;
  };

  const statusCode = asErrorWithStatus.statusCode || asErrorWithStatus.status || 500;

  if (statusCode >= 400 && statusCode < 500) {
    return new AppError({
      message: asErrorWithStatus.message || "Request failed",
      statusCode,
      code: "BAD_REQUEST",
    });
  }

  return new AppError({
    message: "Internal Server Error",
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
  });
}
