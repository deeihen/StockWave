import { useState } from "react";
import "./Login.css";
import { loginUser } from "../api/stockwaveApi";

export default function Login({ onGoRegister, onLoginSuccess }) {
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.username || !form.password) {
    setError("Please fill in all fields.");
    return;
  }
  setLoading(true);
  setError("");

  try {
    const res = await loginUser({ username: form.username, password: form.password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    if (onLoginSuccess) onLoginSuccess();
  } catch (err) {
    setError(err.response?.data?.message || "Invalid username or password.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-root">
      {/* Left Panel — Branding */}
      <div className="login-left">
        <div className="login-left-inner">
          <h1 className="brand-title">
            Stock<span>Wave</span>
          </h1>
          <p className="brand-sub">
            Manage your inventory smarter with gesture and voice controls.
          </p>
          <div className="brand-stats">
          </div>
        </div>
        <div className="left-decoration">
          <div className="deco-circle c1" />
          <div className="deco-circle c2" />
          <div className="deco-circle c3" />
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-right">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="12" height="12" rx="2" fill="#1a6b3c" />
                <rect
                  x="16"
                  width="12"
                  height="12"
                  rx="2"
                  fill="#1a6b3c"
                  opacity="0.5"
                />
                <rect
                  y="16"
                  width="12"
                  height="12"
                  rx="2"
                  fill="#1a6b3c"
                  opacity="0.5"
                />
                <rect
                  x="16"
                  y="16"
                  width="12"
                  height="12"
                  rx="2"
                  fill="#1a6b3c"
                />
              </svg>
            </div>
            <span className="logo-text">StockWave</span>
          </div>

          <h2 className="login-heading">Welcome back</h2>
          <p className="login-sub">Sign in to your account to continue</p>

          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  stroke="#c0392b"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 4.5v4M8 10.5v1"
                  stroke="#c0392b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="field-group">
              <label className="field-label" htmlFor="username">
                Username
              </label>
              <div className="field-wrap">
                <svg
                  className="field-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="#aaa"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                    stroke="#aaa"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="field-input"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div className="field-wrap">
                <svg
                  className="field-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect
                    x="5"
                    y="11"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="#aaa"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8 11V7a4 4 0 018 0v4"
                    stroke="#aaa"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="field-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="show-pass-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 3l18 18M10.5 10.677A3 3 0 0113.323 13.5M6.362 6.368A9.955 9.955 0 002.1 12c1.69 4.07 5.73 7 9.9 7a9.95 9.95 0 005.638-1.738M9 5.34A9.946 9.946 0 0112 5c4.17 0 8.21 2.93 9.9 7a10.036 10.036 0 01-2.415 3.585"
                        stroke="#aaa"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2.1 12C3.79 7.93 7.83 5 12 5s8.21 2.93 9.9 7c-1.69 4.07-5.73 7-9.9 7S3.79 16.07 2.1 12z"
                        stroke="#aaa"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="#aaa"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="remember-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  name="remember"
                  className="remember-check"
                  checked={form.remember}
                  onChange={handleChange}
                />
                <span className="checkmark" />
                Remember me
              </label>
              <a href="#" className="forgot-link">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`login-btn ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Sign In"}
            </button>

            {/* Go to Register */}
            <p className="back-to-login">
              Don't have an account?{" "}
              <button
                type="button"
                className="back-link"
                onClick={onGoRegister}
              >
                Create one
              </button>
            </p>
          </form>

          <p className="login-footer">
            StockWave &copy; {new Date().getFullYear()} &mdash; Touchless
            Inventory System
          </p>
        </div>
      </div>
    </div>
  );
}