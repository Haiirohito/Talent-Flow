const API_URL_DEFAULT = "http://localhost:8000/api/v1";

export const API_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  API_URL_DEFAULT;

/**
 * Custom error class that carries the HTTP status code so callers can
 * distinguish between authentication failures and other errors.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("access_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Only set Content-Type to application/json if we're not sending FormData
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized — token expired or invalid
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new ApiError("Session expired. Please log in again.", 401);
    }

    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  // Handle empty responses (like 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
};
