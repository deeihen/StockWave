import { useState, useEffect, useRef, useCallback } from "react";
import "./Login.css";
import { loginUser } from "../api/stockwaveApi";
import { useActionGuard } from "../hooks/useActionGuard";
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Camera,
  RefreshCcw,
  AlertCircle,
  ScanQrCode,
  LayoutDashboard
} from "lucide-react";

export default function Login({ onLoginSuccess, onGoRegister }) {
  const [activeTab, setActiveTab] = useState("credentials");
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { run, isRunning } = useActionGuard(500);

  // QR Scan state
  const [qrActive, setQrActive] = useState(false);
  const [qrError, setQrError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScanRef = useRef({ value: "", count: 0, at: 0 });

  const QR_CONFIRMATION_COUNT = 3;
  const QR_SCAN_INTERVAL_MS = 250;

  const stopQrScan = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    lastScanRef.current = { value: "", count: 0, at: 0 };
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const markQrCandidate = useCallback(
    (value) => {
      const trimmed = value.trim();
      if (!trimmed) return false;

      const now = Date.now();
      const previous = lastScanRef.current;
      const sameValue = previous.value === trimmed && now - previous.at < 1500;
      const nextCount = sameValue ? previous.count + 1 : 1;

      lastScanRef.current = {
        value: trimmed,
        count: nextCount,
        at: now,
      };

      return nextCount >= QR_CONFIRMATION_COUNT;
    },
    []
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Parse QR code data in multiple formats
  const parseQrCredentials = useCallback((rawValue) => {
    if (!rawValue || typeof rawValue !== "string") return null;

    // Try JSON format: {"username":"user","password":"pass"}
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed.username && parsed.password) {
        return { username: parsed.username, password: parsed.password };
      }
    } catch {
      // Not JSON format, try next format
    }

    // Try URL format: stockwave://login?u=user&p=pass or https://...?u=user&p=pass
    try {
      const url = new URL(rawValue);
      const u = url.searchParams.get("u") || url.searchParams.get("username");
      const p = url.searchParams.get("p") || url.searchParams.get("password");
      if (u && p) return { username: u, password: p };
    } catch {
      // Not a URL format, try next format
    }

    // Try separator formats: "user:pass", "user|pass", "user,pass"
    const separators = [":", "|", ","];
    for (const sep of separators) {
      const trimmed = rawValue.trim();
      const idx = trimmed.indexOf(sep);
      if (idx > 0) {
        const username = trimmed.slice(0, idx).trim();
        const password = trimmed.slice(idx + 1).trim();
        if (username && password) return { username, password };
      }
    }

    return null;
  }, []);

  const loginWithCredentials = useCallback(
    async (username, password, errorTarget = "form") => {
      await run("login", async () => {
        setLoading(true);
        setError("");
        setQrError("");
        setQrActive(false);
        stopQrScan();

        try {
          const res = await loginUser({ username, password });
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          if (onLoginSuccess) onLoginSuccess();
        } catch (err) {
          const message = err.response?.data?.message || "Invalid username or password.";
          if (errorTarget === "qr") setQrError(message);
          else setError(message);
        } finally {
          setLoading(false);
        }
      });
    },
      [stopQrScan, onLoginSuccess, run]
  );

  const handleQrLogin = useCallback(
    async (rawValue) => {
      const creds = parseQrCredentials(rawValue);
      if (!creds) {
        setQrError("QR code not recognized. Use username:password or stockwave://login?u=...&p=...");
        return;
      }

      await loginWithCredentials(creds.username, creds.password, "qr");
    },
    [parseQrCredentials, loginWithCredentials]
  );

  // QR Scanning Effect
  useEffect(() => {
    if (!qrActive) {
      stopQrScan();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      window.setTimeout(() => {
        setQrError("Camera access is not available on this device.");
        setQrActive(false);
      }, 0);
      return;
    }

    let cancelled = false;

    const loadJsQrFromCdn = () =>
      new Promise((resolve, reject) => {
        if (window.jsQR) return resolve(window.jsQR);
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
        script.async = true;
        script.onload = () => resolve(window.jsQR);
        script.onerror = () => reject(new Error("Failed to load jsQR from CDN"));
        document.head.appendChild(script);
      });

    const start = async () => {
      try {
        setQrError("");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Prefer native BarcodeDetector when available (faster/hardware-accelerated)
        if (window.BarcodeDetector) {
          try {
            const detector = new BarcodeDetector({ formats: ["qr_code"] });
            const scanFrame = async () => {
              if (cancelled || !videoRef.current) return;

              if (scanIntervalRef.current) return;

              try {
                const codes = await detector.detect(videoRef.current);
                if (codes && codes.length > 0) {
                  const value = codes[0]?.rawValue || "";
                  if (value && markQrCandidate(value)) {
                    stopQrScan();
                    setQrActive(false);
                    handleQrLogin(value);
                    return;
                  }
                  if (!value) {
                    setQrError("QR code is empty.");
                  }
                }
              } catch (scanErr) {
                // fall through to jsQR fallback
                console.warn("BarcodeDetector failed, falling back to jsQR:", scanErr);
              }
              scanIntervalRef.current = window.setTimeout(() => {
                scanIntervalRef.current = null;
                rafRef.current = requestAnimationFrame(scanFrame);
              }, QR_SCAN_INTERVAL_MS);
            };
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
          } catch (bdErr) {
            console.warn("BarcodeDetector initialization failed:", bdErr);
            // continue to fallback
          }
        }

        let jsqr = window.jsQR;
        if (!jsqr) {
          try {
            jsqr = await loadJsQrFromCdn();
          } catch {
            stopQrScan();
            setQrActive(false);
            setQrError("QR scanner library failed to load.");
            return;
          }
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const scanFrame = () => {
          if (cancelled || !videoRef.current) return;

          if (scanIntervalRef.current) return;

          try {
            const videoWidth = videoRef.current.videoWidth || 0;
            const videoHeight = videoRef.current.videoHeight || 0;
            if (videoWidth < 240 || videoHeight < 240) {
              scanIntervalRef.current = window.setTimeout(() => {
                scanIntervalRef.current = null;
                rafRef.current = requestAnimationFrame(scanFrame);
              }, QR_SCAN_INTERVAL_MS);
              return;
            }

            const minSide = Math.min(videoWidth, videoHeight);
            const cropSize = Math.floor(minSide * 0.75);
            const sourceX = Math.max(0, Math.floor((videoWidth - cropSize) / 2));
            const sourceY = Math.max(0, Math.floor((videoHeight - cropSize) / 2));

            canvas.width = cropSize;
            canvas.height = cropSize;
            ctx.drawImage(videoRef.current, sourceX, sourceY, cropSize, cropSize, 0, 0, cropSize, cropSize);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsqr(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              const rawValue = code.data.trim();
              if (markQrCandidate(rawValue)) {
                stopQrScan();
                setQrActive(false);
                handleQrLogin(rawValue);
                return;
              }
            }
          } catch (err) {
            console.error("QR scan error:", err);
          }
          scanIntervalRef.current = window.setTimeout(() => {
            scanIntervalRef.current = null;
            rafRef.current = requestAnimationFrame(scanFrame);
          }, QR_SCAN_INTERVAL_MS);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        stopQrScan();
        setQrActive(false);
        setQrError("Failed to start camera: " + err.message);
      }
    };

    start();

    return () => {
      cancelled = true;
      stopQrScan();
    };
  }, [qrActive, handleQrLogin, markQrCandidate, stopQrScan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    await loginWithCredentials(form.username, form.password, "form");
  };

  const toggleQr = () => {
    if (loading) return;
      run("qr-toggle", async () => {
        setQrError("");
        setQrActive((v) => !v);
      });
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError("");
    setQrError("");
    setQrActive(false);
    stopQrScan();
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
            Manage your inventory smarter with voice controls and QR sign-in.
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
              <LayoutDashboard size={28} color="#059669" />
            </div>
            <span className="logo-text">StockWave</span>
          </div>

          <h2 className="login-heading">Welcome back</h2>
          <p className="login-sub">Sign in to your account to continue</p>

          <div className="login-tabs" role="tablist" aria-label="Login options">
            <button
              type="button"
              className={`login-tab ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => switchTab("credentials")}
              role="tab"
              aria-selected={activeTab === "credentials"}
            >
              Credentials
            </button>
            <button
              type="button"
              className={`login-tab ${activeTab === "qr" ? "active" : ""}`}
              onClick={() => switchTab("qr")}
              role="tab"
              aria-selected={activeTab === "qr"}
            >
              QR Scan
            </button>
          </div>

          {activeTab === "credentials" && error && (
            <div className="login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {activeTab === "credentials" && (
            <form className="login-form" onSubmit={handleSubmit}>
              {/* Username */}
              <div className="field-group">
                <label className="field-label" htmlFor="username">
                  Username
                </label>
                <div className="field-wrap">
                  <UserIcon className="field-icon" size={18} color="#aaa" />
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
                  <Lock className="field-icon" size={18} color="#aaa" />
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
                    {showPassword ? <EyeOff size={18} color="#aaa" /> : <Eye size={18} color="#aaa" />}
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
                disabled={loading || isRunning("login")}
              >
                {loading ? <RefreshCcw className="spinner" size={20} /> : "Sign In"}
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
          )}

          {activeTab === "qr" && (
            <div className="qr-login">
              <div className="qr-head">
                <p className="qr-title">Scan QR to sign in</p>
                <p className="qr-sub">Use a QR code generated by your admin or mobile app.</p>
              </div>
              <div className={`qr-frame ${qrActive ? "active" : ""}`}>
                {qrActive ? (
                  <video ref={videoRef} className="qr-video" />
                ) : (
                  <div className="qr-placeholder">
                    <div className="qr-icon-wrap">
                      <ScanQrCode size={48} color="#e5e7eb" />
                    </div>
                    <p>Camera is off</p>
                  </div>
                )}
              </div>
              {qrError && <div className="qr-error"><AlertCircle size={16} /> {qrError}</div>}
              <div className="qr-actions">
                <button type="button" className="qr-btn" onClick={toggleQr} disabled={loading || isRunning("qr-toggle") || isRunning("login")}>
                  {qrActive ? "Stop scan" : <><Camera size={16} style={{marginRight: 6}}/> Start scan</>}
                </button>
                {qrActive && <span className="qr-status">Scanning...</span>}
              </div>
              <p className="qr-hint">
                Accepted QR format: username:password, stockwave://login?u=...&p=..., or JSON.
              </p>
            </div>
          )}

          <p className="login-footer">
            StockWave &copy; {new Date().getFullYear()} &mdash; Touchless
            Inventory System
          </p>
        </div>
      </div>
    </div>
  );
}