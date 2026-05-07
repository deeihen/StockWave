import { useState, useEffect, useRef } from "react";
import { getLowStock, getRecentActivity } from "../api/stockwaveApi";
import "./Notifications.css";

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadNotifications = async () => {
    try {
      const [lowRes, actRes] = await Promise.all([
        getLowStock(),
        getRecentActivity(),
      ]);

      const lowStockNotifs = lowRes.data.map((item) => ({
        id: `low-${item.id}`,
        type: "warning",
        icon: "⚠️",
        title: "Low Stock Alert",
        message: `${item.name} is running low — only ${item.stock} ${item.unit} left.`,
        time: "Now",
      }));

      const activityNotifs = actRes.data.slice(0, 3).map((a) => ({
        id: `act-${a.id}`,
        type: a.action === "Added" ? "success" : "info",
        icon: a.action === "Added" ? "📥" : "📤",
        title: `${a.action}: ${a.item}`,
        message: `${a.quantity} units by ${a.performedBy}`,
        time: new Date(a.timestamp).toLocaleString("en-PH"),
      }));

      setNotifications([...lowStockNotifs, ...activityNotifs]);
    } catch {
      // silently fail
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    setReadIds(notifications.map((n) => n.id));
  };

  const markRead = (id) => {
    setReadIds((prev) => [...new Set([...prev, id])]);
  };

  const clearAll = () => {
    setNotifications([]);
    setReadIds([]);
    setOpen(false);
  };

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className="notif-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <h3 className="notif-title">Notifications</h3>
            <div className="notif-actions">
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn red" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon">🎉</span>
                <p>All caught up! No notifications.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${readIds.includes(n.id) ? "read" : "unread"}`}
                  onClick={() => markRead(n.id)}
                >
                  <div className={`notif-icon-wrap ${n.type}`}>
                    <span>{n.icon}</span>
                  </div>
                  <div className="notif-content">
                    <p className="notif-item-title">{n.title}</p>
                    <p className="notif-item-msg">{n.message}</p>
                    <p className="notif-item-time">{n.time}</p>
                  </div>
                  {!readIds.includes(n.id) && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}