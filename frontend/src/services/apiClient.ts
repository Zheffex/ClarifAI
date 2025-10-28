// src/services/apiClient.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://192.168.1.11:5000/api",
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
    let message = "An unexpected error occurred.";
    
    if (error.response?.status === 401) {
      message = "Access token is required";
      // Clear token and redirect to login
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }

    // Log to console
    console.error("API Error:", message);

    // Trigger notification globally
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
