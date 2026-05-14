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
export const posCheckout = (data) => api.post("/pos/checkout", data);
// ── Users ──────────────────────────────────────────
export const getUsers = () => api.get("/users");
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

export const changeMyPassword = (data) => api.put("/users/me/password", data);
// Security

export const updateSecuritySettings = (data) => api.put("/users/me/security", data);
export const clearActivityLogs = () => api.delete("/users/admin/activity-logs");
export const resetSystem = () => api.post("/users/admin/reset-system");

// ── Notifications ──────────────────────────────
export const getNotifications = () => api.get("/notifications");
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => api.put("/notifications/read-all");
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const clearAllNotifications = () => api.delete("/notifications/clear-all");

// ── Reports ────────────────────────────────────────
export const getReportSummary = () => api.get("/reports/summary");
export const getLowStock = () => api.get("/reports/low-stock");
export const getRecentActivity = () => api.get("/reports/recent-activity");
export const getCategoryBreakdown = () => api.get("/reports/category-breakdown");
export const getStockMovement = () => api.get("/reports/stock-movement");
export const getTopProducts = () => api.get("/reports/top-products");
// ── Add these to stockwaveApi.js ──────────────────────────────────

// Staff management (Admin only)
export const createStaff       = (data) => api.post("/auth/create-staff", data);
export const getMyStaff        = ()     => api.get("/auth/my-staff");
export const deleteStaff       = (id)   => api.delete(`/auth/staff/${id}`);
export const toggleStaffStatus = (id, status) => api.put(`/auth/staff/${id}/status`, { status });