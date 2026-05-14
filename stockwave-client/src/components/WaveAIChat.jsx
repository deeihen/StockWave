import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, Minus, MessageSquare, Trash2 } from "lucide-react";
import { askWaveAI, resetChat, MAX_INPUT_CHARS } from "../api/geminiApi";
import "./WaveAIChat.css";

const STORAGE_KEY = "waveai_chat_history";
const WELCOME = {
  role: "ai",
  text: "Hi! I'm WaveAI — your inventory ops assistant. Ask me about stock levels, restocking, sales trends, or anything warehouse-related.",
  time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
};

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

function saveHistory(msgs) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {}
}

export default function WaveAIChat() {
  const [open, setOpen]       = useState(false);
  const [minimized, setMin]   = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  // Persist history to sessionStorage on every change
  useEffect(() => { saveHistory(messages); }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [open, minimized]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading || q.length > MAX_INPUT_CHARS) return;
    setInput("");

    const userMsg = {
      role: "user",
      text: q,
      time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await askWaveAI(q);
      const aiMsg = {
        role: "ai",
        text: reply,
        time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, aiMsg]);
      if (!open || minimized) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: "ai",
        text: "Sorry, I couldn't reach WaveAI right now. Please try again.",
        time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    resetChat();
    setMessages([WELCOME]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleOpen = () => {
    setOpen(true);
    setMin(false);
    setUnread(0);
  };

  // ── Collapsed bubble ──────────────────────────────
  if (!open) {
    return (
      <button className="waveai-bubble" onClick={handleOpen} title="Ask WaveAI">
        <Sparkles size={20} />
        {unread > 0 && <span className="waveai-badge">{unread}</span>}
      </button>
    );
  }

  // ── Chat window ───────────────────────────────────
  return (
    <div className={`waveai-window ${minimized ? "minimized" : ""}`}>
      {/* Header */}
      <div className="waveai-header">
        <div className="waveai-header-left">
          <div className="waveai-avatar"><Sparkles size={14} /></div>
          <div>
            <p className="waveai-name">WaveAI</p>
            <p className="waveai-status">
              <span className="waveai-dot" /> Inventory Assistant
            </p>
          </div>
        </div>
        <div className="waveai-header-actions">
          <button onClick={clearHistory} title="Clear history"><Trash2 size={13} /></button>
          <button onClick={() => setMin(v => !v)} title={minimized ? "Expand" : "Minimize"}>
            <Minus size={13} />
          </button>
          <button onClick={() => setOpen(false)} title="Close"><X size={13} /></button>
        </div>
      </div>

      {/* Messages */}
      {!minimized && (
        <>
          <div className="waveai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`waveai-msg-row ${m.role === "user" ? "user" : "ai"}`}>
                {m.role === "ai" && (
                  <div className="waveai-msg-avatar"><Sparkles size={11} /></div>
                )}
                <div className="waveai-msg-bubble">
                  <p>{m.text}</p>
                  <span className="waveai-msg-time">{m.time}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="waveai-msg-row ai">
                <div className="waveai-msg-avatar"><Sparkles size={11} /></div>
                <div className="waveai-msg-bubble typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="waveai-input-row">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask about inventory, stock, ops…"
              disabled={loading}
              maxLength={MAX_INPUT_CHARS}
            />
            <button onClick={send} disabled={loading || !input.trim() || input.trim().length > MAX_INPUT_CHARS}>
              <Send size={14} />
            </button>
          </div>
          <div className="waveai-input-meta">
            <span className={input.length > MAX_INPUT_CHARS * 0.9 ? "warn" : ""}>
              {input.length}/{MAX_INPUT_CHARS}
            </span>
          </div>
        </>
      )}
    </div>
  );
}