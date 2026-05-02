import { useState } from "react";
import "./Reports.css";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// ── Mock Data ──────────────────────────────────────
const monthlyStock = [
  { month: "Jul", added: 180, removed: 90 },
  { month: "Aug", added: 220, removed: 110 },
  { month: "Sep", added: 195, removed: 130 },
  { month: "Oct", added: 260, removed: 100 },
  { month: "Nov", added: 310, removed: 160 },
  { month: "Dec", added: 280, removed: 140 },
  { month: "Jan", added: 186, removed: 94 },
];

const categoryBreakdown = [
  { name: "Electronics", value: 113, color: "#1a6b3c" },
  { name: "Furniture", value: 53, color: "#2d8653" },
  { name: "Office Supplies", value: 76, color: "#6dbf8e" },
  { name: "Food", value: 200, color: "#b6dfc8" },
  { name: "Tools", value: 60, color: "#e8f5ee" },
];

const stockValueTrend = [
  { month: "Jul", value: 142000 },
  { month: "Aug", value: 168000 },
  { month: "Sep", value: 155000 },
  { month: "Oct", value: 190000 },
  { month: "Nov", value: 225000 },
  { month: "Dec", value: 210000 },
  { month: "Jan", value: 198000 },
];

const topProducts = [
  { name: "Wireless Keyboard", category: "Electronics", turnover: 92, stock: 50 },
  { name: "Mouse Pad", category: "Electronics", turnover: 78, stock: 45 },
  { name: "Printer Paper", category: "Office", turnover: 74, stock: 7 },
  { name: "Monitor Stand", category: "Furniture", turnover: 65, stock: 30 },
  { name: "USB-C Cable", category: "Electronics", turnover: 58, stock: 12 },
];

const lowStockReport = [
  { name: "AA Batteries", stock: 4, min: 20, status: "Critical" },
  { name: "Ethernet Cable", stock: 2, min: 15, status: "Critical" },
  { name: "HDMI Cable", stock: 0, min: 15, status: "Out" },
  { name: "Printer Paper", stock: 7, min: 50, status: "Low" },
  { name: "Sticky Notes", stock: 9, min: 30, status: "Low" },
  { name: "Office Chair", stock: 5, min: 10, status: "Low" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="tooltip-value" style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.value > 999
              ? "₱" + p.value.toLocaleString()
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.07) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("7months");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "stock", label: "Stock Movement" },
    { id: "value", label: "Stock Value" },
    { id: "alerts", label: "Low Stock" },
  ];

  return (
    <div className="rep-root">
      {/* ── PAGE HEADER ── */}
      <div className="rep-header">
        <div>
          <h1 className="rep-title">Reports</h1>
          <p className="rep-sub">Analytics and insights for your inventory</p>
        </div>
        <div className="rep-header-actions">
          <select className="date-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="7months">Last 7 Months</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn-export">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="rep-summary">
        {[
          { label: "Total Stock Value", value: "₱198,000", change: "+8.2%", up: true, icon: "💰" },
          { label: "Items Added (Month)", value: "186", change: "+12.4%", up: true, icon: "📥" },
          { label: "Items Removed (Month)", value: "94", change: "-5.1%", up: false, icon: "📤" },
          { label: "Stock Turnover Rate", value: "68%", change: "+3.7%", up: true, icon: "🔄" },
        ].map((s, i) => (
          <div className="rep-stat-card" key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="rep-stat-top">
              <span className="rep-stat-icon">{s.icon}</span>
              <span className={`rep-change ${s.up ? "up" : "down"}`}>
                {s.up ? "↑" : "↓"} {s.change}
              </span>
            </div>
            <h3 className="rep-stat-value">{s.value}</h3>
            <p className="rep-stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="rep-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`rep-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="charts-row">
            {/* Monthly In vs Out */}
            <div className="rep-chart-card wide">
              <div className="rep-chart-header">
                <div>
                  <h3 className="rep-chart-title">Stock In vs Out</h3>
                  <p className="rep-chart-sub">Monthly comparison</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyStock} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Legend wrapperStyle={{ fontSize: 12 }}/>
                  <Bar dataKey="added" name="Added" fill="#1a6b3c" radius={[4,4,0,0]} maxBarSize={28}/>
                  <Bar dataKey="removed" name="Removed" fill="#e8f5ee" radius={[4,4,0,0]} maxBarSize={28}
                    stroke="#1a6b3c" strokeWidth={1}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="rep-chart-card">
              <div className="rep-chart-header">
                <div>
                  <h3 className="rep-chart-title">By Category</h3>
                  <p className="rep-chart-sub">Stock distribution</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%" cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    labelLine={false}
                    label={PieLabel}
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val + " units", name]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {categoryBreakdown.map((c, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: c.color }}/>
                    <span className="pie-label">{c.name}</span>
                    <span className="pie-val">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Top Moving Products</h3>
                <p className="rep-chart-sub">Highest turnover this month</p>
              </div>
            </div>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Turnover Rate</th>
                  <th>Current Stock</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="rank-cell">#{i + 1}</td>
                    <td className="prod-name">{p.name}</td>
                    <td><span className="cat-tag">{p.category}</span></td>
                    <td>
                      <div className="turnover-wrap">
                        <div className="turnover-bar-bg">
                          <div className="turnover-bar-fill" style={{ width: `${p.turnover}%` }}/>
                        </div>
                        <span className="turnover-pct">{p.turnover}%</span>
                      </div>
                    </td>
                    <td className="stock-cell">{p.stock} pcs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <div className="tab-content">
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Stock Movement Detail</h3>
                <p className="rep-chart-sub">Items added and removed over time</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyStock} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="addedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a6b3c" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="removedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />}/>
                <Legend wrapperStyle={{ fontSize: 13 }}/>
                <Area type="monotone" dataKey="added" name="Added" stroke="#1a6b3c" strokeWidth={2.5}
                  fill="url(#addedGrad)" dot={{ r: 4, fill: "#1a6b3c" }} activeDot={{ r: 6 }}/>
                <Area type="monotone" dataKey="removed" name="Removed" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#removedGrad)" dot={{ r: 4, fill: "#ef4444" }} activeDot={{ r: 6 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="stock-summary-grid">
            {[
              { label: "Total Added", value: "1,631", icon: "📥", color: "#1a6b3c", bg: "#e8f5ee" },
              { label: "Total Removed", value: "824", icon: "📤", color: "#ef4444", bg: "#fef2f2" },
              { label: "Net Change", value: "+807", icon: "📊", color: "#2563eb", bg: "#eff6ff" },
              { label: "Avg Monthly Added", value: "233", icon: "📈", color: "#7c3aed", bg: "#f5f3ff" },
            ].map((s, i) => (
              <div key={i} className="stock-sum-card" style={{ background: s.bg }}>
                <span className="stock-sum-icon">{s.icon}</span>
                <h3 className="stock-sum-value" style={{ color: s.color }}>{s.value}</h3>
                <p className="stock-sum-label">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "value" && (
        <div className="tab-content">
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Total Stock Value Over Time</h3>
                <p className="rep-chart-sub">Estimated value of all inventory (₱)</p>
              </div>
              <span className="chart-badge up">↑ 8.2% this month</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockValueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a6b3c" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => "₱" + (v/1000).toFixed(0) + "k"}
                  tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v => ["₱" + v.toLocaleString(), "Stock Value"]}/>
                <Line type="monotone" dataKey="value" stroke="#1a6b3c" strokeWidth={3}
                  dot={{ r: 5, fill: "#1a6b3c", strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 7 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="value-cards-row">
            <div className="value-info-card">
              <h4 className="vic-title">Highest Value Category</h4>
              <p className="vic-main">Furniture</p>
              <p className="vic-sub">₱85,500 total estimated value</p>
            </div>
            <div className="value-info-card">
              <h4 className="vic-title">Lowest Value Category</h4>
              <p className="vic-main">Office Supplies</p>
              <p className="vic-sub">₱12,300 total estimated value</p>
            </div>
            <div className="value-info-card">
              <h4 className="vic-title">Peak Month</h4>
              <p className="vic-main">November</p>
              <p className="vic-sub">₱225,000 total stock value</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="tab-content">
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Low Stock Report</h3>
                <p className="rep-chart-sub">Items that need restocking attention</p>
              </div>
              <span className="alert-badge">{lowStockReport.length} items</span>
            </div>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Minimum Required</th>
                  <th>Shortage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockReport.map((item, i) => {
                  const shortage = Math.max(0, item.min - item.stock);
                  return (
                    <tr key={i}>
                      <td className="prod-name">{item.name}</td>
                      <td className={`stock-num ${item.stock === 0 ? "zero" : "low"}`}>
                        {item.stock}
                      </td>
                      <td className="mid-text">{item.min}</td>
                      <td className="shortage-cell">−{shortage}</td>
                      <td>
                        <span className={`alert-status ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="restock-all-btn">📦 Generate Restock Order</button>
          </div>
        </div>
      )}
    </div>
  );
}