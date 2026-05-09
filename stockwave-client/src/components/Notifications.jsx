import { useState, useEffect, useRef } from "react";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications 
} from "../api/stockwaveApi";
import "./Notifications.css";
import { useActionGuard } from "../hooks/useActionGuard";
import { Bell, PartyPopper, X } from "lucide-react";

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const { run, isRunning } = useActionGuard(500);

  useEffect(() => {
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
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
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await run("mark-all-read", async () => {
      try {
        await markAllNotificationsAsRead();
        await loadNotifications();
      } catch (err) {
        console.error("Failed to mark all as read:", err);
      }
    });
  };

  const markRead = async (id) => {
    await run(`mark-${id}`, async () => {
      try {
        await markNotificationAsRead(id);
        await loadNotifications();
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    });
  };

  const deleteNotif = async (id) => {
    await run(`delete-${id}`, async () => {
      try {
        await deleteNotification(id);
        await loadNotifications();
      } catch (err) {
        console.error("Failed to delete notification:", err);
      }
    });
  };

  const clearAll = async () => {
    await run("clear-all", async () => {
      try {
        await clearAllNotifications();
        setNotifications([]);
        setOpen(false);
      } catch (err) {
        console.error("Failed to clear all:", err);
      }
    });
  };

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button
        className="notif-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        <Bell size={20} />
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
                <button className="notif-action-btn" onClick={markAllRead} disabled={isRunning("mark-all-read")}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn red" onClick={clearAll} disabled={isRunning("clear-all")}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">
                <p>Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon"><PartyPopper size={48} color="#e5e7eb" /></div>
                <p>All caught up! No notifications.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.isRead ? "read" : "unread"}`}
                >
                  <div className={`notif-icon-wrap ${n.type}`}>
                    <span>{n.icon}</span>
                  </div>
                  <div className="notif-content" onClick={() => markRead(n.id)}>
                    <p className="notif-item-title">{n.title}</p>
                    <p className="notif-item-msg">{n.message}</p>
                    <p className="notif-item-time">{new Date(n.createdAt).toLocaleString("en-PH")}</p>
                  </div>
                  <button
                    className="notif-delete-btn"
                    onClick={() => deleteNotif(n.id)}
                    title="Delete"
                    disabled={isRunning(`delete-${n.id}`)}
                  >
                    <X size={16} />
                  </button>
                  {!n.isRead && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}