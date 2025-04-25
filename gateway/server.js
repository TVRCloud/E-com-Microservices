import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());

// Routes configuration
const routes = {
  "/api/products": "http://product-service:3001",
  "/api/users": "http://user-service:3002",
  "/api/auth": "http://user-service:3002",
  "/api/orders": "http://order-service:3003",
  "/api/payments": "http://payment-service:3004",
  "/api/inventory": "http://inventory-service:3005",
};

// Setup proxy routes
Object.entries(routes).forEach(([route, target]) => {
  app.use(
    route,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${route}`]: "",
      },
    })
  );
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "production" ? null : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
