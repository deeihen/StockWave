import { useState, useEffect } from "react";
import Notifications from "../components/Notifications";
import VoiceControl from "../components/VoiceControl";
import GestureControl from "../components/GestureControl";
import "./Dashboard.css";
import Inventory from "./Inventory";
import Reports from "./Reports";
import Users from "./Users";
import Settings from "./Settings";
import { getReportSummary, getRecentActivity, getLowStock } from "../api/stockwaveApi";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

// ── Stat Card ──────────────────────────────────────
function StatCard({ icon, label, value, sub, color, delay }) {
  return (
    <div className="stat-card" style={{ animationDelay: delay }}>
      <div className="stat-icon-wrap" style={{ background: color + "18" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        <p className="stat-sub">{sub}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">{payload[0].value} units</p>
      </div>
    );
  }
  return null;
};

const pageTitles = {
  dashboard: { title: "Dashboard", sub: "Welcome back — here's what's happening today." },
  inventory: { title: "Inventory", sub: "Manage and track all your products." },
  reports: { title: "Reports", sub: "View analytics and stock reports." },
  users: { title: "Users", sub: "Manage system users and roles." },
  settings: { title: "Settings", sub: "Configure your preferences." },
};

// ── Main Dashboard Component ───────────────────────
export default function Dashboard({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const avatarLetter = user.fullName?.[0]?.toUpperCase() || "A";

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "inventory", icon: "📦", label: "Inventory" },
    { id: "reports", icon: "📊", label: "Reports" },
    { id: "users", icon: "👥", label: "Users" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const { title, sub } = pageTitles[activePage] || pageTitles.dashboard;

  const handleVoiceCommand = (command, value) => {
  if (command === "navigate") setActivePage(value);
  if (command === "logout") onLogout();
  if (command === "add_product") setActivePage("inventory");
};

  const handleGestureCommand = (gesture) => {
    const pages = ["dashboard", "inventory", "reports", "users", "settings"];
    const currentIndex = pages.indexOf(activePage);

    if (gesture === "open_palm") setActivePage("dashboard");
    if (gesture === "fist") setActivePage("dashboard");
    if (gesture === "point_up") {
      const prev = pages[currentIndex - 1];
      if (prev) setActivePage(prev);
    }
    if (gesture === "peace") {
      const next = pages[currentIndex + 1];
      if (next) setActivePage(next);
    }
    if (gesture === "thumbs_up") setActivePage("inventory");
  };

  const renderPage = () => {
    if (activePage === "inventory") return <Inventory />;
    if (activePage === "reports") return <Reports />;
    if (activePage === "users") return <Users />;
    if (activePage === "settings") return <Settings />;
    return <DashboardHome />;
  };

  return (
    <div className="dash-root">
      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="s-logo-icon">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <rect width="12" height="12" rx="2" fill="#1a6b3c"/>
                <rect x="16" width="12" height="12" rx="2" fill="#1a6b3c" opacity="0.5"/>
                <rect y="16" width="12" height="12" rx="2" fill="#1a6b3c" opacity="0.5"/>
                <rect x="16" y="16" width="12" height="12" rx="2" fill="#1a6b3c"/>
              </svg>
            </div>
            {sidebarOpen && <span className="s-logo-text">StockWave</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{avatarLetter}</div>
            {sidebarOpen && (
              <div className="user-details">
                <p className="user-name">{user.fullName || "Admin"}</p>
                <p className="user-role">Account</p>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="dash-main">
        <header className="dash-header">
          <div className="header-left">
            <h1 className="page-title">{title}</h1>
            <p className="page-sub">{sub}</p>
          </div>
          <div className="header-right">
            <GestureControl onGesture={handleGestureCommand} />
            <VoiceControl onCommand={handleVoiceCommand} />
            <button className="notif-btn">
              <Notifications />
            </button>
          </div>
        </header>

        <div className="dash-page-content">
          {renderPage()}
        </div>

        <nav className="mobile-nav" aria-label="Primary">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

// ── Dashboard Home — wired to real API ────────────
function DashboardHome() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a, l] = await Promise.all([
          getReportSummary(),
          getRecentActivity(),
          getLowStock(),
        ]);
        setSummary(s.data);
        setActivity(a.data);
        setLowStock(l.data);
      } catch {
        // silently fail — show dashes
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 64, color: "#9ca3af", fontSize: 14 }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="dash-content">
      {/* ── STAT CARDS ── */}
      <div className="stats-grid">
        <StatCard icon="📦" label="Total Products"
          value={summary?.totalProducts ?? "—"}
          sub="In database" color="#1a6b3c" delay="0ms"/>
        <StatCard icon="⚠️" label="Low Stock"
          value={summary?.lowStock ?? "—"}
          sub="Needs restocking" color="#d97706" delay="80ms"/>
        <StatCard icon="📥" label="Items Added"
          value={summary?.itemsAddedThisMonth ?? "—"}
          sub="This month" color="#2563eb" delay="160ms"/>
        <StatCard icon="📤" label="Items Removed"
          value={summary?.itemsRemovedThisMonth ?? "—"}
          sub="This month" color="#7c3aed" delay="240ms"/>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="bottom-row">
        {/* Recent Activity */}
        <div className="table-card wide">
          <div className="table-card-header">
            <h3 className="chart-title">Recent Activity</h3>
          </div>
          {activity.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>
              No activity yet. Add products to see logs here.
            </p>
          ) : (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Action</th><th>Item</th><th>Qty</th><th>By</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 5).map(a => (
                  <tr key={a.id}>
                    <td>
                      <span className={`action-badge ${a.action === "Added" ? "in" : "out"}`}>
                        {a.action}
                      </span>
                    </td>
                    <td className="item-name">{a.item}</td>
                    <td className="qty-cell">{a.quantity}</td>
                    <td className="user-cell">{a.performedBy}</td>
                    <td className="time-cell">
                      {new Date(a.timestamp).toLocaleString("en-PH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="table-card">
          <div className="table-card-header">
            <h3 className="chart-title">Low Stock Alerts</h3>
            <span className="alert-count">{lowStock.length}</span>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>
              All items are well stocked! 🎉
            </p>
          ) : (
            <div className="low-stock-list">
              {lowStock.slice(0, 4).map((item, i) => (
                <div key={i} className="low-stock-item">
                  <div className="low-stock-top">
                    <span className="low-stock-name">{item.name}</span>
                    <span className="low-stock-qty">{item.stock} units</span>
                  </div>
                  <div className="low-stock-bar-bg">
                    <div className="low-stock-bar-fill"
                      style={{
                        width: `${Math.min(item.stock * 10, 100)}%`,
                        background: item.stock === 0 ? "#ef4444" : "#d97706"
                      }}/>
                  </div>
                  <p className="low-stock-hint">{item.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}