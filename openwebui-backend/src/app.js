/**
 * ========================================
 * OPENWEBUI BACKEND - MAIN APPLICATION
 * ========================================
 * 
 * Professional Express.js backend with centralized configuration
 * All routes are managed through centralized routes/index.js
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { connectDB, closeDB } from "./config/ollama.db.js";
import registerRoutes from "./routes/index.js"; // ✅ Centralized routes


const app = express();

// security + logging
app.use(helmet());
app.use(morgan("dev"));

// CORS - Support multiple origins
const allowedOrigins = process.env.FRONTEND_ORIGIN 
  ? process.env.FRONTEND_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:8080'];

console.log('🔒 CORS Allowed Origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// body parser
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Basic env validation & helpful warnings (non-fatal)
function validateEnv() {
  const required = [
    "JWT_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_REDIRECT_URI",
  ];
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`[env] WARNING: Missing ${key}`);
    }
  }
  // Warn if redirect URI does not point to backend callback when using server-side callback flow
  const redirect = process.env.MICROSOFT_REDIRECT_URI || "";
  const expectsBackend = redirect.includes("/api/v1/auth/callback");
  if (!expectsBackend) {
    console.warn(
      "[env] MICROSOFT_REDIRECT_URI does not target backend /api/v1/auth/callback. Frontend callback flow assumed (use POST /api/v1/auth/microsoft to exchange code)."
    );
  }
}
validateEnv();

// ========================================
// HEALTH CHECK
// ========================================
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ========================================
// API ROUTES (Centralized)
// ========================================
registerRoutes(app);

// ========================================
// ROOT ENDPOINT
// ========================================
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to OpenWebUI Backend API",
    version: "1.0.0",
    documentation: "/api/routes" // Future: API documentation endpoint
  });
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// SERVER STARTUP
// ========================================

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('\n========================================');
      console.log('🚀 SERVER STARTED SUCCESSFULLY');
      console.log('========================================');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('========================================\n');
    });

    // ========================================
    // GRACEFUL SHUTDOWN
    // ========================================
    const graceful = (signal) => {
      console.log(`\n⚠️  ${signal} received — shutting down gracefully...`);
      server.close(async () => {
        console.log('✓ HTTP server closed');
        await closeDB();
        console.log('✓ Database connection closed');
        console.log('👋 Goodbye!\n');
        process.exit(0);
      });
    };

    process.on("SIGINT", graceful);
    process.on("SIGTERM", graceful);

    // ========================================
    // ERROR HANDLERS
    // ========================================
    process.on("unhandledRejection", (err) => {
      console.error("❌ Unhandled Rejection:", err);
    });
    
    process.on("uncaughtException", (err) => {
      console.error("❌ Uncaught Exception:", err);
      process.exit(1);
    });
    
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
}

start();
