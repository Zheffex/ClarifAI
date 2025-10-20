// src/services/apiClient.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Global error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      "An unexpected error occurred.";

    // Temporary: Log to console
    console.error("API Error:", message);

    // (Optional) trigger a notification globally — if you want
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("show-notification", {
          detail: { type: "error", message },
        })
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
