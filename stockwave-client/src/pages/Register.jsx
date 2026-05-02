import { useState } from "react";
import "./Register.css";

export default function Register({ onGoLogin }) {
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "staff",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!form.fullName || !form.username || !form.email || !form.password || !form.confirmPassword)
      return "Please fill in all fields.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address.";
    if (form.password.length < 6)
      return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");

    // Simulate API call — replace with real /api/auth/register later
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="reg-root">
        <div className="reg-success-wrap">
          <div className="reg-success-card">
            <div className="success-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#e8f5ee"/>
                <path d="M12 20l6 6 10-12" stroke="#1a6b3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="success-title">Account Created!</h2>
            <p className="success-sub">Your StockWave account is ready. You can now sign in.</p>
            <button className="success-btn" onClick={onGoLogin}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-root">
      {/* Left Panel */}
      <div className="reg-left">
        <div className="reg-left-inner">
          <div className="brand-badge">Create Account</div>
          <h1 className="brand-title">Join<br /><span>StockWave</span></h1>
          <p className="brand-sub">
            Set up your account and start managing inventory with touchless controls.
          </p>
          <ul className="feature-list">
            <li>
              <span className="feat-icon"></span>
              <span>Gesture-based controls</span>
            </li>
            <li>
              <span className="feat-icon"></span>
              <span>Voice command support</span>
            </li>
            <li>
              <span className="feat-icon"></span>
              <span>Real-time inventory reports</span>
            </li>
            <li>
              <span className="feat-icon"></span>
              <span>Role-based access control</span>
            </li>
          </ul>
        </div>
        <div className="left-decoration">
          <div className="deco-circle c1" />
          <div className="deco-circle c2" />
          <div className="deco-circle c3" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="reg-right">
        <div className="reg-card">
          {/* Logo */}
          <div className="reg-logo">
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="12" height="12" rx="2" fill="#1a6b3c"/>
                <rect x="16" width="12" height="12" rx="2" fill="#1a6b3c" opacity="0.5"/>
                <rect y="16" width="12" height="12" rx="2" fill="#1a6b3c" opacity="0.5"/>
                <rect x="16" y="16" width="12" height="12" rx="2" fill="#1a6b3c"/>
              </svg>
            </div>
            <span className="logo-text">StockWave</span>
          </div>

          <h2 className="reg-heading">Create your account</h2>
          <p className="reg-sub">Fill in your details to get started</p>

          {error && (
            <div className="reg-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#c0392b" strokeWidth="1.5"/>
                <path d="M8 4.5v4M8 10.5v1" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form className="reg-form" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="field-group">
              <label className="field-label" htmlFor="fullName">Full Name</label>
              <div className="field-wrap">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#aaa" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="fullName" name="fullName" type="text"
                  className="field-input" placeholder="Your full name"
                  value={form.fullName} onChange={handleChange}
                />
              </div>
            </div>

            {/* Two columns: Username + Role */}
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="username">Username</label>
                <div className="field-wrap">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="#aaa" strokeWidth="1.5"/>
                  </svg>
                  <input
                    id="username" name="username" type="text"
                    className="field-input" placeholder="username"
                    value={form.username} onChange={handleChange}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="role">Role</label>
                <div className="field-wrap">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3 6.5L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l7-.8L12 2z" stroke="#aaa" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  <select
                    id="role" name="role"
                    className="field-input field-select"
                    value={form.role} onChange={handleChange}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="field-group">
              <label className="field-label" htmlFor="email">Email Address</label>
              <div className="field-wrap">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="#aaa" strokeWidth="1.5"/>
                  <path d="M2 8l10 7 10-7" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="email" name="email" type="email"
                  className="field-input" placeholder="you@email.com"
                  value={form.email} onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="field-wrap">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#aaa" strokeWidth="1.5"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="password" name="password"
                  type={showPassword ? "text" : "password"}
                  className="field-input" placeholder="Min. 6 characters"
                  value={form.password} onChange={handleChange}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.5 10.677A3 3 0 0113.323 13.5M6.362 6.368A9.955 9.955 0 002.1 12c1.69 4.07 5.73 7 9.9 7a9.95 9.95 0 005.638-1.738M9 5.34A9.946 9.946 0 0112 5c4.17 0 8.21 2.93 9.9 7a10.036 10.036 0 01-2.415 3.585" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2.1 12C3.79 7.93 7.83 5 12 5s8.21 2.93 9.9 7c-1.69 4.07-5.73 7-9.9 7S3.79 16.07 2.1 12z" stroke="#aaa" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#aaa" strokeWidth="1.5"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="field-wrap">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#aaa" strokeWidth="1.5"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  className="field-input" placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={handleChange}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                  {showConfirm
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.5 10.677A3 3 0 0113.323 13.5M6.362 6.368A9.955 9.955 0 002.1 12c1.69 4.07 5.73 7 9.9 7a9.95 9.95 0 005.638-1.738M9 5.34A9.946 9.946 0 0112 5c4.17 0 8.21 2.93 9.9 7a10.036 10.036 0 01-2.415 3.585" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2.1 12C3.79 7.93 7.83 5 12 5s8.21 2.93 9.9 7c-1.69 4.07-5.73 7-9.9 7S3.79 16.07 2.1 12z" stroke="#aaa" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#aaa" strokeWidth="1.5"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="reg-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : "Create Account"}
            </button>

            {/* Back to Login */}
            <p className="back-to-login">
              Already have an account?{" "}
              <button type="button" className="back-link" onClick={onGoLogin}>
                Sign in
              </button>
            </p>
          </form>

          <p className="reg-footer">
            StockWave &copy; {new Date().getFullYear()} &mdash; Touchless Inventory System
          </p>
        </div>
      </div>
    </div>
  );
}