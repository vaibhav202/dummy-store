import { getAuthToken } from "../mock/currentUser.js";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/+$/, "");

function createQueryString(values) {
  const searchParams = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function request(path, options = {}) {
  const { body, headers: providedHeaders, ...fetchOptions } = options;
  const headers = new Headers(providedHeaders || {});
  const token = getAuthToken();

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && body !== null && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
      headers,
    });
  } catch (error) {
    error.isNetworkError = true;
    throw error;
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText };
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.error || `Request failed with status ${response.status}.`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.isNetworkError) {
    return "The API is unavailable. Check the backend URL and try again.";
  }

  return error?.message || fallback;
}

function getValidationErrors(error) {
  return error?.data?.errors && typeof error.data.errors === "object"
    ? error.data.errors
    : {};
}

function checkEmail(email, options = {}) {
  return request(`/auth/check-email?email=${encodeURIComponent(email)}`, options);
}

function signup(payload) {
  return request("/auth/signup", {
    body: payload,
    method: "POST",
  });
}

function login(payload) {
  return request("/auth/login", {
    body: payload,
    method: "POST",
  });
}

function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

function changePassword(payload) {
  return request("/auth/password", {
    body: payload,
    method: "PATCH",
  });
}

function listStores({ signal, ...query } = {}) {
  return request(`/stores${createQueryString(query)}`, { signal });
}

function createStore(payload) {
  return request("/stores", {
    body: payload,
    method: "POST",
  });
}

function listUsers({ signal, ...query } = {}) {
  return request(`/users${createQueryString(query)}`, { signal });
}

function createUser(payload) {
  return request("/users", {
    body: payload,
    method: "POST",
  });
}

function getUser(userId, options = {}) {
  return request(`/users/${encodeURIComponent(userId)}`, options);
}

function submitRating(payload) {
  return request("/ratings", {
    body: payload,
    method: "POST",
  });
}

function getAdminDashboard(options = {}) {
  return request("/dashboard/admin", options);
}

function getStoreOwnerDashboard(options = {}) {
  return request("/dashboard/store-owner", options);
}

export {
  API_BASE_URL,
  changePassword,
  checkEmail,
  createStore,
  createUser,
  getAdminDashboard,
  getErrorMessage,
  getStoreOwnerDashboard,
  getUser,
  getValidationErrors,
  listStores,
  listUsers,
  login,
  logout,
  signup,
  submitRating,
};
