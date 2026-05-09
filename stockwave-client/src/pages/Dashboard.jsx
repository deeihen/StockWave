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
  LayoutDashboard,
  Package,
  BarChart3,
  Users as UsersIcon,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Download,
  PlusCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

// ── Stat Card ──────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <div className="stat-card" style={{ animationDelay: delay }}>
      <div className="stat-icon-wrap" style={{ background: color + "18" }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        <p className="stat-sub">{sub}</p>
      </div>
    </div>
  );
}

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
  const [openAddSignal, setOpenAddSignal] = useState(0);
  const [voiceStartSignal, setVoiceStartSignal] = useState(0);
  const [exportSignal, setExportSignal] = useState(0);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const avatarLetter = user.fullName?.[0]?.toUpperCase() || "A";
  const profilePhotoUrl = user.profilePhotoUrl || "";

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "inventory", icon: Package, label: "Inventory" },
    { id: "reports", icon: BarChart3, label: "Reports" },
    { id: "users", icon: UsersIcon, label: "Users" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];

  const { title, sub } = pageTitles[activePage] || pageTitles.dashboard;

  const handleVoiceCommand = (command, value) => {
    if (command === "navigate") setActivePage(value);
    if (command === "logout") onLogout();
    if (command === "export_report") {
      setActivePage("reports");
      setExportSignal((v) => v + 1);
    }
    if (command === "add_product") {
      setActivePage("inventory");
      setOpenAddSignal((v) => v + 1);
    }
  };

  const handleGestureCommand = (gesture) => {
    const gestureMap = {
      open_palm: "dashboard",
      peace: "inventory",
      point_up: "reports",
      thumbs_up: "users",
      fist: "settings",
    };
    if (gesture === "voice_start") {
      setVoiceStartSignal((v) => v + 1);
      return;
    }
    const page = gestureMap[gesture];
    if (page) setActivePage(page);
  };


  const renderPage = () => {
    if (activePage === "inventory") return <Inventory openAddSignal={openAddSignal} />;
    if (activePage === "reports") return <Reports exportSignal={exportSignal} />;
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
              <LayoutDashboard size={20} />
            </div>
            {sidebarOpen && <span className="s-logo-text">StockWave</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
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
              <span className="nav-icon"><item.icon size={20} /></span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="user-avatar-img" />
              ) : (
                avatarLetter
              )}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <p className="user-name">{user.fullName || "Admin"}</p>
                <p className="user-role">Account</p>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={18} />
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
            <VoiceControl onCommand={handleVoiceCommand} startSignal={voiceStartSignal} />
            <GestureControl onGesture={handleGestureCommand} />
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
              <span className="mobile-nav-icon"><item.icon size={20} /></span>
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
        <StatCard icon={Package} label="Total Products"
          value={summary?.totalProducts ?? "—"}
          sub="In database" color="#059669" delay="0ms" />
        <StatCard icon={AlertTriangle} label="Low Stock"
          value={summary?.lowStock ?? "—"}
          sub="Needs restocking" color="#f59e0b" delay="80ms" />
        <StatCard icon={TrendingUp} label="Items Added"
          value={summary?.itemsAddedThisMonth ?? "—"}
          sub="This month" color="#3b82f6" delay="160ms" />
        <StatCard icon={TrendingDown} label="Items Removed"
          value={summary?.itemsRemovedThisMonth ?? "—"}
          sub="This month" color="#8b5cf6" delay="240ms" />
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
            <p style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>
              All items are well stocked!
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
                      }} />
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