import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth, adminAuth } from "../middleware/auth.js";

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
});

// Register a new user
router.post("/register", async (req, res) => {
  // 1) Validate shape
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json({ errors: parseResult.error.flatten().fieldErrors });
  }
  const { name, email, password, address } = parseResult.data;

  try {
    // 2) Check for existing user
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3) Hash password
    const hashed = await bcrypt.hash(password, 12);

    // 4) Create & save
    const user = new User({ name, email, password: hashed, address });
    await user.save();

    // 5) Sign JWT
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
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error(error.message);
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
