const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export type ApiError = {
  error: string;
};

export const getToken = () => {
  const raw = localStorage.getItem("mam_auth");
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
};

const buildHeaders = (options?: RequestInit) => {
  const headers = new Headers(options?.headers);
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options)
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as ApiError;
      message = data.error || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.blob()) as T;
};
