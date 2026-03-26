process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || "http://core-service:4000";
process.env.NOTIFICATIONS_SERVICE_URL =
  process.env.NOTIFICATIONS_SERVICE_URL || "http://notifications-service:4000";
process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "test-internal-key";
