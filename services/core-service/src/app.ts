import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { setupSwagger } from "./docs/swagger";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
        origin: true, // allow same-origin + localhost variations
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-internal-service-key"],
    })
    );

  // ✅ handle preflight
  app.options("*", cors());

  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.use(routes);

  setupSwagger(app);
  app.use(errorHandler);
  return app;
}
