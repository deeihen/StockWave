import { useState, useEffect, useRef } from "react";
import { exportReportsPDF, generateRestockOrder } from "../api/pdfUtils";
import "./Reports.css";
import { useActionGuard } from "../hooks/useActionGuard";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import {
  getReportSummary, getLowStock, getRecentActivity,
  getCategoryBreakdown, getStockMovement, getTopProducts
} from "../api/stockwaveApi";
import {
  Download,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart as BarChartIcon,
  Layers
} from "lucide-react";

const PIE_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="tooltip-value" style={{ color: p.color || p.fill }}>
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
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Reports({ exportSignal = 0 }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { run, isRunning } = useActionGuard(500);
  const lastExportRef = useRef(exportSignal);
  const pendingExportRef = useRef(false);

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
        // Sort categories by value for the cards
        setCategoryData([...c.data].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0)));
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
  const totalSold = stockMovement.reduce((s, m) => s + m.sold, 0);
  const netChange = totalAdded - totalSold;

  useEffect(() => {
    if (exportSignal > lastExportRef.current) {
      lastExportRef.current = exportSignal;
      if (loading) {
        pendingExportRef.current = true;
      } else {
        run("export-pdf", async () =>
          exportReportsPDF(summary, categoryData, stockMovement, topProducts)
        );
      }
    }
  }, [exportSignal, loading, run, summary, categoryData, stockMovement, topProducts]);

  useEffect(() => {
    if (!loading && pendingExportRef.current) {
      pendingExportRef.current = false;
      run("export-pdf", async () =>
        exportReportsPDF(summary, categoryData, stockMovement, topProducts)
      );
    }
  }, [loading, run, summary, categoryData, stockMovement, topProducts]);

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
              run("export-pdf", async () =>
                exportReportsPDF(
                  summary,
                  categoryData,
                  stockMovement,
                  topProducts,
                )
              )
            }
            disabled={isRunning("export-pdf")}
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="rep-summary">
        <div className="rep-stat-card" style={{ animationDelay: "0ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon" style={{ color: "#059669", background: "#ecfdf5" }}><DollarSign size={18} /></span>
            <span className="rep-change up">Live</span>
          </div>
          <h3 className="rep-stat-value">
            ₱{(summary?.totalStockValue ?? 0).toLocaleString()}
          </h3>
          <p className="rep-stat-label">Total Stock Value</p>
        </div>

        <div className="rep-stat-card" style={{ animationDelay: "60ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon" style={{ color: "#3b82f6", background: "#eff6ff" }}><TrendingUp size={18} /></span>
            <span className="rep-change up">↑ This month</span>
          </div>
          <h3 className="rep-stat-value">
            {summary?.itemsAddedThisMonth ?? "—"}
          </h3>
          <p className="rep-stat-label">Items Added</p>
        </div>

        <div className="rep-stat-card" style={{ animationDelay: "120ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon" style={{ color: "#ef4444", background: "#fef2f2" }}><TrendingDown size={18} /></span>
            <span className="rep-change down">↓ This month</span>
          </div>
          <h3 className="rep-stat-value">
            {summary?.itemsSoldThisMonth ?? "—"}
          </h3>
          <p className="rep-stat-label">Sales</p>
        </div>

        <div className="rep-stat-card" style={{ animationDelay: "180ms" }}>
          <div className="rep-stat-top">
            <span className="rep-stat-icon" style={{ color: "#8b5cf6", background: "#f5f3ff" }}><Package size={18} /></span>
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
                  <h3 className="rep-chart-title">Stock In vs Sales</h3>
                  <p className="rep-chart-sub">Monthly comparison</p>
                </div>
              </div>
              {stockMovement.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0" }}>
                  No transaction data yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={stockMovement}
                    margin={{ top: 5, right: 5, left: 10, bottom: 0 }}
                    barCategoryGap="30%"
                    barGap={6}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(34, 211, 238, 0.08)" }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
<<<<<<< HEAD
                    <Bar dataKey="added" name="Added" fill="#059669" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="sold" name="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
=======
                    <Bar dataKey="added" name="Added" fill="#059669" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="sold" name="Sold" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
>>>>>>> 979a84da046314a9d0c20d7852c414509e1c5997
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
                <p style={{ color: "#9ca3af", fontSize: 13 }}>No data.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        outerRadius={70}
                        innerRadius={45}
                        dataKey="value"
                        labelLine={false}
                        label={PieLabel}
                        paddingAngle={2}
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val + " units", name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {categoryData.slice(0, 4).map((c, i) => (
                      <div key={i} className="pie-legend-item">
                        <span className="pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
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
                <h3 className="rep-chart-title">Top Selling Products</h3>
                <p className="rep-chart-sub">Most sales by units sold</p>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No activity yet.</p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>#</th><th>Product</th><th>Category</th><th>Total Sold</th><th>Stock</th>
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
                            <div className="turnover-bar-fill"
                              style={{ width: `${Math.min((p.totalSold / (topProducts[0]?.totalSold || 1)) * 100, 100)}%` }} />
                          </div>
                          <span className="turnover-pct">{p.totalSold}</span>
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
                <h3 className="rep-chart-title">Stock vs Sales Detail</h3>
                <p className="rep-chart-sub">Items added and sold over time</p>
              </div>
            </div>
            {stockMovement.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No movement data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stockMovement} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="addedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="removedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="added" name="Added" stroke="#059669" strokeWidth={2} fill="url(#addedGrad)" />
                  <Area type="monotone" dataKey="sold" name="Sales" stroke="#6366f1" strokeWidth={2} fill="url(#removedGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="stock-summary-grid">
            {[
              { label: "Total Added", value: totalAdded, color: "#059669", bg: "#ecfdf5" },
              { label: "Total Sold", value: totalSold, color: "#6366f1", bg: "#eef2ff" },
              { label: "Net Change", value: (netChange >= 0 ? "+" : "") + netChange, color: "#3b82f6", bg: "#eff6ff" },
              { label: "Low Items", value: summary?.lowStock ?? 0, color: "#f59e0b", bg: "#fffbeb" },
            ].map((s, i) => (
              <div key={i} className="stock-sum-card" style={{ background: s.bg }}>
                <h3 className="stock-sum-value" style={{ color: s.color }}>{s.value}</h3>
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
                <h3 className="rep-chart-title">Inventory Value Breakdown</h3>
                <p className="rep-chart-sub">Estimated stock value per category (₱)</p>
              </div>
              <span className="chart-badge">₱{(summary?.totalStockValue ?? 0).toLocaleString()} Total</span>
            </div>
            {categoryData.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => "₱" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)}
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip formatter={(v) => ["₱" + v.toLocaleString(), "Stock Value"]} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="totalValue" name="Value" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="value-cards-row">
            {categoryData.slice(0, 3).map((c, i) => (
              <div key={i} className="value-info-card">
                <p className="vic-label">{i === 0 ? "Top Category" : i === 1 ? "Secondary" : "Third"}</p>
                <h4 className="vic-main">{c.name}</h4>
                <p className="vic-sub">₱{(c.totalValue ?? 0).toLocaleString()}</p>
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
                <p className="rep-chart-sub">Items below minimum threshold</p>
              </div>
              <span className="alert-badge">{lowStockItems.length} items</span>
            </div>
            {lowStockItems.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>All items well stocked.</p>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Product</th><th>Category</th><th>Current Stock</th><th>Price</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, i) => (
                    <tr key={i}>
                      <td className="prod-name">{item.name}</td>
                      <td><span className="cat-tag">{item.category}</span></td>
                      <td className={`stock-num ${item.stock === 0 ? "zero" : "low"}`}>{item.stock} {item.unit}</td>
                      <td className="mid-text">₱{item.price?.toLocaleString()}</td>
                      <td>
                        <span className={`alert-status ${item.status === "Out of Stock" ? "out" : "low"}`}>
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
              onClick={() => run("restock", async () => generateRestockOrder(lowStockItems))}
              disabled={isRunning("restock")}
            >
              <Package size={16} /> Generate Restock Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}