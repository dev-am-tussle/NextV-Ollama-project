const API_BASE: string = (import.meta as any).env?.VITE_API_URL as string;

async function apiFetch(endpoint: string, opts: RequestInit = {}) {
  // get token from localStorage; support both keys for compatibility
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");

  // clone opts to avoid mutating caller's object
  const finalOpts: RequestInit = { ...opts };

  // If body is a plain object and not FormData/string, stringify it
  if (
    finalOpts.body &&
    !(finalOpts.body instanceof FormData) &&
    typeof finalOpts.body !== "string"
  ) {
    finalOpts.body = JSON.stringify(finalOpts.body as any);
  }

  // Build headers; don't set Content-Type for FormData
  const headers: Record<string, string> = {
    ...((finalOpts.headers as Record<string, string>) || {}),
  };

  if (!(finalOpts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  finalOpts.headers = headers;

  // Normalize endpoint into a full URL
  let url: string;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    url = endpoint;
  } else {
    // Handle different API prefixes
    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    if (cleanEndpoint.startsWith("onboarding/")) {
      // Onboarding endpoints don't use /v1 prefix
      url = `${API_BASE.replace(/\/$/, "")}/api/${cleanEndpoint}`;
    } else {
      // Regular v1 endpoints
      url = `${API_BASE.replace(/\/$/, "")}/api/v1/${cleanEndpoint}`;
    }
  }

  const res = await fetch(url, {
    credentials: "include",
    ...finalOpts,
  });

  if (res.status === 401) {
    // clear any token keys we know about
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
    } catch (_) {}
    // redirect to login page
    try {
      window.location.href = "/auth/login";
    } catch (_) {}
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    // try to get JSON error body, otherwise throw status text
    let body: any = null;
    try {
      body = await res.json();
    } catch (e) {
      // non-json body
    }
    // Prefer common keys 'error' or 'message' returned by backend
    const errMsg =
      (body && (body.error || body.message)) ||
      res.statusText ||
      "Request failed";
    const err = new Error(errMsg);
    // attach parsed body for callers who want programmatic access
    try {
      (err as any).body = body;
    } catch (_) {}
    throw err;
  }

  // Try parse JSON first; if parse fails return text
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default apiFetch;
