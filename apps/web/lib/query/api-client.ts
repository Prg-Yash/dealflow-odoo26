/**
 * Universal Typesafe API Client for DealFlow 360 REST backend.
 * Automatically injects baseURL and session credentials.
 */

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Core fetch wrapper with JSON serialization and authentication header support
 */
export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers, ...customConfig } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  // Append URL Query Parameters if provided
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
  };

  const config: RequestInit = {
    method: options.method ?? (body ? "POST" : "GET"),
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: "include", // Ensure session cookies are sent to backend
    body: body ? JSON.stringify(body) : undefined,
    ...customConfig,
  };

  const response = await fetch(url, config);

  // Parse JSON response
  let data: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok || (data && typeof data === "object" && data.success === false)) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (typeof data === "string" && data.trim()) {
      errorMessage = data;
    } else if (data && typeof data === "object") {
      if (typeof data.error === "string") {
        errorMessage = data.error;
      } else if (data.error && typeof data.error.message === "string") {
        errorMessage = data.error.message;
      } else if (typeof data.message === "string") {
        errorMessage = data.message;
      }
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  // Automatically unwrap standard backend envelope { success: true, data: T }
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return data.data as T;
  }

  // Automatically unwrap common named collection envelopes
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if ("invitations" in data && Array.isArray((data as any).invitations)) {
      return (data as any).invitations as T;
    }
    if ("members" in data && Array.isArray((data as any).members)) {
      return (data as any).members as T;
    }
    if ("quotations" in data && Array.isArray((data as any).quotations)) {
      return (data as any).quotations as T;
    }
    if ("products" in data && Array.isArray((data as any).products)) {
      return (data as any).products as T;
    }
    if ("organizations" in data && Array.isArray((data as any).organizations)) {
      return (data as any).organizations as T;
    }
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "POST", body }),

  put: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T = any>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
