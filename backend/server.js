import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import prisma from "./config/db.js";
import { connectWithRetry } from "./config/db.js";
import stripeRoutes from "./routes/payment.route.js";
import StripeRoutes from "./routes/stripe.routes.js"
import orderRoutes from "./routes/order.route.js";
import sellerDashboard from "./routes/sellerDashboard.routes.js"
dotenv.config({ path: "./config/config.env" });

const app = express();

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/Stripe", StripeRoutes)
app.use("/api/sellerDashboard", sellerDashboard)
//Admin routes
import adminRoutes from "./routes/admin.router.js";
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
       
    // Use retry mechanism for database connection
    await connectWithRetry();
    console.log("[Server DEBUG] Database connected successfully");

    // List users in database to check sync status
    const userCount = await prisma.user.count();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("[Server DEBUG] Database connection error:", err);
    console.error("[Server DEBUG] Check if your Aiven database is running at:");
    console.error("  https://console.aiven.io - Database may be paused on free tier");
    process.exit(1);
  }
}

startServer();
