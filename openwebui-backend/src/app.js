// app.js (recommended updated)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import modelRoutes from "./routes/ollama.routes.js";

dotenv.config();

const app = express();

// security + logging
app.use(helmet());
app.use(morgan("dev"));

// CORS: during dev allow frontend origin via env, fallback to '*'
const FRONTEND = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: FRONTEND }));

// body parser
app.use(express.json({ limit: "1mb" }));

// health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// mount api
app.use("/api/v1/models", modelRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to OpenWebUI Backend API" });
});


// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// graceful shutdown
process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down gracefully");
  server.close(() => process.exit(0));
});

process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
  process.exit(1);
});
