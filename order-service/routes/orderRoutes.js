import express from "express";
import Order from "../models/Order.js";
import { auth, adminAuth } from "../middleware/auth.js";
import fetch from "node-fetch";

const router = express.Router();

// Create a new order
router.post("/", auth, async (req, res) => {
  try {
    // Get user's cart from cart service
    const cartResponse = await fetch(
      `${process.env.CART_SERVICE_URL}/api/cart`,
      {
        headers: {
          "x-auth-token": req.header("x-auth-token"),
        },
      }
    );

    if (!cartResponse.ok) {
      return res.status(400).json({ message: "Failed to retrieve cart" });
    }

    const cart = await cartResponse.json();

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Get user details from user service
    const userResponse = await fetch(
      `${process.env.USER_SERVICE_URL}/api/users/me`,
      {
        headers: {
          "x-auth-token": req.header("x-auth-token"),
        },
      }
    );

    if (!userResponse.ok) {
      return res
        .status(400)
        .json({ message: "Failed to retrieve user details" });
    }

    const user = await userResponse.json();

    if (!user.address) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    // Create new order
    const order = new Order({
      userId: req.user.id,
      items: cart.items,
      total: cart.total,
      shippingAddress: {
        street: user.address.street,
        city: user.address.city,
        state: user.address.state,
        zipCode: user.address.zipCode,
        country: user.address.country,
      },
    });

    await order.save();

    // Clear the cart
    await fetch(`${process.env.CART_SERVICE_URL}/api/cart`, {
      method: "DELETE",
      headers: {
        "x-auth-token": req.header("x-auth-token"),
      },
    });

    // Update product inventory (in a real system, this would be done via a message queue)
    for (const item of order.items) {
      await fetch(
        `${process.env.PRODUCT_SERVICE_URL}/api/products/${item.productId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": req.header("x-auth-token"),
          },
          body: JSON.stringify({
            stock: { $inc: -item.quantity },
          }),
        }
      );
    }

    res.status(201).json(order);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's orders
router.get("/", auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get order by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order belongs to the user or if admin
    if (order.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Update order status
router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (
      !["pending", "processing", "shipped", "delivered", "cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    order.updatedAt = Date.now();

    await order.save();

    res.json(order);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Get all orders
router.get("/admin/all", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
