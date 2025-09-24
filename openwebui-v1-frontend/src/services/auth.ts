import apiFetch from "@/lib/api";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  user?: any;
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem("authToken") || null;
}

// register a new user,
// calls : POST /api/v1/auth/register
export async function register(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const res = await apiFetch("auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res && (res.token || res.accessToken)) {
    const token = (res.token as string) || (res.accessToken as string);
    setAuthToken(token);
  }

  return res;
}

// login a user.
// calls : POST /api/v1/auth/login
//  and store to token in localStorage
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiFetch("auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res && (res.token || res.accessToken)) {
    const token = (res.token as string) || (res.accessToken as string);
    setAuthToken(token);
  }

  return res;
}

// logout user locally and telling backend too
//  Calls : POST /api/v1/auth/logout
export async function logout(): Promise<void> {
  try {
    await apiFetch("auth/logout", {
      method: "POST",
    });
  } catch (_) {
  } finally {
    setAuthToken(null);
    try {
    } catch (_) {}
  }
}

// fetch current user info
export async function me(): Promise<any> {
  return apiFetch("auth/me");
}
