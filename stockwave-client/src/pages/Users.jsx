import { useState, useEffect } from "react";
import { getUsers, updateUser, deleteUser } from "../api/stockwaveApi";
import "./Users.css";
import { useActionGuard } from "../hooks/useActionGuard";

const avatarColors = ["#1a6b3c", "#2563eb", "#7c3aed", "#d97706", "#ef4444", "#0891b2"];

const emptyForm = { name: "", username: "", email: "" };

// ── User Modal ─────────────────────────────────────
function UserModal({ mode, user, onClose, onSave, saving }) {
  const [form, setForm] = useState(user || emptyForm);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = () => {
    if (saving) return;
    if (!form.name || !form.username || !form.email) {
      setError("Please fill in all required fields."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email."); return;
    }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{mode === "add" ? "Add New User" : "Edit User"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          {/* Avatar preview */}
          <div className="avatar-preview-row">
            <div className="avatar-preview" style={{ background: avatarColors[form.name.charCodeAt(0) % avatarColors.length] || "#1a6b3c" }}>
              {form.name ? form.name[0].toUpperCase() : "?"}
            </div>
            <div>
              <p className="avatar-preview-name">{form.name || "New User"}</p>
            </div>
          </div>

          <div className="mfield-group">
            <label className="mfield-label">Full Name *</label>
            <input className="mfield-input" name="name" placeholder="e.g. Maria Santos"
              value={form.name} onChange={handleChange} />
          </div>

          <div className="mfield-row">
            <div className="mfield-group">
              <label className="mfield-label">Username *</label>
              <input className="mfield-input" name="username" placeholder="e.g. maria.s"
                value={form.username} onChange={handleChange} />
            </div>
          </div>

          <div className="mfield-group">
            <label className="mfield-label">Email Address *</label>
            <input className="mfield-input" name="email" type="email" placeholder="user@stockwave.com"
              value={form.email} onChange={handleChange} />
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : (mode === "add" ? "Add User" : "Save Changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ───────────────────────────────────
function DeleteModal({ user, onClose, onConfirm, deleting }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card small" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Remove User</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="delete-body">
          <div className="delete-avatar" style={{ background: avatarColors[user.name.charCodeAt(0) % avatarColors.length] }}>
            {user.avatar}
          </div>
          <p className="delete-msg">
            Are you sure you want to remove <strong>{user.name}</strong>?
            <br />They will lose all access to StockWave.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="btn-delete" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Removing..." : "Remove User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View User Modal ────────────────────────────────
function ViewUserModal({ user, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">User Profile</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="profile-detail-header">
            <div className="usr-avatar large" style={{ background: avatarColors[user.name.charCodeAt(0) % avatarColors.length] }}>
              {user.avatar}
            </div>
            <div className="profile-detail-info">
              <h2 className="profile-name">{user.name}</h2>
              <p className="profile-username">@{user.username}</p>
              <span className={`status-dot-badge ${user.status.toLowerCase()}`}>
                <span className="sdot" />{user.status}
              </span>
            </div>
          </div>

          <div className="profile-detail-grid">
            <div className="detail-item">
              <label className="detail-label">Email Address</label>
              <p className="detail-value">{user.email}</p>
            </div>
            <div className="detail-item">
              <label className="detail-label">Phone Number</label>
              <p className="detail-value">{user.phoneNumber || "Not provided"}</p>
            </div>
            <div className="detail-item full">
              <label className="detail-label">Bio</label>
              <p className="detail-value bio-text">{user.bio || "No bio available."}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { run, isRunning } = useActionGuard(500);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.map(u => ({
        ...u,
        name: u.fullName,
        avatar: u.fullName?.[0]?.toUpperCase() || "?",
        lastLogin: u.lastLogin
          ? new Date(u.lastLogin).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
          : "Never"
      })));
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal, setModal] = useState(null);
  const [activeView, setActiveView] = useState("grid"); // grid | table

  // ── Filter ─────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Stats ──────────────────────────────────────
  const totalUsers = users.length;
  const activeCount = users.filter(u => u.status === "Active").length;

  // ── CRUD ──────────────────────────────────────
  const handleAdd = async (data) => {
    // Users are created via Register page
    // For now just refresh the list
    await fetchUsers();
    setModal(null);
  };

  const handleEdit = async (data) => {
    await run("edit-user", async () => {
      try {
        await updateUser(modal.user.id, {
          fullName: data.name,
          username: data.username,
          email: data.email,
        });
        await fetchUsers();
        setModal(null);
      } catch {
        alert("Failed to update user.");
      }
    });
  };

  const handleDelete = async () => {
    await run("delete-user", async () => {
      try {
        await deleteUser(modal.user.id);
        await fetchUsers();
        setModal(null);
      } catch {
        alert("Failed to delete user.");
      }
    });
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 64, color: "#9ca3af", fontSize: 14 }}>
      Loading users...
    </div>
  );
  return (
    <div className="usr-root">
      {/* ── PAGE HEADER ── */}
      <div className="usr-header">
        <div>
          <h1 className="usr-title">Account</h1>
          <p className="usr-sub">Manage your profile details</p>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="usr-stats">
        {[
          { label: "Total Users", value: totalUsers, color: "var(--text-dark)" },
          { label: "Active", value: activeCount, color: "#1a6b3c" },
        ].map((s, i) => (
          <div key={i} className="usr-stat">
            <span className="usr-stat-num" style={{ color: s.color }}>{s.value}</span>
            <span className="usr-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div className="usr-filters">
        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#aaa" strokeWidth="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input className="search-inp" placeholder="Search users..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="filter-group">
          <select className="filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {["All", "Active", "Inactive"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* View toggle */}
        <div className="view-toggle">
          <button className={`vt-btn ${activeView === "grid" ? "active" : ""}`}
            onClick={() => setActiveView("grid")} title="Grid view">
            ⊞
          </button>
          <button className={`vt-btn ${activeView === "table" ? "active" : ""}`}
            onClick={() => setActiveView("table")} title="Table view">
            ☰
          </button>
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {activeView === "grid" && (
        <div className="usr-grid">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <p>No users found</p>
            </div>
          ) : filtered.map((u, i) => (
            <div key={u.id} className="usr-card clickable" style={{ animationDelay: `${i * 40}ms` }} onClick={() => setModal({ type: "view", user: u })}>
              <div className="usr-card-top">
                <div className="usr-avatar" style={{ background: avatarColors[u.name.charCodeAt(0) % avatarColors.length] }}>
                  {u.avatar}
                </div>
                <div className="usr-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="act-btn edit" onClick={() => setModal({ type: "edit", user: u })} title="Edit">✏️</button>
                  <button className="act-btn del" onClick={() => setModal({ type: "delete", user: u })} title="Remove">🗑️</button>
                </div>
              </div>
              <h3 className="usr-card-name">{u.name}</h3>
              <p className="usr-card-username">@{u.username}</p>
              <p className="usr-card-email">{u.email}</p>
              <div className="usr-card-bottom">
                <span className={`status-dot-badge ${u.status.toLowerCase()}`}>
                  <span className="sdot" />{u.status}
                </span>
              </div>
              <p className="usr-last-login">Last login: {u.lastLogin}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {activeView === "table" && (
        <div className="usr-table-wrap">
          <table className="usr-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    <div className="empty-state"><span className="empty-icon">👥</span><p>No users found</p></div>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="clickable" onClick={() => setModal({ type: "view", user: u })}>
                  <td>
                    <div className="usr-table-name-cell">
                      <div className="usr-avatar small" style={{ background: avatarColors[u.name.charCodeAt(0) % avatarColors.length] }}>
                        {u.avatar}
                      </div>
                      <span className="td-name">{u.name}</span>
                    </div>
                  </td>
                  <td className="td-mid">@{u.username}</td>
                  <td className="td-light">{u.email}</td>
                  <td>
                    <span className={`status-dot-badge ${u.status.toLowerCase()}`}>
                      <span className="sdot" />{u.status}
                    </span>
                  </td>
                  <td className="td-light">{u.lastLogin}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="action-btns">
                      <button className="act-btn edit" onClick={() => setModal({ type: "edit", user: u })}>✏️</button>
                      <button className="act-btn del" onClick={() => setModal({ type: "delete", user: u })}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODALS ── */}
      {modal?.type === "view" && (
        <ViewUserModal user={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.type === "add" && (
        <UserModal mode="add" onClose={() => setModal(null)} onSave={handleAdd} saving={false} />
      )}
      {modal?.type === "edit" && (
        <UserModal mode="edit" user={modal.user} onClose={() => setModal(null)} onSave={handleEdit} saving={isRunning("edit-user")} />
      )}
      {modal?.type === "delete" && (
        <DeleteModal user={modal.user} onClose={() => setModal(null)} onConfirm={handleDelete} deleting={isRunning("delete-user")} />
      )}
    </div>
  );
}