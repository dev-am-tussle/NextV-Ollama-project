import querystring from "querystring";

const TENANT = process.env.MICROSOFT_TENANT_ID || "common";
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

export async function exchangeCodeForToken(code, redirect_uri) {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET)
    throw new Error("Microsoft OAuth not configured");

  const body = querystring.stringify({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    scope: "openid profile email offline_access",
    code,
    redirect_uri: redirect_uri || process.env.MICROSOFT_REDIRECT_URI,
    grant_type: "authorization_code",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  // { access_token, id_token, refresh_token, expires_in }
  return data;
}

export async function getMicrosoftProfile(access_token) {
  const res = await fetch(GRAPH_ME, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch profile: ${res.status} ${txt}`);
  }
  const profile = await res.json();
  // profile example: { id, displayName, mail, userPrincipalName }
  return profile;
}
