import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import prisma from "./config/db.js";

// Load env variables
dotenv.config({ path: "./config/config.env" });

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to the e-commerce API");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Test database connection PRISMA+AIVNCLOUD MYSQL
// prisma.$connect().then(async () => {
//   const user = await prisma.user.create(
//     {data: { email: "test@example.com", name: "Test User", password: "password" }}
//   );
//   console.log("Database connected and test user created:", user);
// }).catch((err) => {
//   console.error("Database connection error:", err);
// });