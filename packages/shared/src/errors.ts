export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: (msg = "Unauthorized") => new AppError("UNAUTHORIZED", msg, 401),
  forbidden: (msg = "Forbidden") => new AppError("FORBIDDEN", msg, 403),
  notFound: (entity: string) => new AppError("NOT_FOUND", `${entity} not found`, 404),
  conflict: (msg: string) => new AppError("CONFLICT", msg, 409),
  validation: (msg: string, details?: Record<string, unknown>) =>
    new AppError("VALIDATION_ERROR", msg, 400, details),
  rateLimited: () => new AppError("RATE_LIMITED", "Too many requests", 429),
  featureDisabled: (flag: string) =>
    new AppError("FEATURE_DISABLED", `Feature disabled: ${flag}`, 403),
  precondition: (msg: string) => new AppError("PRECONDITION_FAILED", msg, 412),
};
