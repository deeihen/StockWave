import { useState } from "react";
import "./Settings.css";
import { changeMyPassword, updateSecuritySettings, clearActivityLogs, resetSystem, updateUser } from "../api/stockwaveApi";

const tabs = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "system", label: "System", icon: "⚙️" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "security", label: "Security", icon: "🔒" },
];

// ── Toggle Switch ──────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? "on" : "off"}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

// ── Section Card ───────────────────────────────────
function Section({ title, sub, children }) {
  return (
    <div className="settings-section">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
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

  // Profile state
  const [profile, setProfile] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      id: user.id,
      name: user.fullName || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phoneNumber || "",
      role: user.role || "Staff",
      bio: user.bio || "",
    };
  });

  const handleSaveProfile = async () => {
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
  };

  const [system, setSystem] = useState({
    companyName: "StockWave Corp",
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
      loginAlerts: user.loginAlertsEnabled !== false, // default to true
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

    try {
      await changeMyPassword({
        currentPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPassSuccess(true);
      setPasswords({ current: "", newPass: "", confirm: "" });
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message;
      if (serverMessage) {
        setPassError(serverMessage);
        return;
      }
      if (status) {
        setPassError(`Failed to update password. (HTTP ${status})`);
        return;
      }
      setPassError("Failed to update password.");
    }
  };



  const handleSecurityUpdate = async () => {
    setSecurityLoading(true);
    setSecurityMessage("");

    try {
      await updateSecuritySettings({
        enableTwoFactor: security.twoFactor,
        loginAlertsEnabled: security.loginAlerts,
        sessionTimeoutMinutes: parseInt(security.sessionTimeout) || 30,
      });

      // Update localStorage user data
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.twoFactorEnabled = security.twoFactor;
      user.loginAlertsEnabled = security.loginAlerts;
      user.sessionTimeoutMinutes = parseInt(security.sessionTimeout) || 30;
      localStorage.setItem("user", JSON.stringify(user));

      setSecurityMessage("Security settings updated successfully!");
      
      // Apply session timeout immediately
      const timeoutMinutes = parseInt(security.sessionTimeout) || 30;
      if (timeoutMinutes > 0) {
        // Set up session timeout warning
        setTimeout(() => {
          alert("Your session will expire in 5 minutes due to inactivity.");
        }, (timeoutMinutes - 5) * 60 * 1000);
      }

    } catch (err) {
      setSecurityMessage(err.response?.data?.message || "Failed to update security settings.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all activity logs? This action cannot be undone.")) {
      return;
    }

    try {
      await clearActivityLogs();
      alert("Activity logs cleared successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to clear activity logs.");
    }
  };

  const handleResetSystem = async () => {
    if (!confirm("Are you sure you want to reset the system to defaults? This will reset all users' security settings and cannot be undone.")) {
      return;
    }

    try {
      await resetSystem();
      alert("System reset to defaults successfully!");
      
      // Reload the page to refresh settings
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset system.");
    }
  };

  return (
    <div className="set-root">
      {/* ── PAGE HEADER ── */}
      <div className="set-header">
        <div>
          <h1 className="set-title">Settings</h1>
          <p className="set-sub">Manage your preferences and system configuration</p>
        </div>
        {saved && (
          <div className="saved-toast">
            ✅ Changes saved successfully
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
              <span className="set-tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* ── CONTENT ── */}
        <div className="set-content">

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <div className="tab-pane">
              <Section title="Profile Information" sub="Update your personal details">
                {/* Avatar */}
                <div className="avatar-section">
                  <div className="settings-avatar">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="avatar-name">{profile.name}</p>
                    <p className="avatar-role">{profile.role}</p>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
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
                    <input className="form-input" type="email" value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="form-field full">
                    <label className="form-label">Bio</label>
                    <textarea className="form-input form-textarea" value={profile.bio}
                      onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
                  </div>
                </div>
              </Section>
              <div className="section-actions">
                <button className="btn-save" onClick={handleSaveProfile}>Save Profile</button>
              </div>
            </div>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === "system" && (
            <div className="tab-pane">
              <Section title="System Settings" sub="Configure global system preferences">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Company Name</label>
                    <input className="form-input" value={system.companyName}
                      onChange={e => setSystem(s => ({ ...s, companyName: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Currency</label>
                    <select className="form-input" value={system.currency}
                      onChange={e => setSystem(s => ({ ...s, currency: e.target.value }))}>
                      <option value="PHP">₱ Philippine Peso (PHP)</option>
                      <option value="USD">$ US Dollar (USD)</option>
                      <option value="EUR">€ Euro (EUR)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Timezone</label>
                    <select className="form-input" value={system.timezone}
                      onChange={e => setSystem(s => ({ ...s, timezone: e.target.value }))}>
                      <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Date Format</label>
                    <select className="form-input" value={system.dateFormat}
                      onChange={e => setSystem(s => ({ ...s, dateFormat: e.target.value }))}>
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Language</label>
                    <select className="form-input" value={system.language}
                      onChange={e => setSystem(s => ({ ...s, language: e.target.value }))}>
                      <option>English</option>
                      <option>Filipino</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Low Stock Threshold</label>
                    <input className="form-input" type="number" min="1"
                      value={system.lowStockThreshold}
                      onChange={e => setSystem(s => ({ ...s, lowStockThreshold: e.target.value }))} />
                    <p className="field-hint">Items below this quantity are flagged as low stock</p>
                  </div>
                </div>
              </Section>
              <div className="section-actions">
                <button className="btn-save" onClick={showSaved}>Save System Settings</button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div className="tab-pane">
              <Section title="Notification Preferences" sub="Choose what you want to be notified about">
                <FieldRow label="Low Stock Alerts" sub="Get notified when items fall below threshold">
                  <Toggle checked={notif.lowStockAlert}
                    onChange={v => setNotif(n => ({ ...n, lowStockAlert: v }))} />
                </FieldRow>
                <FieldRow label="New User Registered" sub="Alert when a new user joins the system">
                  <Toggle checked={notif.newUserAlert}
                    onChange={v => setNotif(n => ({ ...n, newUserAlert: v }))} />
                </FieldRow>
                <FieldRow label="Report Ready" sub="Notify when scheduled reports are generated">
                  <Toggle checked={notif.reportReady}
                    onChange={v => setNotif(n => ({ ...n, reportReady: v }))} />
                </FieldRow>
                <FieldRow label="Restock Reminder" sub="Weekly reminder for items that need restocking">
                  <Toggle checked={notif.restockReminder}
                    onChange={v => setNotif(n => ({ ...n, restockReminder: v }))} />
                </FieldRow>
              </Section>

              <Section title="Delivery Methods" sub="How you receive notifications">
                <FieldRow label="Email Digest" sub="Daily summary sent to your email">
                  <Toggle checked={notif.emailDigest}
                    onChange={v => setNotif(n => ({ ...n, emailDigest: v }))} />
                </FieldRow>
                <FieldRow label="Browser Notifications" sub="Push notifications in your browser">
                  <Toggle checked={notif.browserNotif}
                    onChange={v => setNotif(n => ({ ...n, browserNotif: v }))} />
                </FieldRow>
              </Section>
              <div className="section-actions">
                <button className="btn-save" onClick={showSaved}>Save Preferences</button>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <div className="tab-pane">
              <Section title="Change Password" sub="Update your login password">
                {passError && <div className="pass-error">{passError}</div>}
                {passSuccess && <div className="pass-success">✅ Password changed successfully!</div>}
                <div className="form-grid">
                  <div className="form-field full">
                    <label className="form-label">Current Password</label>
                    <input className="form-input" type="password" placeholder="Enter current password"
                      value={passwords.current}
                      onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">New Password</label>
                    <input className="form-input" type="password" placeholder="Min. 6 characters"
                      value={passwords.newPass}
                      onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Confirm New Password</label>
                    <input className="form-input" type="password" placeholder="Re-enter new password"
                      value={passwords.confirm}
                      onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
                  </div>
                </div>
                <button className="btn-save" style={{ marginTop: 4 }} onClick={handlePasswordChange}>
                  Update Password
                </button>
              </Section>

              <Section title="Security Options" sub="Extra protection for your account">
                {securityMessage && (
                  <div className={`security-message ${securityMessage.includes("success") ? "success" : "error"}`}>
                    {securityMessage}
                  </div>
                )}
                <FieldRow label="Two-Factor Authentication" sub="Require a code in addition to password">
                  <Toggle checked={security.twoFactor}
                    onChange={v => setSecurity(s => ({ ...s, twoFactor: v }))} />
                </FieldRow>
                <FieldRow label="Login Alerts" sub="Email me when a new login is detected">
                  <Toggle checked={security.loginAlerts}
                    onChange={v => setSecurity(s => ({ ...s, loginAlerts: v }))} />
                </FieldRow>
                <FieldRow label="Session Timeout" sub="Automatically log out after inactivity">
                  <select className="form-input inline-select"
                    value={security.sessionTimeout}
                    onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="0">Never</option>
                  </select>
                </FieldRow>
                <div className="section-actions">
                  <button 
                    className="btn-save" 
                    onClick={handleSecurityUpdate}
                    disabled={securityLoading}
                  >
                    {securityLoading ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </div>
              </Section>

              <div className="danger-zone">
                <h3 className="danger-title">⚠️ Danger Zone</h3>
                <p className="danger-sub">These actions are irreversible. Please be careful.</p>
                <div className="danger-actions">
                  <div className="danger-item">
                    <div>
                      <p className="danger-item-title">Clear All Activity Logs</p>
                      <p className="danger-item-sub">Permanently delete all system activity records</p>
                    </div>
                    <button className="btn-danger" onClick={handleClearLogs}>Clear Logs</button>
                  </div>
                  <div className="danger-item">
                    <div>
                      <p className="danger-item-title">Reset System to Default</p>
                      <p className="danger-item-sub">Resets all settings — does not delete products or users</p>
                    </div>
                    <button className="btn-danger" onClick={handleResetSystem}>Reset</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}