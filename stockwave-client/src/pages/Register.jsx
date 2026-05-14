import { useEffect, useState } from "react";
import "./Register.css";
import { registerUser } from "../api/stockwaveApi";
import { useActionGuard } from "../hooks/useActionGuard";
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LayoutDashboard,
  Hand,
  Mic,
  BarChart3,
  AlertCircle
} from "lucide-react";

export default function Register({ onGoLogin }) {
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { run, isRunning } = useActionGuard(500);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    await run("register", async () => {
      setLoading(true);
      setError("");

      try {
        await registerUser({
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          password: form.password
        });
        setSuccess(true);
      } catch (err) {
        setError(err.response?.data?.message || "Registration failed. Try again.");
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    if (success) {
      onGoLogin();
    }
  }, [success, onGoLogin]);

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
              <span className="feat-icon"><Hand size={18} /></span>
              <span>Gesture-based controls</span>
            </li>
            <li>
              <span className="feat-icon"><Mic size={18} /></span>
              <span>Voice command support</span>
            </li>
            <li>
              <span className="feat-icon"><BarChart3 size={18} /></span>
              <span>Real-time inventory reports</span>
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
              <LayoutDashboard size={24} />
            </div>
            <span className="logo-text">StockWave</span>
          </div>

          <h2 className="reg-heading">Create your account</h2>
          <p className="reg-sub">Fill in your details to get started</p>

          {error && (
            <div className="reg-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="reg-form" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="field-group">
              <label className="field-label" htmlFor="fullName">Full Name</label>
              <div className="field-wrap">
                <UserIcon className="field-icon" size={18} color="#aaa" />
                <input
                  id="fullName" name="fullName" type="text"
                  className="field-input" placeholder="Your full name"
                  value={form.fullName} onChange={handleChange}
                />
              </div>
            </div>

            {/* Username */}
            <div className="field-group">
              <label className="field-label" htmlFor="username">Username</label>
              <div className="field-wrap">
                <UserIcon className="field-icon" size={18} color="#aaa" />
                <input
                  id="username" name="username" type="text"
                  className="field-input" placeholder="username"
                  value={form.username} onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div className="field-group">
              <label className="field-label" htmlFor="email">Email Address</label>
              <div className="field-wrap">
                <Mail className="field-icon" size={18} color="#aaa" />
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
                <Lock className="field-icon" size={18} color="#aaa" />
                <input
                  id="password" name="password"
                  type={showPassword ? "text" : "password"}
                  className="field-input" placeholder="Min. 6 characters"
                  value={form.password} onChange={handleChange}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} color="#aaa" /> : <Eye size={18} color="#aaa" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="field-group">
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="field-wrap">
                <Lock className="field-icon" size={18} color="#aaa" />
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  className="field-input" placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={handleChange}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={18} color="#aaa" /> : <Eye size={18} color="#aaa" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="reg-btn" disabled={loading || isRunning("register")}>
              {loading ? <div className="spinner" /> : "Create Account"}
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
