import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import routes from "./routes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

const swaggerDocument = YAML.load(
  path.join(__dirname, "../src/docs/openapi.yaml")
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(routes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ERROR]", err);

  if (err.response) {
    return res.status(err.response.status || 500).json(
      err.response.data || { message: "Upstream service error" }
    );
  }

  return res.status(500).json({
    message: err.message || "Internal server error",
  });
});

export default app;