import express from "express";
import crypto from "crypto";
import { loginWithOAuth } from "../services/auth.service.js";

const router = express.Router();

// Utility: build Microsoft authorize URL
function buildMicrosoftAuthUrl({ state }) {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = encodeURIComponent(
    process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/v1/auth/callback"
  );
  const scope = encodeURIComponent(
    process.env.MICROSOFT_OAUTH_SCOPE || "openid profile email offline_access"
  );
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&response_mode=query&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
}

// GET /api/v1/auth/login  (OAuth variant) -- DIFFERENT from POST /login (password login)
// Redirects user to Microsoft login with state parameter (CSRF protection)
router.get("/login", (req, res) => {
  try {
    if (!process.env.MICROSOFT_CLIENT_ID) {
      return res.status(500).send("Microsoft OAuth not configured");
    }
    const state = crypto.randomBytes(16).toString("hex");
    // Store state in a short-lived cookie (5 min)
    res.cookie("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 60 * 1000,
    });
    const url = buildMicrosoftAuthUrl({ state });
    return res.redirect(url);
  } catch (err) {
    console.error("/auth/login error", err);
    return res.status(500).send("Failed to start OAuth flow");
  }
});

// Optional helper for SPAs to fetch the URL instead of server redirect
// GET /api/v1/auth/microsoft/url -> { url }
router.get("/microsoft/url", (req, res) => {
  try {
    if (!process.env.MICROSOFT_CLIENT_ID) {
      return res.status(500).json({ error: "Microsoft OAuth not configured" });
    }
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 60 * 1000,
    });
    return res.json({ url: buildMicrosoftAuthUrl({ state }) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// GET /api/v1/auth/callback?code=...&state=...
// Exchanges code -> tokens, creates/logins user, issues JWT cookie and redirects to '/'
router.get("/callback", async (req, res) => {
  try {
    const { code, state, provider } = req.query;
    if (!code || typeof code !== "string") {
      return res.status(400).send("Missing authorization code");
    }
    const expectedState = req.cookies?.oauth_state;
    if (!expectedState || !state || state !== expectedState) {
      return res.status(400).send("Invalid or expired OAuth state");
    }
    // Clear state cookie after validation
    res.clearCookie("oauth_state");

    const prov = (provider || "microsoft").toString().toLowerCase();
    if (prov !== "microsoft") {
      return res.status(400).send("Unsupported provider");
    }

    const result = await loginWithOAuth({
      provider: "microsoft",
      code: code.toString(),
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    });

    // Issue JWT as secure httpOnly cookie for session usage
    res.cookie("auth_token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Optional: also pass short-lived page to set localStorage (if SPA reads from there).
    // Simpler: direct redirect; frontend can call /auth/me using cookie.
    return res.redirect("/");
  } catch (err) {
    console.error("/auth/callback error", err);
    return res.status(500).send("OAuth callback failed");
  }
});

// JSON exchange endpoint (still available for direct POST from frontend if needed)
// POST /api/v1/auth/microsoft { code, redirect_uri }
router.post("/microsoft", async (req, res, next) => {
  try {
    const { code, redirect_uri } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });
    const result = await loginWithOAuth({
      provider: "microsoft",
      code,
      redirect_uri,
    });
    // also set cookie for consistency
    res.cookie("auth_token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
