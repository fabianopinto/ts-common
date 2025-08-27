import { AppError, AppErrorOptions } from "@fabianopinto/errors";
import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(["silent", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export interface LoadConfigOptions extends AppErrorOptions {
  /** Path to .env file; if omitted dotenv will use default behavior */
  path?: string;
  /** Whether to override existing process.env variables */
  override?: boolean;
}

/**
 * Loads environment variables using dotenv, validates with zod, and returns
 * a strongly-typed configuration. Throws AppError if validation fails.
 */
export function loadConfig(options: LoadConfigOptions = {}): Env {
  const { path, override = false } = options;

  const result = dotenvConfig({ path, override });
  if (result.error) {
    throw new AppError("Failed to load environment variables", {
      ...options,
      cause: result.error,
      context: { path },
      code: "CONFIG_DOTENV_ERROR",
    });
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    throw new AppError("Invalid environment configuration", {
      ...options,
      cause: parsed.error,
      context: { issues: formatted },
      code: "CONFIG_VALIDATION_ERROR",
      status: 500,
    });
  }

  return parsed.data;
}
