const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let isAutoAuthenticating = false;

async function ensureDevToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem("access_token");
  if (token) return token;

  if (isAutoAuthenticating) return null;
  isAutoAuthenticating = true;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@estroque.app", senha: "admin123" }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      return data.access_token;
    }
  } catch {
    // ignore
  } finally {
    isAutoAuthenticating = false;
  }
  return null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers);
  
  // Attach JWT token if present or auto-authenticate
  if (typeof window !== "undefined") {
    let token = localStorage.getItem("access_token");
    if (!token && !endpoint.startsWith("/auth/")) {
      token = await ensureDevToken();
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Set Content-Type only if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "Erro na requisição";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  // If response is empty (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
