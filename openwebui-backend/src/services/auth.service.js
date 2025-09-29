import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, createUserWithDefaults } from "../models/user.models.js";
import { Conversation } from "../models/conversation.model.js";
import { UserSettings } from "../models/user.models.js";
import { SavedPrompt } from "../models/savedPrompt.model.js";
import { FileMeta } from "../models/file.model.js";
import { exchangeCodeForToken, getMicrosoftProfile } from "./oauth.service.js";

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

  // create user + default settings in a transaction
  const { user, settings } = await createUserWithDefaults({
    name: name?.trim() || "",
    email,
    password_hash,
  });

  // Do not auto-login — return a success message and minimal info
  return {
    message: "Registration successful. Please login.",
    user: { id: user._id, email: user.email, name: user.name },
    settings_id: settings._id,
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

  // gather profile, settings and light-weight lists
  const settings = user.settings_id
    ? await UserSettings.findById(user.settings_id).lean()
    : null;

  const [conversationsCount, savedPromptsCount, savedFilesCount] =
    await Promise.all([
      Conversation.countDocuments({ user_id: user._id }),
      SavedPrompt.countDocuments({ user_id: user._id }),
      FileMeta.countDocuments({ user_id: user._id }),
    ]);

  const [savedPrompts, savedFiles] = await Promise.all([
    SavedPrompt.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(10)
      .lean(),
    FileMeta.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(10)
      .lean(),
  ]);

  return {
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    settings,
    meta: {
      conversations_count: conversationsCount,
      saved_prompts_count: savedPromptsCount,
      saved_files_count: savedFilesCount,
    },
    saved_prompts: savedPrompts,
    saved_files: savedFiles,
  };
}

// find or create user from oauth provider (microsoft)
export async function findOrCreateUserFromOAuth({
  provider,
  provider_id,
  email,
  profile,
}) {
  // 1) try find by provider id
  let user = await User.findOne({
    "auth_providers.provider": provider,
    "auth_providers.provider_id": provider_id,
  });
  if (user) return user;

  // 2) try find by email
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      // link provider
      user.auth_providers = user.auth_providers || [];
      user.auth_providers.push({ provider, provider_id, profile });
      user.email_verified = true;
      await user.save();
      return user;
    }
  }

  // 3) create new user without password
  const { user: createdUser } = await createUserWithDefaults({
    name: profile.displayName || "",
    email,
    password_hash: null,
  });
  await User.updateOne(
    { _id: createdUser._id },
    {
      $push: { auth_providers: { provider, provider_id, profile } },
      $set: { email_verified: true },
    }
  );
  return await User.findById(createdUser._id);
}

export async function loginWithOAuth({ provider, code, redirect_uri }) {
  if (provider !== "microsoft") throw new Error("Unsupported provider");
  const tokenRes = await exchangeCodeForToken(code, redirect_uri);
  const access_token = tokenRes.access_token;
  const profile = await getMicrosoftProfile(access_token);

  // provider_id use profile.id (oid)
  const user = await findOrCreateUserFromOAuth({
    provider: "microsoft",
    provider_id: profile.id,
    email: profile.mail || profile.userPrincipalName,
    profile,
  });

  // build same payload as loginUser
  const token = signToken(user);
  const settings = user.settings_id
    ? await UserSettings.findById(user.settings_id).lean()
    : null;
  const [conversationsCount, savedPromptsCount, savedFilesCount] =
    await Promise.all([
      Conversation.countDocuments({ user_id: user._id }),
      SavedPrompt.countDocuments({ user_id: user._id }),
      FileMeta.countDocuments({ user_id: user._id }),
    ]);

  const [savedPrompts, savedFiles] = await Promise.all([
    SavedPrompt.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(10)
      .lean(),
    FileMeta.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(10)
      .lean(),
  ]);

  return {
    message: "Login successful (Microsoft)",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    settings,
    meta: {
      conversations_count: conversationsCount,
      saved_prompts_count: savedPromptsCount,
      saved_files_count: savedFilesCount,
    },
    saved_prompts: savedPrompts,
    saved_files: savedFiles,
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
  // fetch the user record including settings reference so we can return settings
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");

  const convCount = await Conversation.countDocuments({ user_id: userId });
  const lastConv = await Conversation.findOne({ user_id: userId })
    .sort({ updated_at: -1 })
    .lean();

  // fetch settings if linked
  let settings = null;
  try {
    if (user.settings_id) {
      settings = await UserSettings.findById(user.settings_id).lean();
    }
  } catch (e) {
    // non-fatal: we'll just return null settings
    settings = null;
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    settings,
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
