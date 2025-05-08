import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
const app = express();
const PORT = process.env.PORT;

dotenv.config();
app.use(cors());

// 2) Health check (no body-parser)
app.get("/health", (req, res) => {
  return res.status(200).json({ status: "User Service is running" });
});

app.use(express.json());

// 3) JSON parsing *only* for /api/users
app.use("/api/users", userRoutes);

// 4) MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 5) Start
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
