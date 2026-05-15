import { useState, useEffect } from "react";
import "./Settings.css";
import {
  changeMyPassword,
  updateSecuritySettings,
  clearActivityLogs,
  resetSystem,
  updateUser,
  createStaff,
  getMyStaff,
  deleteStaff,
  toggleStaffStatus,
  resetStaffPassword,
  updateMyProfile,
  getMyProfile,                // ← NEW
} from "../api/stockwaveApi";
import { useActionGuard } from "../hooks/useActionGuard";
import {
  User as UserIcon,
  Settings as SettingsIcon,
  Bell,
  Lock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  Globe,
  Clock,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  Plus,
  Badge,
  ExternalLink,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
  X,
  KeyRound,
  Download,                    // ← NEW
  ScanQrCode,                  // ← NEW
} from "lucide-react";

const tabs = [
  { id: "profile",       label: "Account Profile",   icon: UserIcon },
  { id: "system",        label: "General Settings",  icon: SettingsIcon },
  { id: "notifications", label: "Notifications",     icon: Bell },
  { id: "security",      label: "Security & Safety", icon: Lock },
  { id: "staff",         label: "Staff Accounts",    icon: Users, adminOnly: true },
];

function Toggle({ checked, onChange }) {
  return (
    <button type="button" className={`toggle-switch ${checked ? "on" : "off"}`} onClick={() => onChange(!checked)}>
      <span className="toggle-thumb" />
    </button>
  );
}

function Section({ title, sub, icon: Icon, children }) {
  return (
    <div className="settings-section">
      <div className="section-header">
        <div className="section-title-wrap">
          {Icon && <Icon size={18} className="section-icon" />}
          <h3 className="section-title">{title}</h3>
        </div>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

function FieldRow({ label, sub, children }) {
  return (
    <div className="field-row">
      <div className="field-row-label">
        <p className="frl-title">{label}</p>
        {sub && <p className="frl-sub">{sub}</p>}
      </div>
      <div className="field-row-control">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Shared avatar colour helper
// ─────────────────────────────────────────────────────
const STAFF_COLORS = ["#059669", "#10b981", "#34d399", "#065f46", "#064e3b"];
const avatarColor = (name) =>
  STAFF_COLORS[((name || "?").charCodeAt(0) || 0) % STAFF_COLORS.length];
const avatarInitial = (name) =>
  ((name || "?")[0] || "?").toUpperCase();

// ─────────────────────────────────────────────────────
// View Staff Modal
// ─────────────────────────────────────────────────────
function ViewStaffModal({ staff, onClose, onResetPassword, isAdmin }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Staff Information</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="profile-detail-header">
            <div className="usr-avatar large" style={{ background: avatarColor(staff.fullName) }}>
              {avatarInitial(staff.fullName)}
            </div>
            <div className="profile-detail-info">
              <h2 className="profile-name">{staff.fullName}</h2>
              <p className="profile-username">@{staff.username}</p>
              <span className={`status-dot-badge ${(staff.status || "").toLowerCase()}`}>
                <span className="sdot" />{staff.status}
              </span>
            </div>
          </div>

          <div className="profile-detail-grid">
            <div className="detail-item">
              <div className="detail-label-wrap"><Mail size={14} /><span>Email</span></div>
              <p className="detail-value">{staff.email || "Not provided"}</p>
            </div>
            <div className="detail-item">
              <div className="detail-label-wrap"><Phone size={14} /><span>Phone</span></div>
              <p className="detail-value">{staff.phoneNumber || "None"}</p>
            </div>
            <div className="detail-item">
              <div className="detail-label-wrap"><Badge size={14} /><span>Identifier</span></div>
              <p className="detail-value">{staff.identifier}</p>
            </div>
            <div className="detail-item">
              <div className="detail-label-wrap"><Clock size={14} /><span>Last Login</span></div>
              <p className="detail-value">{staff.lastLogin || "Never"}</p>
            </div>
            <div className="detail-item full">
              <div className="detail-label-wrap"><Briefcase size={14} /><span>Biography</span></div>
              <p className="detail-value bio-text">{staff.bio || "No description provided."}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {/* FIX: password is never returned by the API, so show Reset Password instead */}
          {isAdmin && (
            <button className="btn-reset-pass" onClick={() => onResetPassword(staff)}>
              <KeyRound size={14} /> Reset Password
            </button>
          )}
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Reset Password Modal  (NEW)
// ─────────────────────────────────────────────────────
function ResetPasswordModal({ staff, onClose, onConfirm }) {
  const [newPass,      setNewPass]      = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!newPass.trim())          { setError("New password is required.");              return; }
    if (newPass.length < 6)       { setError("Password must be at least 6 characters."); return; }
    if (newPass !== confirm)      { setError("Passwords do not match.");               return; }

    setLoading(true);
    try {
      await onConfirm(newPass);
      // parent handles closing / success toast
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reset Staff Password</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <p className="reset-pass-hint">
            Setting a new password for <strong>{staff.fullName}</strong>{" "}
            <span style={{ color: "var(--text-muted)" }}>(@{staff.username})</span>. Share it
            with them securely after resetting.
          </p>

          {error && <div className="pass-error-alt">{error}</div>}

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="form-label">New Password</label>
            <div className="input-with-icon">
              <input
                className="form-input"
                type={showNew ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                style={{ paddingLeft: 12, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                style={{ position: "absolute", right: 12, left: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", display: "flex" }}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Confirm Password</label>
            <div className="input-with-icon">
              <input
                className="form-input"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={{ paddingLeft: 12, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{ position: "absolute", right: 12, left: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", display: "flex" }}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Staff Tab
// ─────────────────────────────────────────────────────
function StaffTab({ isAdmin }) {
  const [staffList, setStaffList] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Separate states: create form vs directory — avoids double-display of messages
  const [form,       setForm]      = useState({ fullName: "", username: "", password: "", email: "" });
  const [showPass,   setShowPass]  = useState(false);
  const [creating,   setCreating]  = useState(false);
  const [createErr,  setCreateErr] = useState("");
  const [createOk,   setCreateOk]  = useState("");

  const [listErr,    setListErr]   = useState("");
  const [listOk,     setListOk]    = useState("");

  // modal: null | { type: "view"|"reset", staff }
  const [modal, setModal] = useState(null);

  // ── load staff list ──────────────────────────────
  const loadStaff = async () => {
    setLoading(true);
    setListErr("");
    try {
      const res = await getMyStaff();
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setListErr("Failed to load staff. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  // ── create ───────────────────────────────────────
  const handleCreate = async () => {
    setCreateErr(""); setCreateOk("");
    if (!form.fullName.trim() || !form.username.trim() || !form.password.trim()) {
      setCreateErr("Full name, username, and password are required."); return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setCreateErr("Please enter a valid email address."); return;
    }
    if (form.password.length < 6) {
      setCreateErr("Password must be at least 6 characters."); return;
    }
    setCreating(true);
    try {
      const payload = { fullName: form.fullName, username: form.username, password: form.password };
      if (form.email.trim()) payload.email = form.email.trim();
      const res = await createStaff(payload);
      const created = res.data?.staff;
      setCreateOk(
        `Staff "${created?.fullName ?? form.fullName}" created! Identifier: ${created?.identifier ?? ""}`
      );
      setForm({ fullName: "", username: "", password: "", email: "" });
      await loadStaff();  // FIX: await so list refreshes before spinner disappears
    } catch (err) {
      setCreateErr(err.response?.data?.message || "Failed to create staff.");
    } finally {
      setCreating(false);
    }
  };

  // ── delete ───────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove staff account "${name}"? This cannot be undone.`)) return;
    try {
      await deleteStaff(id);
      setStaffList(prev => prev.filter(s => s.id !== id));
      setListOk(`"${name}" has been removed.`);
      setModal(null);
    } catch {
      setListErr("Failed to remove staff.");
    }
  };

  // ── toggle status ────────────────────────────────
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await toggleStaffStatus(id, newStatus);
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch {
      setListErr("Failed to update status.");
    }
  };

  // ── reset password (NEW) ─────────────────────────
  const handleResetPassword = async (staffId, newPassword) => {
    await resetStaffPassword(staffId, { newPassword });
    // On success, close modal and show toast
    const name = modal?.staff?.fullName ?? "";
    setModal(null);
    setListOk(`Password for "${name}" has been reset successfully.`);
  };

  // ─────────────────────────────────────────────────
  return (
    <div className="tab-pane">

      {/* ── Create Staff (Admin Only) ── */}
      {isAdmin && (
        <Section title="Create Staff Account" sub="Staff share your workspace data" icon={Plus}>
          {createErr && <div className="pass-error-alt">{createErr}</div>}
          {createOk  && <div className="pass-success-alt"><CheckCircle size={14} /> {createOk}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="e.g. Juan dela Cruz"
                value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="e.g. juan_staff"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon-abs" />
                <input className="form-input" type="email" placeholder="staff@example.com (optional)"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <input
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingLeft: 12, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 12, left: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", display: "flex" }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
          <div className="staff-identifier-note">
            <Badge size={13} />
            A unique identifier (e.g. <code>.waveKx9m</code>) will be auto-generated for this staff.
          </div>
          <div className="section-actions">
            <button className="btn-save" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Staff Account"}
            </button>
          </div>
        </Section>
      )}

      {/* ── Staff Directory ── */}
      <Section
        title={isAdmin ? "Your Staff" : "Staff Directory"}
        sub={`${staffList.length} account${staffList.length !== 1 ? "s" : ""} in your workspace`}
        icon={Users}
      >
        {listErr && <div className="pass-error-alt">{listErr}</div>}
        {listOk  && <div className="pass-success-alt"><CheckCircle size={14} /> {listOk}</div>}

        {loading ? (
          <p className="frl-sub" style={{ padding: "12px 0" }}>Loading staff...</p>
        ) : staffList.length === 0 ? (
          <div className="staff-empty">
            <Users size={32} opacity={0.3} />
            <p>{isAdmin ? "No staff accounts yet. Create one above." : "No staff accounts available."}</p>
          </div>
        ) : (
          <div className="staff-grid">
            {staffList.map(s => (
              <div
                key={s.id}
                className="staff-card"
                onClick={() => setModal({ type: "view", staff: s })}
              >
                <div className="staff-card-top">
                  {/* FIX: null-safe avatar — no crash when fullName is missing */}
                  <div
                    className="staff-card-avatar"
                    style={{ background: avatarColor(s.fullName) }}
                  >
                    {avatarInitial(s.fullName)}
                  </div>

                  {isAdmin && (
                    <div className="staff-card-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="act-btn"
                        onClick={() => handleToggleStatus(s.id, s.status)}
                        title={s.status === "Active" ? "Deactivate" : "Activate"}
                      >
                        {s.status === "Active" ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        className="act-btn del"
                        onClick={() => handleDelete(s.id, s.fullName)}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="staff-card-name">{s.fullName || "(No name)"}</h3>
                <p className="staff-card-username">@{s.username}</p>
                <p className="staff-card-identifier">{s.identifier}</p>

                <div className="staff-card-bottom">
                  <span className={`status-dot-badge ${(s.status || "").toLowerCase()}`}>
                    <span className="sdot" />{s.status}
                  </span>
                  <button className="view-profile-link">
                    View <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── View Modal ── */}
      {modal?.type === "view" && (
        <ViewStaffModal
          staff={modal.staff}
          onClose={() => setModal(null)}
          isAdmin={isAdmin}
          onResetPassword={(staff) => setModal({ type: "reset", staff })}
        />
      )}

      {/* ── Reset Password Modal (NEW) ── */}
      {modal?.type === "reset" && (
        <ResetPasswordModal
          staff={modal.staff}
          onClose={() => setModal(null)}
          onConfirm={(newPassword) => handleResetPassword(modal.staff.id, newPassword)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main Settings Component
// ─────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved]         = useState(false);
  const { run, isRunning }        = useActionGuard(500);

  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "Admin";

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  const [profile, setProfile] = useState(() => ({
    id:       user.id,
    name:     user.fullName    || "",
    username: user.username    || "",
    email:    user.email       || "",
    phone:    user.phoneNumber || "",
    role:     user.role        || "Admin",
    bio:      user.bio         || "",
  }));

  const handleSaveProfile = async () => {
    await run("save-profile", async () => {
      try {
        let res;
        if (isAdmin) {
          // Admin uses the full update endpoint
          res = await updateUser(profile.id, {
            fullName:    profile.name,
            username:    profile.username,
            email:       profile.email,
            phoneNumber: profile.phone,
            bio:         profile.bio
          });
        } else {
          // Staff uses the self-service profile endpoint
          res = await updateMyProfile({
            fullName:    profile.name,
            email:       profile.email,
            phoneNumber: profile.phone,
            bio:         profile.bio
          });
        }
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        // Update local user object with returned data including QrToken
        const updatedUser = { ...u, ...res.data.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        showSaved();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to update profile.");
      }
    });
  };

  const handleDownloadQr = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.qrToken || user.QrToken}`;
    fetch(qrUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `StockWave_QR_${user.username}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(() => alert("Failed to download QR code."));
  };

  const [system, setSystem] = useState({
    companyName: "StockWave Inventory", currency: "PHP",
    timezone: "Asia/Manila", lowStockThreshold: 10,
    language: "English", dateFormat: "MM/DD/YYYY",
  });

  const [notif, setNotif] = useState({
    lowStockAlert: true, newUserAlert: true,
    reportReady: false, emailDigest: true,
    browserNotif: false, restockReminder: true,
  });

  const [security, setSecurity] = useState(() => ({
    twoFactor:      user.twoFactorEnabled      || false,
    sessionTimeout: user.sessionTimeoutMinutes?.toString() || "30",
    loginAlerts:    user.loginAlertsEnabled !== false,
  }));

  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [passwords, setPasswords]             = useState({ current: "", newPass: "", confirm: "" });
  const [passError,  setPassError]            = useState("");
  const [passSuccess, setPassSuccess]         = useState(false);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  // Fetch latest profile data on mount to ensure QrToken is present
  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const res = await getMyProfile();
        const updatedUser = { ...user, ...res.data.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Update local state if needed
        setProfile(p => ({
          ...p,
          name:     res.data.user.fullName    || p.name,
          username: res.data.user.username    || p.username,
          email:    res.data.user.email       || p.email,
          phone:    res.data.user.phoneNumber || p.phone,
          bio:      res.data.user.bio         || p.bio,
        }));
      } catch (err) {
        console.error("Failed to refresh profile:", err);
      }
    };
    refreshProfile();
  }, []);

  const handlePasswordChange = async () => {
    setPassError(""); setPassSuccess(false);
    if (!passwords.current || !passwords.newPass || !passwords.confirm) { setPassError("Please fill in all password fields."); return; }
    if (passwords.newPass.length < 6) { setPassError("New password must be at least 6 characters."); return; }
    if (passwords.newPass !== passwords.confirm) { setPassError("New passwords do not match."); return; }
    await run("change-password", async () => {
      try {
        await changeMyPassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
        setPassSuccess(true);
        setPasswords({ current: "", newPass: "", confirm: "" });
      } catch (err) {
        setPassError(err.response?.data?.message || "Failed to update password.");
      }
    });
  };

  const handleSecurityUpdate = async () => {
    await run("save-security", async () => {
      setSecurityLoading(true); setSecurityMessage("");
      try {
        await updateSecuritySettings({
          twoFactorEnabled:      security.twoFactor,
          sessionTimeoutMinutes: parseInt(security.sessionTimeout),
          loginAlertsEnabled:    security.loginAlerts,
        });
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.twoFactorEnabled = security.twoFactor;
        u.sessionTimeoutMinutes = parseInt(security.sessionTimeout);
        u.loginAlertsEnabled = security.loginAlerts;
        localStorage.setItem("user", JSON.stringify(u));
        setSecurityMessage("Security settings updated.");
      } catch (err) {
        setSecurityMessage(err.response?.data?.message || "Failed to update.");
      } finally {
        setSecurityLoading(false);
      }
    });
  };

  const handleClearLogs   = async () => { if (window.confirm("Wipe all activity logs?"))           { try { await clearActivityLogs(); showSaved(); } catch { alert("Failed."); } } };
  const handleResetSystem = async () => { if (window.confirm("Factory reset all system settings?")) { try { await resetSystem();      showSaved(); } catch { alert("Failed."); } } };

  return (
    <div className="settings-root">
      {saved && (
        <div className="settings-toast">
          <CheckCircle size={16} /> Changes saved
        </div>
      )}

      <div className="settings-layout">
        {/* ── Sidebar Tabs ── */}
        <aside className="settings-sidebar">
          <p className="settings-sidebar-label">Preferences</p>
          {visibleTabs.map(t => (
            <button
              key={t.id}
              className={`settings-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <t.icon size={16} />
              {t.label}
              {t.id === "staff" && <span className="staff-tab-badge">Admin</span>}
            </button>
          ))}
        </aside>

        {/* ── Content ── */}
        <div className="settings-content">

          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className="tab-pane">
              <Section title="Personal Information" sub="Your public profile details" icon={UserIcon}>
                <div className="profile-role-badge">
                  <span className={`role-pill ${profile.role.toLowerCase()}`}>{profile.role}</span>
                  {user.identifier && <span className="identifier-pill">{user.identifier}</span>}
                </div>
                <div className="form-grid">
                  <div className="form-field full">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={profile.name}
                      onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Username</label>
                    <input className="form-input" value={profile.username}
                      onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email Address</label>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon-abs" />
                      <input className="form-input" type="email" value={profile.email}
                        onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Phone Number</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-icon-abs" />
                      <input className="form-input" value={profile.phone}
                        onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-field full">
                    <label className="form-label">Biography</label>
                    <textarea className="form-input form-textarea" placeholder="Tell us about yourself..."
                      value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
                  </div>
                </div>
              </Section>

              {/* QR LOGIN SECTION */}
              <Section title="QR Login Code" sub="Your permanent sign-in key" icon={ScanQrCode}>
                <div className="qr-settings-flex">
                  <div className="qr-settings-preview">
                    {user.qrToken || user.QrToken ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user.qrToken || user.QrToken}`}
                        alt="My QR Login Code"
                        className="qr-img-large"
                      />
                    ) : (
                      <div className="qr-placeholder-settings">
                        <ScanQrCode size={40} opacity={0.2} />
                        <p>Update profile to generate QR</p>
                      </div>
                    )}
                  </div>
                  <div className="qr-settings-info">
                    <p className="qr-info-text">
                      This is your <strong>permanent</strong> login QR code. You can use it to sign in quickly from the login screen without typing your password.
                    </p>
                    <ul className="qr-info-list">
                      <li>One-time generation</li>
                      <li>Secure and unique to your account</li>
                      <li>Keep it private and do not share</li>
                    </ul>
                    <button
                      className="btn-download-qr"
                      onClick={handleDownloadQr}
                      disabled={!(user.qrToken || user.QrToken)}
                    >
                      <Download size={16} /> Save QR Code
                    </button>
                  </div>
                </div>
              </Section>

              <div className="section-actions">
                <button className="btn-save" onClick={handleSaveProfile} disabled={isRunning("save-profile")}>
                  {isRunning("save-profile") ? "Applying..." : "Update Profile"}
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM */}
          {activeTab === "system" && (
            <div className="tab-pane">
              <Section title="System Rules" sub="Defaults and localization" icon={SettingsIcon}>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Inventory Brand</label>
                    <div className="input-with-icon">
                      <Briefcase size={16} className="input-icon-abs" />
                      <input className="form-input" value={system.companyName}
                        onChange={e => setSystem(s => ({ ...s, companyName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Base Currency</label>
                    <select className="form-input" value={system.currency}
                      onChange={e => setSystem(s => ({ ...s, currency: e.target.value }))}>
                      <option value="PHP">Philippine Peso (₱)</option>
                      <option value="USD">US Dollar ($)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Localization</label>
                    <div className="input-with-icon">
                      <Globe size={16} className="input-icon-abs" />
                      <select className="form-input" value={system.timezone}
                        onChange={e => setSystem(s => ({ ...s, timezone: e.target.value }))}>
                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                        <option value="UTC">Universal Time (UTC)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Low Stock Warning</label>
                    <div className="input-with-icon">
                      <AlertTriangle size={16} className="input-icon-abs" />
                      <input className="form-input" type="number" min="1"
                        value={system.lowStockThreshold}
                        onChange={e => setSystem(s => ({ ...s, lowStockThreshold: e.target.value }))} />
                    </div>
                    <p className="field-hint">Threshold for stock alerts</p>
                  </div>
                </div>
              </Section>
              <div className="section-actions">
                <button className="btn-save" onClick={() => run("save-system", async () => showSaved())} disabled={isRunning("save-system")}>
                  Apply Changes
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="tab-pane">
              <Section title="Event Subscriptions" sub="Automated system alerts" icon={Bell}>
                <FieldRow label="Low Stock Inventory" sub="Critical stock level alerts">
                  <Toggle checked={notif.lowStockAlert} onChange={v => setNotif(n => ({ ...n, lowStockAlert: v }))} />
                </FieldRow>
                <FieldRow label="System Activity" sub="Alert on new user registrations">
                  <Toggle checked={notif.newUserAlert} onChange={v => setNotif(n => ({ ...n, newUserAlert: v }))} />
                </FieldRow>
                <FieldRow label="Weekly Digests" sub="Summarized inventory reports">
                  <Toggle checked={notif.emailDigest} onChange={v => setNotif(n => ({ ...n, emailDigest: v }))} />
                </FieldRow>
              </Section>
              <Section title="Communication" sub="Delivery methods" icon={Mail}>
                <FieldRow label="Desktop Notifications" sub="Real-time browser push alerts">
                  <Toggle checked={notif.browserNotif} onChange={v => setNotif(n => ({ ...n, browserNotif: v }))} />
                </FieldRow>
              </Section>
              <div className="section-actions">
                <button className="btn-save" onClick={() => run("save-notif", async () => showSaved())}>
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div className="tab-pane">
              <Section title="Access Control" sub="Password and authentication" icon={ShieldCheck}>
                {passError   && <div className="pass-error-alt">{passError}</div>}
                {passSuccess && <div className="pass-success-alt"><CheckCircle size={14} /> Updated</div>}
                <div className="form-grid">
                  <div className="form-field full">
                    <label className="form-label">Current Password</label>
                    <input className="form-input" type="password" placeholder="••••••••"
                      value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">New Password</label>
                    <input className="form-input" type="password"
                      value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Confirm Password</label>
                    <input className="form-input" type="password"
                      value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
                  </div>
                </div>
                <button className="btn-save-alt" onClick={handlePasswordChange} disabled={isRunning("change-password")}>
                  Update Password
                </button>
              </Section>
              <Section title="Device & Session" sub="Global safety settings" icon={Smartphone}>
                <FieldRow label="Multi-Factor Auth" sub="Additional login protection">
                  <Toggle checked={security.twoFactor} onChange={v => setSecurity(s => ({ ...s, twoFactor: v }))} />
                </FieldRow>
                <FieldRow label="Auto Session Log" sub="Timeout after inactivity">
                  <select className="form-input-compact" value={security.sessionTimeout}
                    onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}>
                    <option value="15">15m</option>
                    <option value="30">30m</option>
                    <option value="0">Off</option>
                  </select>
                </FieldRow>
                {securityMessage && <p className="frl-sub" style={{ marginTop: 8 }}>{securityMessage}</p>}
                <div className="section-actions">
                  <button className="btn-save" onClick={handleSecurityUpdate} disabled={securityLoading}>
                    Apply Security
                  </button>
                </div>
              </Section>
              <div className="danger-zone-alt">
                <div className="dz-header">
                  <AlertTriangle size={18} color="#be123c" />
                  <h3 className="dz-title">Critical Actions</h3>
                </div>
                <div className="danger-item">
                  <div className="dz-text">
                    <p className="dz-item-title">Wipe Activity Logs</p>
                    <p className="dz-item-sub">Permanent deletion of history</p>
                  </div>
                  <button className="btn-danger-alt" onClick={handleClearLogs}><Trash2 size={14} /> Wipe</button>
                </div>
                <div className="danger-item">
                  <div className="dz-text">
                    <p className="dz-item-title">Factory Reset</p>
                    <p className="dz-item-sub">Revert all system configurations</p>
                  </div>
                  <button className="btn-danger-alt" onClick={handleResetSystem}>Reset</button>
                </div>
              </div>
            </div>
          )}

          {/* STAFF — Admin only */}
          {activeTab === "staff" && <StaffTab isAdmin={isAdmin} />}

        </div>
      </div>
    </div>
  );
}