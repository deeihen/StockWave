import { useState } from "react";
import "./Dashboard.css";
import Inventory from "./Inventory";
import Reports from "./Reports";
import Users from "./Users";
import Settings from "./Settings";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

const stockTrend = [
  { day: "Mon", value: 340 },
  { day: "Tue", value: 380 },
  { day: "Wed", value: 310 },
  { day: "Thu", value: 420 },
  { day: "Fri", value: 390 },
  { day: "Sat", value: 460 },
  { day: "Sun", value: 435 },
];

const categoryData = [
  { name: "Electronics", stock: 120 },
  { name: "Clothing", stock: 85 },
  { name: "Food", stock: 200 },
  { name: "Tools", stock: 60 },
  { name: "Office", stock: 95 },
];

const recentActivity = [
  { id: 1, action: "Added", item: "Wireless Keyboard", qty: 50, user: "Admin", time: "2 min ago", type: "in" },
  { id: 2, action: "Removed", item: "USB-C Cable", qty: 12, user: "Staff", time: "15 min ago", type: "out" },
  { id: 3, action: "Updated", item: "Office Chair", qty: 5, user: "Manager", time: "1 hr ago", type: "update" },
  { id: 4, action: "Added", item: "Monitor Stand", qty: 30, user: "Admin", time: "2 hr ago", type: "in" },
  { id: 5, action: "Removed", item: "HDMI Cable", qty: 8, user: "Staff", time: "3 hr ago", type: "out" },
];

const lowStockItems = [
  { name: "AA Batteries", stock: 4, min: 20 },
  { name: "Printer Paper", stock: 7, min: 50 },
  { name: "Ethernet Cable", stock: 2, min: 15 },
  { name: "Sticky Notes", stock: 9, min: 30 },
];

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
  dashboard: { title: "Dashboard", sub: "Welcome back, Admin — here's what's happening today." },
  inventory: { title: "Inventory", sub: "Manage and track all your products." },
  reports: { title: "Reports", sub: "View analytics and stock reports." },
  users: { title: "Users", sub: "Manage system users and roles." },
  settings: { title: "Settings", sub: "Configure your preferences." },
};

export default function Dashboard({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "inventory", icon: "📦", label: "Inventory" },
    { id: "reports", icon: "📊", label: "Reports" },
    { id: "users", icon: "👥", label: "Users" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const { title, sub } = pageTitles[activePage] || pageTitles.dashboard;

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
            <div className="user-avatar">A</div>
            {sidebarOpen && (
              <div className="user-details">
                <p className="user-name">Admin</p>
                <p className="user-role">Administrator</p>
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
            <div className="search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#aaa" strokeWidth="1.5"/>
                <path d="M21 21l-4.35-4.35" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input className="search-input" placeholder="Search products..." />
            </div>
            <button className="notif-btn">
              🔔<span className="notif-badge">4</span>
            </button>
          </div>
        </header>

        <div className="dash-page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

// ── Dashboard Home Content ─────────────────────────
function DashboardHome() {
  return (
    <div className="dash-content">
      <div className="stats-grid">
        <StatCard icon="📦" label="Total Products" value="1,248" sub="+12 this week" color="#1a6b3c" delay="0ms"/>
        <StatCard icon="⚠️" label="Low Stock" value="4" sub="Needs restocking" color="#d97706" delay="80ms"/>
        <StatCard icon="📥" label="Items Added" value="186" sub="This month" color="#2563eb" delay="160ms"/>
        <StatCard icon="📤" label="Items Removed" value="94" sub="This month" color="#7c3aed" delay="240ms"/>
      </div>

      <div className="charts-row">
        <div className="chart-card wide">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">Stock Movement</h3>
              <p className="chart-sub">Units tracked this week</p>
            </div>
            <span className="chart-badge up">↑ 14.2%</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stockTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a6b3c" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Area type="monotone" dataKey="value" stroke="#1a6b3c" strokeWidth={2.5}
                fill="url(#stockGrad)" dot={false} activeDot={{ r: 5, fill: "#1a6b3c" }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-title">By Category</h3>
              <p className="chart-sub">Current stock levels</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="stock" fill="#1a6b3c" radius={[4, 4, 0, 0]} maxBarSize={32}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bottom-row">
        <div className="table-card wide">
          <div className="table-card-header">
            <h3 className="chart-title">Recent Activity</h3>
            <button className="see-all-btn">See all</button>
          </div>
          <table className="activity-table">
            <thead>
              <tr>
                <th>Action</th><th>Item</th><th>Qty</th><th>By</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(a => (
                <tr key={a.id}>
                  <td><span className={`action-badge ${a.type}`}>{a.action}</span></td>
                  <td className="item-name">{a.item}</td>
                  <td className="qty-cell">{a.qty}</td>
                  <td className="user-cell">{a.user}</td>
                  <td className="time-cell">{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <div className="table-card-header">
            <h3 className="chart-title">Low Stock Alerts</h3>
            <span className="alert-count">{lowStockItems.length}</span>
          </div>
          <div className="low-stock-list">
            {lowStockItems.map((item, i) => {
              const pct = Math.round((item.stock / item.min) * 100);
              return (
                <div key={i} className="low-stock-item">
                  <div className="low-stock-top">
                    <span className="low-stock-name">{item.name}</span>
                    <span className="low-stock-qty">{item.stock} / {item.min}</span>
                  </div>
                  <div className="low-stock-bar-bg">
                    <div className="low-stock-bar-fill"
                      style={{ width: `${pct}%`, background: pct < 20 ? "#ef4444" : "#d97706" }}/>
                  </div>
                  <p className="low-stock-hint">{pct}% of minimum stock</p>
                </div>
              );
            })}
          </div>
          <button className="restock-btn">Restock All</button>
        </div>
      </div>
    </div>
  );
}

// ── Coming Soon placeholder ────────────────────────
function ComingSoon({ label, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "60vh", gap: 12, color: "#9ca3af" }}>
      <span style={{ fontSize: 48 }}>{icon}</span>
      <p style={{ fontSize: 18, fontWeight: 600, color: "#4b5563" }}>{label}</p>
      <p style={{ fontSize: 14 }}>Coming soon...</p>
    </div>
  );
}