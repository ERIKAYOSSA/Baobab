import { API_URL, REFRESH_TOKEN_KEY, TOKEN_KEY } from "./config";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
  /** Skip refresh retry (used by /auth/refresh itself). */
  skipRefresh?: boolean;
};

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getStoredRefresh();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { token?: string; accessToken?: string; refreshToken?: string };
      };
      const access = json.data?.accessToken ?? json.data?.token;
      if (!access) return null;
      localStorage.setItem(TOKEN_KEY, access);
      if (json.data?.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, json.data.refreshToken);
      }
      return access;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, auth = false, skipRefresh = false } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let bearer = token === undefined ? (auth ? getStoredToken() : null) : token;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await doFetch();

  if (res.status === 401 && auth && !skipRefresh && token === undefined) {
    const next = await tryRefreshAccessToken();
    if (next) {
      bearer = next;
      headers.Authorization = `Bearer ${next}`;
      res = await doFetch();
    }
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof json === "object" && json && "message" in json
        ? String((json as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, json);
  }

  return json as T;
}
