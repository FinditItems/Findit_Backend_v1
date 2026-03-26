import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  CORE_SERVICE_URL: required("CORE_SERVICE_URL"),
  NOTIFICATIONS_SERVICE_URL: required("NOTIFICATIONS_SERVICE_URL"),
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || "",
};