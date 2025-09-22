import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/ollama.models.js";

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
