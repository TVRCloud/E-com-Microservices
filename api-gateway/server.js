import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// ─── 1. ENV VALIDATION ───────────────────────────────────────────────────────────
const envSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("3000"),
  PRODUCT_SERVICE_URL: z.string().url(),
  USER_SERVICE_URL: z.string().url(),
  CART_SERVICE_URL: z.string().url(),
  ORDER_SERVICE_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
const env = envSchema.parse(process.env);

// ─── 2. SERVER SETUP ─────────────────────────────────────────────────────────────
const app = express();
const PORT = env.PORT;

// Middleware
app.use(cors());

// ─── 3. PROXY FACTORY ────────────────────────────────────────────────────────────
function makeProxy(path, target, rewriteTo) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: rewriteTo },
    logLevel: env.LOG_LEVEL,
    proxyTimeout: 5000, // wait max 5s for upstream
    timeout: 10000, // wait max 10s for inactive socket
    onError(err, req, res) {
      res
        .status(502)
        .json({ error: `${path} service unreachable`, details: err.message });
    },
  });
}

// ─── 4. PROXIES ───────────────────────────────────────────────────────────────────
app.use(
  "/api/products",
  makeProxy("/api/products", env.PRODUCT_SERVICE_URL, "/api/products")
);
app.use(
  "/api/users",
  makeProxy("/api/users", env.USER_SERVICE_URL, "/api/users")
);
app.use("/api/cart", makeProxy("/api/cart", env.CART_SERVICE_URL, "/api/cart"));
app.use(
  "/api/orders",
  makeProxy("/api/orders", env.ORDER_SERVICE_URL, "/api/orders")
);

app.use(express.json());

// ─── 5. HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "API Gateway is running" });
});

// ─── 6. START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
