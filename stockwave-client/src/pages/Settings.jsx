import { useState } from "react";
import "./Settings.css";
import { changeMyPassword, updateSecuritySettings, clearActivityLogs, resetSystem, updateUser } from "../api/stockwaveApi";
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
  Trash2
} from "lucide-react";

const tabs = [
  { id: "profile", label: "Account Profile", icon: UserIcon },
  { id: "system", label: "General Settings", icon: SettingsIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security & Safety", icon: Lock },
];

// ── Toggle Switch ──────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`toggle-switch ${checked ? "on" : "off"}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

// ── Section Card ───────────────────────────────────
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

// ── Field Row ──────────────────────────────────────
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

// ── Main Component ─────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const { run, isRunning } = useActionGuard(500);

  // Profile state
  const [profile, setProfile] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      id: user.id,
      name: user.fullName || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phoneNumber || "",
      role: user.role || "Admin",
      bio: user.bio || "",
    };
  });

  const handleSaveProfile = async () => {
    await run("save-profile", async () => {
      try {
        await updateUser(profile.id, {
          fullName: profile.name,
          username: profile.username,
          email: profile.email,
          phoneNumber: profile.phone,
          bio: profile.bio
        });

        // Update localStorage
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.fullName = profile.name;
        user.username = profile.username;
        user.email = profile.email;
        user.phoneNumber = profile.phone;
        user.bio = profile.bio;
        localStorage.setItem("user", JSON.stringify(user));

        showSaved();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to update profile.");
      }
    });
  };

  const [system, setSystem] = useState({
    companyName: "StockWave Inventory",
    currency: "PHP",
    timezone: "Asia/Manila",
    lowStockThreshold: 10,
    language: "English",
    dateFormat: "MM/DD/YYYY",
  });

  // Notifications state
  const [notif, setNotif] = useState({
    lowStockAlert: true,
    newUserAlert: true,
    reportReady: false,
    emailDigest: true,
    browserNotif: false,
    restockReminder: true,
  });

  // Security state
  const [security, setSecurity] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      twoFactor: user.twoFactorEnabled || false,
      sessionTimeout: user.sessionTimeoutMinutes?.toString() || "30",
      loginAlerts: user.loginAlertsEnabled !== false,
    };
  });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async () => {
    setPassError("");
    setPassSuccess(false);
    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      setPassError("Please fill in all password fields."); return;
    }
    if (passwords.newPass.length < 6) {
      setPassError("New password must be at least 6 characters."); return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPassError("New passwords do not match."); return;
    }

    await run("change-password", async () => {
      try {
        await changeMyPassword({
          currentPassword: passwords.current,
          newPassword: passwords.newPass,
        });
        setPassSuccess(true);
        setPasswords({ current: "", newPass: "", confirm: "" });
      } catch (err) {
        setPassError(err.response?.data?.message || "Failed to update password.");
      }
    });
  };

  const handleSecurityUpdate = async () => {
    await run("save-security", async () => {
      setSecurityLoading(true);
      setSecurityMessage("");
      try {
        await updateSecuritySettings({
          enableTwoFactor: security.twoFactor,
          loginAlertsEnabled: security.loginAlerts,
          sessionTimeoutMinutes: parseInt(security.sessionTimeout) || 30,
        });
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.twoFactorEnabled = security.twoFactor;
        user.loginAlertsEnabled = security.loginAlerts;
        user.sessionTimeoutMinutes = parseInt(security.sessionTimeout) || 30;
        localStorage.setItem("user", JSON.stringify(user));
        setSecurityMessage("Security settings updated successfully!");
        showSaved();
      } catch (err) {
        setSecurityMessage(err.response?.data?.message || "Failed to update security settings.");
      } finally {
        setSecurityLoading(false);
      }
    });
  };

  const handleClearLogs = async () => {
    if (!confirm("Clear all activity logs? This cannot be undone.")) return;
    await run("clear-logs", async () => {
      try {
        await clearActivityLogs();
        alert("Logs cleared.");
      } catch (err) {
        alert("Failed to clear logs.");
      }
    });
  };

  const handleResetSystem = async () => {
    if (!confirm("Reset system to defaults? This affects all user settings.")) return;
    await run("reset-system", async () => {
      try {
        await resetSystem();
        window.location.reload();
      } catch (err) {
        alert("Failed to reset system.");
      }
    });
  };

  return (
    <div className="set-root">
      {/* ── PAGE HEADER ── */}
      <div className="set-header">
        <div>
          <h1 className="set-title">Preferences</h1>
          <p className="set-sub">Configure your individual account and global system rules</p>
        </div>
        {saved && (
          <div className="saved-toast">
            <CheckCircle size={14} /> <span>Saved Successfully</span>
          </div>
        )}
      </div>

      <div className="set-layout">
        {/* ── SIDEBAR TABS ── */}
        <aside className="set-sidebar">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`set-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="set-tab-icon"><t.icon size={16} /></span>
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* ── CONTENT ── */}
        <div className="set-content">

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <div className="tab-pane">
              <Section title="Personal Information" sub="Public and private account details" icon={UserIcon}>
                <div className="profile-header-alt">
                  <div className="settings-avatar-large">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-header-text">
                    <p className="ph-name">{profile.name}</p>
                    <p className="ph-role">{profile.role}</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Full Name</label>
                    <div className="input-with-icon">
                      <UserIcon size={16} className="input-icon-abs" />
                      <input className="form-input" value={profile.name}
                        onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                    </div>
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

          {/* ── SYSTEM ── */}
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

          {/* ── NOTIFICATIONS ── */}
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

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <div className="tab-pane">
              <Section title="Access Control" sub="Password and authentication" icon={ShieldCheck}>
                {passError && <div className="pass-error-alt">{passError}</div>}
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
                <div className="section-actions">
                  <button className="btn-save" onClick={handleSecurityUpdate}>Apply Security</button>
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

        </div>
      </div>
    </div>
  );
}
