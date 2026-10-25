import { ERROR_CODES } from "../config/constants.js";
import { ToolErrorResponse } from "../types/index.js";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    statusCode?: number,
    details?: unknown,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  toResponse(): ToolErrorResponse {
    return {
      isError: true,
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
      ...(this.retryAfterSeconds !== undefined ? { retryAfterSeconds: this.retryAfterSeconds } : {})
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.INVALID_ADDRESS, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ERROR_CODES.NOT_FOUND, 404, details);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfterSeconds?: number) {
    super(message, ERROR_CODES.RATE_LIMITED, 429, undefined, retryAfterSeconds);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = "Request timed out") {
    super(message, ERROR_CODES.TIMEOUT, 408);
    this.name = "TimeoutError";
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, ERROR_CODES.UPSTREAM_ERROR, statusCode, details);
    this.name = "UpstreamError";
  }
}

export function formatErrorResponse(error: unknown): ToolErrorResponse {
  if (error instanceof AppError) {
    return error.toResponse();
  }

  if (error instanceof Error) {
    return {
      isError: true,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message
    };
  }

  return {
    isError: true,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: String(error)
  };
}
