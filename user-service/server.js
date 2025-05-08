import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// ─── 1) Health endpoint before JSON parser ─────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "User Service is running" });
});

// ─── 2) Only apply JSON parsing on mutating methods ────────────────────────────
app.use(cors());
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return express.json()(req, res, next);
  }
  next();
});

// ─── 3) MongoDB connection ────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ─── 4) Routes ─────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
