import { useState, useEffect } from "react";
import "./Settings.css";
import { changeMyPassword, updateSecuritySettings, clearActivityLogs, resetSystem, updateUser, createStaff, getMyStaff, deleteStaff, toggleStaffStatus } from "../api/stockwaveApi";
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
  UserX,
  UserCheck,
  Eye,
  EyeOff,
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

// ── Staff Tab ──────────────────────────────────────
function StaffTab() {
  const [staffList, setStaffList]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState({ fullName: "", username: "", password: "" });
  const [showPass, setShowPass]     = useState(false);
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await getMyStaff();
      setStaffList(res.data);
    } catch {
      setError("Failed to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleCreate = async () => {
    setError(""); setSuccess("");
    if (!form.fullName.trim() || !form.username.trim() || !form.password.trim()) {
      setError("All fields are required."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setCreating(true);
    try {
      const res = await createStaff(form);
      setSuccess(`Staff "${res.data.staff.fullName}" created! Identifier: ${res.data.staff.identifier}`);
      setForm({ fullName: "", username: "", password: "" });
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create staff.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove staff account "${name}"? This cannot be undone.`)) return;
    try {
      await deleteStaff(id);
      setStaffList(prev => prev.filter(s => s.id !== id));
      setSuccess(`"${name}" has been removed.`);
    } catch {
      setError("Failed to remove staff.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await toggleStaffStatus(id, newStatus);
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch {
      setError("Failed to update status.");
    }
  };

  return (
    <div className="tab-pane">
      {/* ── Create Staff ── */}
      <Section title="Create Staff Account" sub="Staff share your workspace data" icon={Plus}>
        {error   && <div className="pass-error-alt">{error}</div>}
        {success && <div className="pass-success-alt"><CheckCircle size={14} /> {success}</div>}
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
          <div className="form-field full">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <input className="form-input" type={showPass ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <button type="button" className="input-icon-abs input-icon-btn"
                onClick={() => setShowPass(v => !v)} style={{ cursor: "pointer", background: "none", border: "none" }}>
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

      {/* ── Staff List ── */}
      <Section title="Your Staff" sub={`${staffList.length} account${staffList.length !== 1 ? "s" : ""} in your workspace`} icon={Users}>
        {loading ? (
          <p className="frl-sub" style={{ padding: "12px 0" }}>Loading staff...</p>
        ) : staffList.length === 0 ? (
          <div className="staff-empty">
            <Users size={32} opacity={0.3} />
            <p>No staff accounts yet. Create one above.</p>
          </div>
        ) : (
          <div className="staff-list">
            {staffList.map(s => (
              <div key={s.id} className="staff-row">
                <div className="staff-avatar">
                  {s.fullName?.[0]?.toUpperCase() || "S"}
                </div>
                <div className="staff-info">
                  <p className="staff-name">{s.fullName}</p>
                  <p className="staff-meta">@{s.username}</p>
                  <span className="staff-identifier">{s.identifier}</span>
                </div>
                <div className="staff-right">
                  <span className={`staff-status ${s.status === "Active" ? "active" : "inactive"}`}>
                    {s.status}
                  </span>
                  <p className="staff-joined">
                    Joined {new Date(s.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {s.lastLogin && (
                    <p className="staff-joined">
                      Last login {new Date(s.lastLogin).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="staff-actions">
                  <button
                    className={`staff-btn ${s.status === "Active" ? "warn" : "ok"}`}
                    onClick={() => handleToggleStatus(s.id, s.status)}
                    title={s.status === "Active" ? "Deactivate" : "Activate"}
                  >
                    {s.status === "Active" ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                  <button className="staff-btn danger"
                    onClick={() => handleDelete(s.id, s.fullName)} title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Main Component ─────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved]         = useState(false);
  const { run, isRunning }        = useActionGuard(500);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
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
        await updateUser(profile.id, {
          fullName:    profile.name,
          username:    profile.username,
          email:       profile.email,
          phoneNumber: profile.phone,
          bio:         profile.bio
        });
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        Object.assign(u, { fullName: profile.name, username: profile.username, email: profile.email, phoneNumber: profile.phone, bio: profile.bio });
        localStorage.setItem("user", JSON.stringify(u));
        showSaved();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to update profile.");
      }
    });
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

  const [securityLoading, setSecurityLoading]   = useState(false);
  const [securityMessage, setSecurityMessage]   = useState("");
  const [passwords, setPasswords]               = useState({ current: "", newPass: "", confirm: "" });
  const [passError, setPassError]               = useState("");
  const [passSuccess, setPassSuccess]           = useState(false);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

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
          twoFactorEnabled:       security.twoFactor,
          sessionTimeoutMinutes:  parseInt(security.sessionTimeout),
          loginAlertsEnabled:     security.loginAlerts,
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

  const handleClearLogs    = async () => { if (window.confirm("Wipe all activity logs?")) { try { await clearActivityLogs(); showSaved(); } catch { alert("Failed."); } } };
  const handleResetSystem  = async () => { if (window.confirm("Factory reset all system settings?")) { try { await resetSystem(); showSaved(); } catch { alert("Failed."); } } };

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
            <button key={t.id}
              className={`settings-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}>
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
          {activeTab === "staff" && isAdmin && <StaffTab />}

        </div>
      </div>
    </div>
  );
}

/* append to Settings.css instead — staff-specific styles */