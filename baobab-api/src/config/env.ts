import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  /** Family test: log and return the OTP so WhatsApp can replace a real SMS. Turn off after the test. */
  OTP_LOG:
    process.env.OTP_LOG === "true" ||
    (process.env.OTP_LOG !== "false" && (process.env.NODE_ENV ?? "development") !== "production"),
  PORT: Number(process.env.PORT ?? 3000),
  NEO4J_URI: requireEnv("NEO4J_URI"),
  NEO4J_USER: requireEnv("NEO4J_USER"),
  NEO4J_PASSWORD: requireEnv("NEO4J_PASSWORD"),
  JWT_SECRET:
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? requireEnv("JWT_SECRET") : "baobab-dev-secret"),
  /** Access JWT (short). Falls back to JWT_EXPIRES_IN for backward compat. */
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? "2h",
  /** Refresh JWT (long). Stored hashed on Person for rotation / logout. */
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  /** Future invite links for living relatives. */
  JWT_INVITE_EXPIRES_IN: process.env.JWT_INVITE_EXPIRES_IN ?? "14d",
  /** @deprecated use JWT_ACCESS_EXPIRES_IN */
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? process.env.JWT_ACCESS_EXPIRES_IN ?? "2h"
};
