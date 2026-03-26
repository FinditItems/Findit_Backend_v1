import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./config/env";

type ProxyRequestWithBody = express.Request & {
  body?: unknown;
  method: string;
};

function createCorsOrigin() {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  };
}

function buildServiceProxy(routePrefix: string, target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path) => path.replace(routePrefix, ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const request = req as ProxyRequestWithBody;
        const methodsWithBody = new Set(["POST", "PUT", "PATCH", "DELETE"]);
        if (!request.body || !methodsWithBody.has(request.method)) {
          return;
        }

        const body = JSON.stringify(request.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(body));
        proxyReq.write(body);
      },
    },
  });
}

const app = express();

app.use(
  cors({
    origin: createCorsOrigin(),
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
  });
});

app.use("/api/core", buildServiceProxy("/api/core", env.CORE_URL));
app.use("/api/matching", buildServiceProxy("/api/matching", env.MATCHING_URL));
app.use("/api/claims", buildServiceProxy("/api/claims", env.CLAIMS_URL));
app.use(
  "/api/notifications",
  buildServiceProxy("/api/notifications", env.NOTIFICATIONS_URL)
);

app.listen(env.PORT, () => {
  console.log(`[gateway] running on port ${env.PORT}`);
});
