// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true }, // stored as "salt:hash"
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
