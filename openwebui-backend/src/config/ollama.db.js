import mongoose from "mongoose";

// Track singleton connection state (avoid creating multiple pools)
let isConnected = false;

export async function connectDB(
  uri = process.env.MONGODB_URI,
  options = {}
) {
  if (isConnected) {
    return mongoose.connection; // Reuse existing connection
  }

  if (!uri) {
    throw new Error(
      "MongoDB connection string missing. Set MONGODB_URI (or MONGO_URI) in .env"
    );
  }

  const defaultOptions = {
    maxPoolSize: 10, // reasonable default for small/medium services
    serverSelectionTimeoutMS: 10000, // fail fast if cluster unreachable
    autoIndex: process.env.NODE_ENV !== "production", // disable auto index build in prod
  };

  try {
    await mongoose.connect(uri, { ...defaultOptions, ...options });
    isConnected = true;

    console.log("[mongo] Connected ✔");

    // Connection level diagnostics & resilience logs
    mongoose.connection.on("error", (err) => {
      console.error("[mongo] Connection error:", err.message);
    });
    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.warn("[mongo] Disconnected ✖ (will attempt reuse on next query)");
    });

    return mongoose.connection;
  } catch (err) {
    console.error("[mongo] Initial connection failed:", err.message);
    throw err; // Let caller decide to exit (more testable than process.exit here)
  }
}

/**
 * Graceful shutdown helper – close the connection cleanly.
 */
export async function closeDB() {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log("[mongo] Connection closed gracefully");
  }
}

// Optional: Utility to check state (can be used in health route)
export function mongoHealth() {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  return { readyState: state, isConnected };
}
