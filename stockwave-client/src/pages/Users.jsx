import { useState, useEffect } from "react";
import { getUsers, updateUser, deleteUser } from "../api/stockwaveApi";
import "./Users.css";
import { useActionGuard } from "../hooks/useActionGuard";
import {
  Search,
  Grid,
  List,
  Edit2,
  Trash2,
  X,
  Users as UsersIcon,
  User as UserIcon,
  Mail,
  Phone,
  Clock,
  Briefcase,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

const avatarColors = ["#059669", "#10b981", "#34d399", "#065f46", "#064e3b"];

const emptyForm = { fullName: "", username: "", email: "", phoneNumber: "", bio: "", status: "Active" };

// ── User Modal ─────────────────────────────────────
function UserModal({ mode, user, onClose, onSave, saving }) {
  const [form, setForm] = useState(user ? {
    fullName: user.fullName || "",
    username: user.username || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    bio: user.bio || "",
    status: user.status || "Active"
  } : emptyForm);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = () => {
    if (saving) return;
    if (!form.fullName || !form.username || !form.email) {
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
          <h3 className="modal-title">{mode === "add" ? "Add New User" : "Edit Profile Details"}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <div className="avatar-preview-row">
            <div className="avatar-preview" style={{ background: avatarColors[form.fullName.charCodeAt(0) % avatarColors.length] || "#059669" }}>
              {form.fullName ? form.fullName[0].toUpperCase() : "?"}
            </div>
            <div>
              <p className="avatar-preview-name">{form.fullName || "New User"}</p>
              <p className="avatar-preview-role">User Account</p>
            </div>
          </div>

          <div className="mfield-group">
            <label className="mfield-label">Full Name *</label>
            <input className="mfield-input" name="fullName" placeholder="e.g. Maria Santos"
              value={form.fullName} onChange={handleChange} />
          </div>

          <div className="mfield-row">
            <div className="mfield-group">
              <label className="mfield-label">Username *</label>
              <input className="mfield-input" name="username" placeholder="e.g. maria.s"
                value={form.username} onChange={handleChange} />
            </div>
            <div className="mfield-group">
              <label className="mfield-label">Phone Number</label>
              <input className="mfield-input" name="phoneNumber" placeholder="09xx-xxx-xxxx"
                value={form.phoneNumber} onChange={handleChange} />
            </div>
          </div>

          <div className="mfield-row">
            <div className="mfield-group">
              <label className="mfield-label">Email Address *</label>
              <input className="mfield-input" name="email" type="email" placeholder="user@stockwave.com"
                value={form.email} onChange={handleChange} />
            </div>
            <div className="mfield-group">
              <label className="mfield-label">Account Status</label>
              <select className="mfield-input" name="status" value={form.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mfield-group">
            <label className="mfield-label">Bio / Notes</label>
            <textarea className="mfield-input mfield-textarea" name="bio" placeholder="Brief description..."
              value={form.bio} onChange={handleChange} />
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Processing..." : (mode === "add" ? "Create User" : "Update Profile")}
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
          <h3 className="modal-title">Remove Account</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="delete-body">
          <div className="delete-avatar" style={{ background: "#ef4444" }}>
            <Trash2 size={24} />
          </div>
          <p className="delete-msg">
            Are you sure you want to remove <strong>{user.fullName}</strong>?
            <br />All associated data will be archived.
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
  const color = avatarColors[user.fullName.charCodeAt(0) % avatarColors.length];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">User Information</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="profile-detail-header">
            <div className="usr-avatar large" style={{ background: color }}>
              {user.fullName[0].toUpperCase()}
            </div>
            <div className="profile-detail-info">
              <h2 className="profile-name">{user.fullName}</h2>
              <p className="profile-username">@{user.username}</p>
              <span className={`status-dot-badge ${user.status.toLowerCase()}`}>
                <span className="sdot" />{user.status}
              </span>
            </div>
          </div>

          <div className="profile-detail-grid">
            <div className="detail-item">
              <div className="detail-label-wrap"><Mail size={14} /> <span>Email</span></div>
              <p className="detail-value">{user.email}</p>
            </div>
            <div className="detail-item">
              <div className="detail-label-wrap"><Phone size={14} /> <span>Phone</span></div>
              <p className="detail-value">{user.phoneNumber || "None"}</p>
            </div>
            <div className="detail-item">
              <div className="detail-label-wrap"><Clock size={14} /> <span>Last Activity</span></div>
              <p className="detail-value">{user.lastLogin}</p>
            </div>
            <div className="detail-item">
              <div className="detail-label-wrap"><ShieldCheck size={14} /> <span>Account Role</span></div>
              <p className="detail-value">{user.role || "Standard User"}</p>
            </div>
            <div className="detail-item full">
              <div className="detail-label-wrap"><Briefcase size={14} /> <span>Biography</span></div>
              <p className="detail-value bio-text">{user.bio || "No description provided."}</p>
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
        lastLogin: u.lastLogin
          ? new Date(u.lastLogin).toLocaleString("en-PH", { dateStyle: 'medium', timeStyle: 'short' })
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
    const status = u.status || "Active";
    const matchSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  // ── Stats ──────────────────────────────────────
  const totalUsers = users.length;
  const activeCount = users.filter(u => u.status === "Active").length;

  const handleEdit = async (data) => {
    await run("edit-user", async () => {
      try {
        await updateUser(modal.user.id, data);
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
      Loading directory...
    </div>
  );
  return (
    <div className="usr-root">
      {/* ── PAGE HEADER ── */}
      <div className="usr-header">
        <div>
          <h1 className="usr-title">System Users</h1>
          <p className="usr-sub">Directory of authorized accounts and access logs</p>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="usr-stats">
        {[
          { label: "Total Members", value: totalUsers, color: "var(--text-main)" },
          { label: "Active Now", value: activeCount, color: "#059669" },
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
          <Search size={16} color="#94a3b8" />
          <input className="search-inp" placeholder="Search by name, email, or user..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="filter-group">
          <select className="filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        <div className="view-toggle">
          <button className={`vt-btn ${activeView === "grid" ? "active" : ""}`}
            onClick={() => setActiveView("grid")} title="Grid view">
            <Grid size={16} />
          </button>
          <button className={`vt-btn ${activeView === "table" ? "active" : ""}`}
            onClick={() => setActiveView("table")} title="Table view">
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {activeView === "grid" && (
        <div className="usr-grid">
          {filtered.length === 0 ? (
            <div className="empty-state-full">
              <UsersIcon size={48} color="#e2e8f0" />
              <p>No results for your search</p>
            </div>
          ) : filtered.map((u, i) => (
            <div key={u.id} className="usr-card" onClick={() => setModal({ type: "view", user: u })}>
              <div className="usr-card-top">
                <div className="usr-avatar" style={{ background: avatarColors[u.fullName.charCodeAt(0) % avatarColors.length] }}>
                  {u.fullName[0].toUpperCase()}
                </div>
                <div className="usr-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="act-btn" onClick={() => setModal({ type: "edit", user: u })} title="Edit"><Edit2 size={14} /></button>
                  <button className="act-btn del" onClick={() => setModal({ type: "delete", user: u })} title="Remove"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="usr-card-name">{u.fullName}</h3>
              <p className="usr-card-username">@{u.username}</p>
              <p className="usr-card-email">{u.email}</p>
              <div className="usr-card-bottom">
                <span className={`status-dot-badge ${u.status.toLowerCase()}`}>
                  <span className="sdot" />{u.status}
                </span>
                <button className="view-profile-link">Profile <ExternalLink size={10} /></button>
              </div>
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
                <th>User / Identity</th>
                <th>Handle</th>
                <th>Communication</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">
                    <div className="empty-state-full"><UsersIcon size={48} color="#e2e8f0" /><p>No matching accounts</p></div>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="clickable" onClick={() => setModal({ type: "view", user: u })}>
                  <td>
                    <div className="usr-table-name-cell">
                      <div className="usr-avatar small" style={{ background: avatarColors[u.fullName.charCodeAt(0) % avatarColors.length] }}>
                        {u.fullName[0].toUpperCase()}
                      </div>
                      <span className="td-name">{u.fullName}</span>
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
                      <button className="act-btn" onClick={() => setModal({ type: "edit", user: u })}><Edit2 size={14} /></button>
                      <button className="act-btn del" onClick={() => setModal({ type: "delete", user: u })}><Trash2 size={14} /></button>
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
      {modal?.type === "edit" && (
        <UserModal mode="edit" user={modal.user} onClose={() => setModal(null)} onSave={handleEdit} saving={isRunning("edit-user")} />
      )}
      {modal?.type === "delete" && (
        <DeleteModal user={modal.user} onClose={() => setModal(null)} onConfirm={handleDelete} deleting={isRunning("delete-user")} />
      )}
    </div>
  );
}