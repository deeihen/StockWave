import { useState, useCallback } from "react";
import { useGesture } from "../hooks/useGesture";
import "./GestureControl.css";

const GESTURE_LABELS = {
  open_palm: { emoji: "✋", label: "Open Palm", action: "Navigate" },
  fist:      { emoji: "✊", label: "Fist",      action: "Cancel" },
  point_up:  { emoji: "☝️", label: "Point Up",  action: "Previous" },
  peace:     { emoji: "✌️", label: "Peace",     action: "Next Page" },
  thumbs_up: { emoji: "👍", label: "Thumbs Up", action: "Confirm" },
};

export default function GestureControl({ onGesture }) {
  const [active, setActive] = useState(false);
  const [lastGesture, setLastGesture] = useState(null);

  const handleGesture = useCallback((gesture) => {
    setLastGesture(gesture);
    onGesture(gesture);
    setTimeout(() => setLastGesture(null), 1500);
  }, [onGesture]);

  const { videoRef, cameraError } = useGesture({
    onGesture: handleGesture,
    enabled: active,
  });

  return (
    <div className="gesture-wrap">
      <button
        className={`gesture-btn ${active ? "active" : ""}`}
        onClick={() => setActive(v => !v)}
        title={active ? "Stop gesture control" : "Start gesture control"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 10.5V6a2 2 0 00-4 0v8l-1.5-1.5a1.5 1.5 0 00-2 2.2l3.6 3.8A6 6 0 0010 22h4a6 6 0 006-6v-5a2 2 0 00-4 0v0"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {active ? "Gesture On" : "Gesture"}
      </button>

      {active && (
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
                <span className="gesture-emoji">{GESTURE_LABELS[lastGesture]?.emoji}</span>
                <span className="gesture-detected-label">{GESTURE_LABELS[lastGesture]?.label}</span>
              </div>
            )}
          </div>

          {/* Commands guide */}
          <div className="gesture-guide">
            <p className="gesture-guide-title">Gestures</p>
            {Object.entries(GESTURE_LABELS).map(([key, val]) => (
              <div key={key} className="gesture-guide-item">
                <span className="gesture-guide-emoji">{val.emoji}</span>
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