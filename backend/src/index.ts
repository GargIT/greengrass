import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import routes
import householdRoutes from "./routes/households";
import utilityServiceRoutes from "./routes/utilityServices";
import householdMeterRoutes from "./routes/householdMeters";
import mainMeterRoutes from "./routes/mainMeters";
import meterReadingRoutes from "./routes/meterReadings";
import billingRoutes from "./routes/billing";
import billingAutomationRoutes from "./routes/billingAutomation";
import invoicesRoutes from "./routes/invoices";
import reportsRoutes from "./routes/reports";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { authenticate } from "./middleware/auth";

// Import PDF service for cleanup
import { PDFGenerator } from "./lib/pdfGenerator";

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for development
  })
); // Security headers
app.use(compression()); // Gzip compression
app.use(limiter); // Rate limiting
app.use(morgan("combined")); // Logging
app.use(
  cors({
    origin: (
      process.env.CORS_ORIGIN ||
      "http://localhost:5174" ||
      "https://5174.code.gargit.se"
    ).split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authenticate, userRoutes);
app.use("/api/households", authenticate, householdRoutes);
app.use("/api/utility-services", authenticate, utilityServiceRoutes);
app.use("/api/household-meters", authenticate, householdMeterRoutes);
app.use("/api/main-meters", authenticate, mainMeterRoutes);
app.use("/api/meter-readings", authenticate, meterReadingRoutes);
app.use("/api/billing", authenticate, billingRoutes);
app.use("/api/billing", authenticate, billingAutomationRoutes);
app.use("/api/invoices", authenticate, invoicesRoutes);
app.use("/api/reports", authenticate, reportsRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Gröngräset Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🔗 CORS enabled for: ${process.env.CORS_ORIGIN || "http://localhost:5174"}`
  );
  console.log(`📖 API Documentation available at:`);
  console.log(`   • http://localhost:${PORT}/api-docs`);
  console.log(`   • http://192.168.11.7:${PORT}/api-docs`);
  console.log(`📄 PDF invoice generation enabled`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await PDFGenerator.closeBrowser();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await PDFGenerator.closeBrowser();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default app;
