import { useState, useCallback } from "react";
import { useGesture } from "../hooks/useGesture";
import "./GestureControl.css";
import { Hand, ThumbsUp, Mic, CameraOff } from "lucide-react";

const GESTURE_LABELS = {
  open_palm: { icon: Hand, label: "Open Palm",  action: "Dashboard" },
  peace:     { icon: Hand, label: "Peace Sign", action: "Inventory" },
  point_up:  { icon: Hand, label: "Point Up",   action: "Reports"   },
  thumbs_up: { icon: ThumbsUp, label: "Thumbs Up",  action: "Users"     },
  fist:      { icon: Hand, label: "Fist",        action: "Settings"  },
  voice_start: { icon: Mic, label: "3 Fingers", action: "Voice On" },
  stop_camera: { icon: CameraOff, label: "Pinky Up", action: "Stop Camera" },
};

export default function GestureControl({ onGesture }) {
  const [active, setActive]       = useState(false);
  const [lastGesture, setLastGesture] = useState(null);

  const handleGesture = useCallback((gesture) => {
    setLastGesture(gesture);
    onGesture(gesture);
    if (gesture === "stop_camera") {
      setActive(false);
    }
    setTimeout(() => setLastGesture(null), 1500);
  }, [onGesture]);

  const { videoRef, cameraError } = useGesture({
    onGesture: handleGesture,
    enabled: active,
  });

  const toggle = () => {
    setLastGesture(null);
    setActive(v => !v);
  };

  return (
    <div className="gesture-wrap">
      {/* ── Trigger button ── */}
      <button
        className={`gesture-btn ${active ? "active" : ""}`}
        onClick={toggle}
        title={active ? "Stop gesture control" : "Start gesture control"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 10.5V6a2 2 0 00-4 0v8l-1.5-1.5a1.5 1.5 0 00-2 2.2l3.6 3.8A6 6 0 0010 22h4a6 6 0 006-6v-5a2 2 0 00-4 0v0"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        {active ? "Gesture On" : "Gesture"}
      </button>

      {/* ── Panel ── */}
      {(active || lastGesture) && (
        <div className="gesture-panel">
          {cameraError && (
            <div className="gesture-error">
              <p>{cameraError}</p>
            </div>
          )}
          {/* Webcam preview */}
          <div className="gesture-video-wrap">
            <video
              ref={videoRef}
              className="gesture-video"
              autoPlay
              playsInline
              muted
            />
            {lastGesture && (
              <div className="gesture-detected">
                {(() => {
                  const Icon = GESTURE_LABELS[lastGesture]?.icon;
                  return Icon ? <Icon size={24} /> : null;
                })()}
                <span>{GESTURE_LABELS[lastGesture]?.label}</span>
              </div>
            )}
          </div>

          {/* Error */}
          {cameraError && (
            <div className="gesture-error">{cameraError}</div>
          )}

          {/* Start / Stop + status */}
          <div className="gesture-actions">
            <button className="gesture-toggle-btn" onClick={toggle}>
              {active ? "Stop gesture" : "Start gesture"}
            </button>
            {active && <span className="gesture-status">Detecting...</span>}
          </div>

          {/* Guide */}
          <div className="gesture-guide">
            <p className="gesture-guide-title">Gestures</p>
            {Object.entries(GESTURE_LABELS).map(([key, val]) => (
              <div key={key} className="gesture-guide-item">
                <span className="gesture-guide-emoji"><val.icon size={18} /></span>
                <div>
                  <p className="gesture-guide-name">{val.label}</p>
                  <p className="gesture-guide-action">{val.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
