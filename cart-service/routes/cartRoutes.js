import express from "express";
import Cart from "../models/Cart.js";
import { auth } from "../middleware/auth.js";
import fetch from "node-fetch";

const router = express.Router();

// Get user's cart
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: [],
      });
      await cart.save();
    }

    res.json({
      items: cart.items,
      total: cart.calculateTotal(),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Add item to cart
router.post("/items", auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Fetch product details from product service
    const productResponse = await fetch(
      `${process.env.PRODUCT_SERVICE_URL}/api/products/${productId}`
    );

    if (!productResponse.ok) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await productResponse.json();

    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: [],
      });
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      // Update quantity if item exists
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.imageUrl,
      });
    }

    cart.updatedAt = Date.now();
    await cart.save();

    res.json({
      items: cart.items,
      total: cart.calculateTotal(),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update cart item quantity
router.put("/items/:productId", auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.updatedAt = Date.now();

    await cart.save();

    res.json({
      items: cart.items,
      total: cart.calculateTotal(),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove item from cart
router.delete("/items/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;

    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );
    cart.updatedAt = Date.now();

    await cart.save();

    res.json({
      items: cart.items,
      total: cart.calculateTotal(),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Clear cart
router.delete("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    cart.updatedAt = Date.now();

    await cart.save();

    res.json({
      items: cart.items,
      total: 0,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
