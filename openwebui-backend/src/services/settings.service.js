import { UserSettings } from "../models/user.models.js";
import mongoose from "mongoose";

export const DEFAULT_SETTINGS = {
  theme: "light",
  default_model: "gemma:2b",
  notifications: true,
  avail_models: ["gemma:2b", "phi:2.7b"],
};

// Return either the DB settings (lean) or the DEFAULT_SETTINGS fallback
export async function getUserSettings(userId) {
  if (!userId) return DEFAULT_SETTINGS;
  const settings = await UserSettings.findOne({ user_id: userId }).lean();
  if (!settings) return DEFAULT_SETTINGS;
  // merge missing fields from DEFAULT_SETTINGS so API always has keys
  return { ...DEFAULT_SETTINGS, ...settings };
}

// Update settings: only create a DB doc if the user doesn't have one (first change)
export async function updateUserSettings(userId, updates) {
  if (!userId) throw new Error("Missing user id");

  let settings = await UserSettings.findOne({ user_id: userId });
  if (!settings) {
    // create new settings doc merging defaults and updates
    const createDoc = {
      user_id: mongoose.Types.ObjectId(userId),
      ...DEFAULT_SETTINGS,
      ...updates,
    };
    settings = await UserSettings.create(createDoc);
    return settings.toObject();
  }

  // merge updates into existing doc
  Object.assign(settings, updates);
  await settings.save();
  return settings.toObject();
}
