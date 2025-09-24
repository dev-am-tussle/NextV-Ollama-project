import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, Conversation } from "../models/ollama.models.js";

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

export async function registerUser({ name, email, password }) {
  if (!email || !password) throw new Error("Missing fields");
  email = email.toLowerCase().trim();
  if (password.length < 8) throw new Error("Password too short");

  const exists = await User.findOne({ email });
  if (exists) throw new Error("Email already registered");

  const password_hash = await bcrypt.hash(password, ROUNDS);

  const user = await User.create({
    name: name?.trim() || "",
    email,
    password_hash,
  });

  const token = signToken(user);
  return {
    token,
    user: { id: user._id, email: user.email, name: user.name },
  };
}

export async function loginUser({ email, password }) {
  if (!email || !password) throw new Error("Invalid credentials");
  email = email.toLowerCase().trim();

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("Invalid credentials");

  const token = signToken(user);
  return {
    token,
    user: { id: user._id, email: user.email, name: user.name },
  };
}

export async function logoutUser() {
  if (!process.env.JWT_SECRET) throw new Error("Missing JWT secret");
  return true;
}

/**
 * Get user profile and light-weight stats for frontend consumption.
 * Returns { user: { id, name, email, created_at }, stats: { conversations, last_conversation_at } }
 */
export async function getUserProfile(userId) {
  if (!userId) throw new Error("Missing user id");
  const user = await User.findById(userId)
    .select("_id name email created_at")
    .lean();
  if (!user) throw new Error("User not found");

  const convCount = await Conversation.countDocuments({ user_id: userId });
  const lastConv = await Conversation.findOne({ user_id: userId })
    .sort({ updated_at: -1 })
    .lean();

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    stats: {
      conversations: convCount,
      last_conversation_at: lastConv ? lastConv.updated_at : null,
    },
  };
}

// Token blacklist support (in-memory) ---
// token -> expiry (unix seconds). Small and only for single-instance dev.
const tokenBlacklist = new Map();

export function revokeToken(token) {
  if (!token) return false;
  try {
    const decoded = jwt.decode(token);
    const exp = decoded && decoded.exp ? Number(decoded.exp) : null;
    const expiry = !isNaN(exp) ? exp : Math.floor(Date.now() / 1000) + 60 * 5;
    tokenBlacklist.set(token, expiry);
    return true;
  } catch (err) {
    return false;
  }
}

export function isTokenRevoked(token) {
  if (!token) return false;
  const exp = tokenBlacklist.get(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now >= exp) {
    tokenBlacklist.delete(token);
    return false;
  }
  return true;
}

// periodic cleanup (best-effort)
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [t, exp] of tokenBlacklist.entries()) {
    if (exp <= now) tokenBlacklist.delete(t);
  }
}, 60 * 1000);
