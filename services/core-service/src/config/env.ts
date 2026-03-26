import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || "",
  MATCHING_SERVICE_URL: process.env.MATCHING_SERVICE_URL || "http://matching-service:4000",
  NOTIFICATIONS_SERVICE_URL:
    process.env.NOTIFICATIONS_SERVICE_URL || "http://notifications-service:4000",
};
