import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Order Service is running" });
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/orders", orderRoutes);

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
