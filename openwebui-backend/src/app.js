// app.js (recommended updated)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import modelRoutes from "./routes/ollama.routes.js";
import modelsRoutes from "./routes/models.routes.js";
import adminModelsRoutes from "./routes/adminModels.routes.js";
import adminUsersRoutes from "./routes/adminUsers.routes.js";
import userModelsRoutes from "./routes/userModels.routes.js";
import authRoutes from "./routes/auth.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import savedPromptsRoutes from "./routes/savedprompts.routes.js";
import filesRoutes from "./routes/files.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import adminAuthRoutes from "./routes/adminAuth.routes.js";
import organizationManagementRoutes from "./routes/organizationManagement.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import unifiedAuthRoutes from "./routes/unifiedAuth.routes.js";
import jwt from "jsonwebtoken";
import { connectDB, closeDB } from "./config/ollama.db.js"; // DB helpers import

dotenv.config();

const app = express();

// security + logging
app.use(helmet());
app.use(morgan("dev"));

// CORS
const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:8080";
app.use(
  cors({
    origin: FRONTEND,
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

// health
app.get("/health", (req, res) => res.json({ status: "ok" }));

// routes
app.use("/api/v1/models", modelRoutes); // ollama streaming routes
app.use("/api/v1/available-models", modelsRoutes); // user sees active models
app.use("/api/admin/models", adminModelsRoutes); // admin manages catalog
app.use("/api/admin/users", adminUsersRoutes); // admin manages users
app.use("/api/v1/user", userModelsRoutes); // user manages their pulled models
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/saved-prompts", savedPromptsRoutes);
app.use("/api/v1/files", filesRoutes);
app.use("/api/v1/auth", oauthRoutes);

// Admin routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/super-admin/auth", superAdminRoutes);
app.use("/api/super-admin/organizations", organizationManagementRoutes);

// Unified authentication route
app.use("/api/v1/unified-auth", unifiedAuthRoutes);

app.get("/", async (req, res) => {
  // Default welcome message
  const base = { message: "Welcome to OpenWebUI Backend API" };

  // If an Authorization Bearer token is provided, try to decode it and
  // include the user's profile (from getUserProfile) in the response so
  // frontend can fetch user details from the root route without calling /auth/me
  // Keep root lightweight. Frontend should not rely on root for fetching profile.
  return res.json(base);
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT;

async function start() {
  try {
    await connectDB(); // <- yahi call karein
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const graceful = (signal) => {
      console.log(`${signal} received — shutting down`);
      server.close(async () => {
        await closeDB();
        process.exit(0);
      });
    };

    process.on("SIGINT", graceful);
    process.on("SIGTERM", graceful);

    process.on("unhandledRejection", (err) => {
      console.error("unhandledRejection:", err);
    });
    process.on("uncaughtException", (err) => {
      console.error("uncaughtException:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
