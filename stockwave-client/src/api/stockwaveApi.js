import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ───────────────────────────────────────────
export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);

// ── Products ───────────────────────────────────────
export const getProducts = () => api.get("/products");
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ── Users ──────────────────────────────────────────
export const getUsers = () => api.get("/users");
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// ── Reports ────────────────────────────────────────
export const getReportSummary = () => api.get("/reports/summary");
export const getLowStock = () => api.get("/reports/low-stock");
export const getRecentActivity = () => api.get("/reports/recent-activity");
export const getCategoryBreakdown = () => api.get("/reports/category-breakdown");
export const getStockMovement = () => api.get("/reports/stock-movement");
export const getTopProducts = () => api.get("/reports/top-products");