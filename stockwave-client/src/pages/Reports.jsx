import { useState, useEffect } from "react";
import { exportReportsPDF, generateRestockOrder } from "../api/pdfUtils";
import "./Reports.css";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import {
  getReportSummary, getLowStock, getRecentActivity,
  getCategoryBreakdown, getStockMovement, getTopProducts
} from "../api/stockwaveApi";

const PIE_COLORS = ["#1a6b3c", "#2d8653", "#6dbf8e", "#b6dfc8", "#d97706", "#2563eb"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="tooltip-value" style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.value > 999
              ? "₱" + p.value.toLocaleString() : p.value}
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

  // Real data state
  const [summary, setSummary] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [stockMovement, setStockMovement] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, l, c, m, t] = await Promise.all([
          getReportSummary(),
          getLowStock(),
          getCategoryBreakdown(),
          getStockMovement(),
          getTopProducts(),
        ]);
        setSummary(s.data);
        setLowStockItems(l.data);
        setCategoryData(c.data);
        setStockMovement(m.data);
        setTopProducts(t.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "stock", label: "Stock Movement" },
    { id: "value", label: "Stock Value" },
    { id: "alerts", label: "Low Stock" },
  ];

  // Derived stats
  const totalAdded = stockMovement.reduce((s, m) => s + m.added, 0);
  const totalRemoved = stockMovement.reduce((s, m) => s + m.removed, 0);
  const netChange = totalAdded - totalRemoved;

  // Stock value trend derived from category data (simulated per month from transactions)
  const stockValueTrend = stockMovement.map(m => ({
    month: m.month,
    value: summary?.totalStockValue
      ? Math.round(summary.totalStockValue * (0.85 + Math.random() * 0.3))
      : 0
  }));

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 64, color: "#9ca3af", fontSize: 14 }}>
        Loading reports...
      </div>
    );
  }

  return (
    <div className="rep-root">
      {/* ── PAGE HEADER ── */}
      <div className="rep-header">
        <div>
          <h1 className="rep-title">Reports</h1>
          <p className="rep-sub">Analytics and insights for your inventory</p>
        </div>
        <div className="rep-header-actions">
          <button
            className="btn-export"
            onClick={() =>
              exportReportsPDF(
                summary,
                categoryData,
                stockMovement,
                topProducts,
              )
            }
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="rep-summary">
        <div className="rep-stat-card" style={{ animationDelay: "0ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon">💰</span>
            <span className="rep-change up">Live</span>
          </div>
          <h3 className="rep-stat-value">
            ₱{(summary?.totalStockValue ?? 0).toLocaleString()}
          </h3>
          <p className="rep-stat-label">Total Stock Value</p>
        </div>

        <div className="rep-stat-card" style={{ animationDelay: "60ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon">📥</span>
            <span className="rep-change up">↑ This month</span>
          </div>
          <h3 className="rep-stat-value">
            {summary?.itemsAddedThisMonth ?? "—"}
          </h3>
          <p className="rep-stat-label">Items Added (Month)</p>
        </div>

        <div className="rep-stat-card" style={{ animationDelay: "120ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon">📤</span>
            <span className="rep-change down">↓ This month</span>
          </div>
          <h3 className="rep-stat-value">
            {summary?.itemsRemovedThisMonth ?? "—"}
          </h3>
          <p className="rep-stat-label">Items Removed (Month)</p>
        </div>

        <div className="rep-stat-card" style={{ animationDelay: "180ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon">📦</span>
            <span className="rep-change up">Live</span>
          </div>
          <h3 className="rep-stat-value">{summary?.totalProducts ?? "—"}</h3>
          <p className="rep-stat-label">Total Products</p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="rep-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`rep-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="charts-row">
            {/* Stock In vs Out */}
            <div className="rep-chart-card wide">
              <div className="rep-chart-header">
                <div>
                  <h3 className="rep-chart-title">Stock In vs Out</h3>
                  <p className="rep-chart-sub">Monthly comparison</p>
                </div>
              </div>
              {stockMovement.length === 0 ? (
                <p
                  style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0" }}
                >
                  No transaction data yet. Add and edit products to see movement
                  here.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={stockMovement}
                    margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="added"
                      name="Added"
                      fill="#1a6b3c"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="removed"
                      name="Removed"
                      fill="#e8f5ee"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                      stroke="#1a6b3c"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Pie */}
            <div className="rep-chart-card">
              <div className="rep-chart-header">
                <div>
                  <h3 className="rep-chart-title">By Category</h3>
                  <p className="rep-chart-sub">Stock distribution</p>
                </div>
              </div>
              {categoryData.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 13 }}>
                  No products yet.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                        label={PieLabel}
                      >
                        {categoryData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name) => [val + " units", name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {categoryData.map((c, i) => (
                      <div key={i} className="pie-legend-item">
                        <span
                          className="pie-dot"
                          style={{
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="pie-label">{c.name}</span>
                        <span className="pie-val">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Top Moving Products</h3>
                <p className="rep-chart-sub">
                  Most activity by transaction count
                </p>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>
                No product activity yet.
              </p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Total Moved</th>
                    <th>Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td className="rank-cell">#{i + 1}</td>
                      <td className="prod-name">{p.name}</td>
                      <td>
                        <span className="cat-tag">{p.category}</span>
                      </td>
                      <td>
                        <div className="turnover-wrap">
                          <div className="turnover-bar-bg">
                            <div
                              className="turnover-bar-fill"
                              style={{
                                width: `${Math.min((p.totalMoved / (topProducts[0]?.totalMoved || 1)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="turnover-pct">{p.totalMoved}</span>
                        </div>
                      </td>
                      <td className="stock-cell">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── STOCK MOVEMENT TAB ── */}
      {activeTab === "stock" && (
        <div className="tab-content">
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Stock Movement Detail</h3>
                <p className="rep-chart-sub">
                  Items added and removed over time
                </p>
              </div>
            </div>
            {stockMovement.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0" }}>
                No movement data yet. Add and edit products to track changes.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={stockMovement}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="addedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#1a6b3c"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="removedGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Area
                    type="monotone"
                    dataKey="added"
                    name="Added"
                    stroke="#1a6b3c"
                    strokeWidth={2.5}
                    fill="url(#addedGrad)"
                    dot={{ r: 4, fill: "#1a6b3c" }}
                    activeDot={{ r: 6 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="removed"
                    name="Removed"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#removedGrad)"
                    dot={{ r: 4, fill: "#ef4444" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="stock-summary-grid">
            {[
              {
                label: "Total Added",
                value: totalAdded,
                icon: "📥",
                color: "#1a6b3c",
                bg: "#e8f5ee",
              },
              {
                label: "Total Removed",
                value: totalRemoved,
                icon: "📤",
                color: "#ef4444",
                bg: "#fef2f2",
              },
              {
                label: "Net Change",
                value: netChange >= 0 ? `+${netChange}` : netChange,
                icon: "📊",
                color: "#2563eb",
                bg: "#eff6ff",
              },
              {
                label: "Low Stock Items",
                value: summary?.lowStock ?? 0,
                icon: "⚠️",
                color: "#d97706",
                bg: "#fef3c7",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="stock-sum-card"
                style={{ background: s.bg }}
              >
                <span className="stock-sum-icon">{s.icon}</span>
                <h3 className="stock-sum-value" style={{ color: s.color }}>
                  {s.value}
                </h3>
                <p className="stock-sum-label">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STOCK VALUE TAB ── */}
      {activeTab === "value" && (
        <div className="tab-content">
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Total Stock Value</h3>
                <p className="rep-chart-sub">
                  Estimated value of all inventory (₱)
                </p>
              </div>
              <span className="chart-badge up">
                ₱{(summary?.totalStockValue ?? 0).toLocaleString()} current
              </span>
            </div>
            {categoryData.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0" }}>
                Add products to see stock value data.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={categoryData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      "₱" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)
                    }
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => ["₱" + v.toLocaleString(), "Stock Value"]}
                  />
                  <Bar
                    dataKey="totalValue"
                    name="Value"
                    fill="#1a6b3c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="value-cards-row">
            {categoryData.slice(0, 3).map((c, i) => (
              <div key={i} className="value-info-card">
                <h4 className="vic-title">
                  {i === 0
                    ? "Highest Value Category"
                    : i === 1
                      ? "2nd Highest"
                      : "3rd Highest"}
                </h4>
                <p className="vic-main">{c.name}</p>
                <p className="vic-sub">
                  ₱{(c.totalValue ?? 0).toLocaleString()} total value
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOW STOCK TAB ── */}
      {activeTab === "alerts" && (
        <div className="tab-content">
          <div className="rep-chart-card full">
            <div className="rep-chart-header">
              <div>
                <h3 className="rep-chart-title">Low Stock Report</h3>
                <p className="rep-chart-sub">
                  Items that need restocking attention
                </p>
              </div>
              <span className="alert-badge">{lowStockItems.length} items</span>
            </div>
            {lowStockItems.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0" }}>
                🎉 All items are well stocked!
              </p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Unit Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, i) => (
                    <tr key={i}>
                      <td className="prod-name">{item.name}</td>
                      <td>
                        <span className="cat-tag">{item.category}</span>
                      </td>
                      <td
                        className={`stock-num ${item.stock === 0 ? "zero" : "low"}`}
                      >
                        {item.stock} {item.unit}
                      </td>
                      <td className="mid-text">
                        ₱{item.price?.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`alert-status ${item.status === "Out of Stock" ? "out" : item.stock <= 3 ? "critical" : "low"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              className="restock-all-btn"
              onClick={() => generateRestockOrder(lowStockItems)}
            >
              📦 Generate Restock Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}