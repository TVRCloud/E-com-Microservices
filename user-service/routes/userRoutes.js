import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth, adminAuth } from "../middleware/auth.js";
import CryptoJS from "crypto-js";
import { z } from "zod";

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function generateSalt() {
  return CryptoJS.lib.WordArray.random(16).toString();
}

function hashWithSalt(password, salt) {
  return CryptoJS.SHA256(password + salt).toString();
}

// Register a new user
router.post("/register", async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ errors: parse.error.flatten().fieldErrors });
  const { name, email, password, address } = parse.data;
  try {
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "User already exists" });
    const salt = generateSalt();
    const hash = hashWithSalt(password, salt);
    const stored = `${salt}:${hash}`;
    const user = await User.create({ name, email, password: stored, address });
    const token = jwt.sign(
      { user: { id: user.id, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ errors: parse.error.flatten().fieldErrors });
  const { email, password } = parse.data;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const [salt, storedHash] = user.password.split(":");
    const hash = hashWithSalt(password, salt);
    if (hash !== storedHash)
      return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { user: { id: user.id, role: user.role } },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/me", auth, async (req, res) => {
  try {
    const { name, address } = req.body;

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (address) updateFields.address = address;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Get all users
router.get("/", adminAuth, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
