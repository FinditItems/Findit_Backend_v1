import path from "path";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

export function setupSwagger(app: Express) {
  // ✅ points to src/docs/openapi.yaml at runtime
  const specPath = path.join(process.cwd(), "src", "docs", "openapi.yaml");
  const swaggerDocument = YAML.load(specPath);

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}