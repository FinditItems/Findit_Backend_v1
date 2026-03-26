import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: Number(process.env.PORT || 4000),
  CORE_URL: process.env.CORE_URL || "http://core-service:4000",
  MATCHING_URL: process.env.MATCHING_URL || "http://matching-service:4000",
  CLAIMS_URL: process.env.CLAIMS_URL || "http://claims-service:4000",
  NOTIFICATIONS_URL:
    process.env.NOTIFICATIONS_URL || "http://notifications-service:4000",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};
