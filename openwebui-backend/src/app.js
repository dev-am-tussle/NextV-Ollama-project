// app.js (recommended updated)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import modelRoutes from "./routes/ollama.routes.js";
import authRoutes from "./routes/auth.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import savedPromptsRoutes from "./routes/savedprompts.routes.js";
import filesRoutes from "./routes/files.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
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

// health
app.get("/health", (req, res) => res.json({ status: "ok" }));

// routes
app.use("/api/v1/models", modelRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/saved-prompts", savedPromptsRoutes);
app.use("/api/v1/files", filesRoutes);
app.use("/api/v1/auth", oauthRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to OpenWebUI Backend API" });
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

const PORT = process.env.PORT || 3001;

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
