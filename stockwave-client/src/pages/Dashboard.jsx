import { useState, useEffect, useRef } from "react";
import Notifications from "../components/Notifications";
import VoiceControl from "../components/VoiceControl";
import GestureControl from "../components/GestureControl";
import "./Dashboard.css";
import Inventory from "./Inventory";
import Reports from "./Reports";
import Users from "./Users";
import Settings from "./Settings";
import Pos from "./Pos";
import { getReportSummary, getRecentActivity, getLowStock } from "../api/stockwaveApi";
import { askWaveAI, resetChat } from "../api/geminiApi";
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
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Sparkles,
  Cpu,
  CreditCard,
  ScanBarcode,
  ShieldCheck,
  RefreshCw,
  Send,
  X,
} from "lucide-react";

const pageTitles = {
  dashboard: { title: "Dashboard", sub: "Welcome back — here's what's happening today." },
  inventory: { title: "Inventory", sub: "Manage and track all your products." },
  pos: { title: "Point of Sale", sub: "Fast checkout with live inventory sync." },
  reports: { title: "Reports", sub: "View analytics and stock reports." },
  users: { title: "Users", sub: "Manage system users and roles." },
  settings: { title: "Settings", sub: "Configure your preferences." },
};

// ── Main Dashboard Component ───────────────────────
export default function Dashboard({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [openAddSignal, setOpenAddSignal] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);
  const [exportSignal, setExportSignal] = useState(0);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const avatarLetter = user.fullName?.[0]?.toUpperCase() || "A";
  const profilePhotoUrl = user.profilePhotoUrl || "";

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "inventory", icon: Package, label: "Inventory" },
    { id: "pos", icon: CreditCard, label: "POS" },
    { id: "reports", icon: BarChart3, label: "Reports" },
    { id: "users", icon: UsersIcon, label: "Users", adminOnly: true },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];

  const isAdmin = user.role === "Admin";
  const { title, sub } = pageTitles[activePage] || pageTitles.dashboard;

  const handleVoiceCommand = (command, value) => {
    if (command === "voice_off") { setVoiceActive(false); return; }
    if (command === "gesture_on") { setGestureActive(true); return; }
    if (command === "navigate") {
      const item = navItems.find(i => i.id === value);
      if (item && (!item.adminOnly || isAdmin)) setActivePage(value);
    }
    if (command === "logout") onLogout();
    if (command === "export_report") { setActivePage("reports"); setExportSignal(v => v + 1); }
    if (command === "add_product") { setActivePage("inventory"); setOpenAddSignal(v => v + 1); }
  };

  const handleGestureCommand = (gesture) => {
    const gestureMap = {
      open_palm: "dashboard",
      peace: "inventory",
      point_up: "reports",
      thumbs_up: "users",
      fist: "settings",
    };
    if (gesture === "voice_start") { setVoiceActive(true); return; }
    if (gesture === "stop_camera") { setGestureActive(false); return; }
    const page = gestureMap[gesture];
    const item = navItems.find(i => i.id === page);
    if (page && item && (!item.adminOnly || isAdmin)) setActivePage(page);
  };

  const renderPage = () => {
    if (activePage === "inventory") return <Inventory openAddSignal={openAddSignal} />;
    if (activePage === "pos") return <Pos />;
    if (activePage === "reports") return <Reports exportSignal={exportSignal} />;
    if (activePage === "users" && isAdmin) return <Users />;
    if (activePage === "settings") return <Settings />;
    return <DashboardHome />;
  };

  return (
    <div className="dash-root">
      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="s-logo-icon"><LayoutDashboard size={20} /></div>
            {sidebarOpen && <span className="s-logo-text">StockWave</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter(item => !item.adminOnly || isAdmin)
            .map(item => (
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
            <div className="header-meta">
              <span className="status-pill"><span className="pulse-dot" />Live Ops</span>
              <span className="status-pill muted"><Activity size={14} /> 32 events/min</span>
              <span className="status-pill ghost"><ShieldCheck size={14} /> Secure</span>
            </div>
          </div>
          <div className="header-right">
            <div className="header-quick">
              <button className="header-action"><RefreshCw size={16} /> Sync</button>
              <button className="header-action primary"><ScanBarcode size={16} /> Quick Scan</button>
            </div>
            <VoiceControl
              onCommand={handleVoiceCommand}
              active={voiceActive}
              onToggle={setVoiceActive}
            />
            <GestureControl
              onGesture={handleGestureCommand}
              active={gestureActive}
              onToggle={setGestureActive}
            />
            <Notifications />
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

// ── Dashboard Home ─────────────────────────────────
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

  const addedCount = activity.filter(a => a.action === "Added").length;
  const removedCount = activity.filter(a => a.action !== "Added").length;

  return (
    <div className="dash-content">
      <div className="overview-grid">
        <div className="overview-hero">
          <div className="overview-header">
            <div>
              <p className="eyebrow">Operations Overview</p>
              <h2 className="overview-title">WaveStock Command Center</h2>
              <p className="overview-sub">Unified signal across inventory, sales, and staff movement.</p>
            </div>
            <div className="hero-badges">
              <span className="hero-badge live"><span className="pulse-dot" /> Live</span>
              <span className="hero-badge"><Cpu size={14} /> AI Assist</span>
            </div>
          </div>

          <div className="stat-strip">
            <div className="stat-compact">
              <div className="stat-compact-top">
                <Package size={16} />
                <span>Total Products</span>
              </div>
              <div className="stat-compact-value">{summary?.totalProducts ?? "—"}</div>
              <div className="mini-chart"><span style={{ width: "68%" }} /></div>
            </div>
            <div className="stat-compact">
              <div className="stat-compact-top warn">
                <AlertTriangle size={16} />
                <span>Low Stock</span>
              </div>
              <div className="stat-compact-value">{summary?.lowStock ?? "—"}</div>
              <div className="mini-chart warn">
                <span style={{ width: `${Math.min((summary?.lowStock || 0) * 12, 90)}%` }} />
              </div>
            </div>
            <div className="stat-compact">
              <div className="stat-compact-top up">
                <TrendingUp size={16} />
                <span>Items Added</span>
              </div>
              <div className="stat-compact-value">{summary?.itemsAddedThisMonth ?? "—"}</div>
              <div className="mini-chart up"><span style={{ width: "78%" }} /></div>
            </div>
            <div className="stat-compact">
              <div className="stat-compact-top down">
                <TrendingDown size={16} />
                <span>Items Removed</span>
              </div>
              <div className="stat-compact-value">{summary?.itemsRemovedThisMonth ?? "—"}</div>
              <div className="mini-chart down"><span style={{ width: "58%" }} /></div>
            </div>
          </div>

          <div className="hero-split">
            <div className="movement-card">
              <div className="movement-header">
                <h3>Inventory Movement</h3>
                <span className="movement-badge">24H</span>
              </div>
              <div className="movement-bars">
                <div className="movement-bar">
                  <span>Inbound</span>
                  <div className="bar-track">
                    <div className="bar-fill in" style={{ width: `${Math.min(addedCount * 14 + 22, 95)}%` }} />
                  </div>
                  <strong>{addedCount}</strong>
                </div>
                <div className="movement-bar">
                  <span>Outbound</span>
                  <div className="bar-track">
                    <div className="bar-fill out" style={{ width: `${Math.min(removedCount * 14 + 18, 95)}%` }} />
                  </div>
                  <strong>{removedCount}</strong>
                </div>
              </div>
              <p className="movement-sub">Trend syncs with reports and POS updates.</p>
            </div>

            <div className="warehouse-card">
              <div className="warehouse-header">
                <h3>Warehouse Activity</h3>
                <span className="warehouse-live"><Zap size={14} /> Active</span>
              </div>
              <div className="warehouse-grid">
                <div>
                  <p>Dock Utilization</p>
                  <h4>78%</h4>
                  <div className="pulse-line"><span /></div>
                </div>
                <div>
                  <p>Pick Rate</p>
                  <h4>312/hr</h4>
                  <div className="pulse-line purple"><span /></div>
                </div>
                <div>
                  <p>Replenishment</p>
                  <h4>12 queued</h4>
                  <div className="pulse-line amber"><span /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overview-side">
          <div className="side-panel">
            <div className="side-panel-header">
              <h3>Live Activity Feed</h3>
              <span className="side-tag">Realtime</span>
            </div>
            <div className="feed-list">
              {activity.length === 0 ? (
                <p className="empty-note">No live activity yet.</p>
              ) : (
                activity.slice(0, 6).map(a => (
                  <div key={a.id} className="feed-item">
                    <span className={`feed-pill ${a.action === "Added" ? "in" : "out"}`}>
                      {a.action}
                    </span>
                    <div>
                      <p className="feed-title">{a.item}</p>
                      <p className="feed-meta">{a.performedBy} • {a.quantity} units</p>
                    </div>
                    <span className="feed-time">
                      {new Date(a.timestamp).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="side-panel alerts">
            <div className="side-panel-header">
              <h3>Low Stock Alerts</h3>
              <span className="alert-count">{lowStock.length}</span>
            </div>
            {lowStock.length === 0 ? (
              <p className="empty-note">All inventory levels are healthy.</p>
            ) : (
              <div className="alert-list">
                {lowStock.slice(0, 4).map((item, i) => (
                  <div key={i} className="alert-item">
                    <div>
                      <p className="alert-name">{item.name}</p>
                      <p className="alert-sub">{item.stock} units remaining</p>
                    </div>
                    <div className="alert-meter">
                      <div className="alert-fill" style={{ width: `${Math.min(item.stock * 10, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="alert-action"><Download size={14} /> Generate restock list</button>
          </div>
        </div>
      </div>

      <div className="dash-bottom-grid">
        <div className="timeline-panel">
          <div className="panel-header">
            <h3>Recent Transactions</h3>
            <span className="side-tag">Timeline</span>
          </div>
          <div className="timeline">
            {(activity.length
              ? activity
              : [{ id: "0", item: "POS Sync", action: "Added", quantity: 0, performedBy: "System", timestamp: new Date().toISOString() }]
            ).slice(0, 5).map((a, i) => (
              <div key={a.id || i} className="timeline-item">
                <div className={`timeline-dot ${a.action === "Added" ? "in" : "out"}`} />
                <div>
                  <p className="timeline-title">{a.item}</p>
                  <p className="timeline-meta">{a.action} • {a.quantity} units • {a.performedBy}</p>
                </div>
                <span className="timeline-time">
                  {new Date(a.timestamp).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Ops Assistant Panel (live Gemini) ── */}
        <div className="assistant-panel">
          <div className="panel-header">
            <h3>AI Ops Assistant</h3>
            <span className="side-tag">WaveAI</span>
          </div>
          <AssistantPanel />
        </div>
      </div>

      {/* ── Floating Ask WaveAI (live Gemini) ── */}
      <AIFloat />
    </div>
  );
}

// ── Inline Chat Panel ──────────────────────────────
function AssistantPanel() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm WaveAI. Ask me about stock levels, restocking, inventory trends, or ops." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const reply = await askWaveAI(q);
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't reach WaveAI right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assistant-body">
      <div className="assistant-messages">
        {messages.map((m, i) => (
          <div key={i} className={`assistant-message ${m.role === "user" ? "user-msg" : ""}`}>
            {m.role === "ai" && <Sparkles size={14} />}
            <p>{m.text}</p>
          </div>
        ))}
        {loading && (
          <div className="assistant-message">
            <Sparkles size={14} />
            <p className="ai-typing">WaveAI is thinking…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="assistant-input-row">
        <input
          className="assistant-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about stock, trends, ops…"
          disabled={loading}
        />
        <button className="assistant-send" onClick={send} disabled={loading}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Floating WaveAI Button ─────────────────────────
function AIFloat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    setReply("");
    try {
      const res = await askWaveAI(q);
      setReply(res);
    } catch {
      setReply("Couldn't reach WaveAI right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInput("");
    setReply("");
  };

  return (
    <div className="ai-float">
      {open ? (
        <div className="ai-float-expanded">
          <div className="ai-float-header">
            <span><Sparkles size={14} /> Ask WaveAI</span>
            <button onClick={handleClose}><X size={14} /></button>
          </div>
          {reply && <p className="ai-float-reply">{reply}</p>}
          {loading && <p className="ai-float-reply ai-typing">WaveAI is thinking…</p>}
          <div className="ai-float-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ask()}
              placeholder="Quick inventory question…"
              autoFocus
              disabled={loading}
            />
            <button onClick={ask} disabled={loading}>
              {loading ? "…" : <Send size={13} />}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-avatar"><Sparkles size={16} /></div>
          <div>
            <p>Need a quick insight?</p>
            <button onClick={() => setOpen(true)}>Ask WaveAI</button>
          </div>
        </>
      )}
    </div>
  );
}