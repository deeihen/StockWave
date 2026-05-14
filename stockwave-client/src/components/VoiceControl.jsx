import { useEffect } from "react";
import { useVoice } from "../hooks/useVoice";
import "./VoiceControl.css";
import { Mic, MicOff } from "lucide-react";

export default function VoiceControl({ onCommand, active = false, onToggle, panelOffset = "default" }) {
  const { listening, transcript, startListening, stopListening, supported, error } =
    useVoice({ onCommand });

  useEffect(() => {
    if (!supported) return;
    if (active && !listening) {
      startListening();
    } else if (!active && listening) {
      stopListening();
    }
  }, [active, listening, startListening, stopListening, supported]);

  if (!supported) return null;

  const toggle = () => {
    onToggle?.(!active);
  };

  return (
    <div className="voice-wrap">
      <button
        className={`voice-btn ${listening ? "active" : ""}`}
        onClick={toggle}
        title={listening ? "Stop voice control" : "Start voice control"}
      >
        {listening ? <Mic size={18} /> : <MicOff size={18} />}
        <span>{listening ? "Listening..." : "Voice"}</span>
      </button>

      {(listening || transcript) && (
        <div className={`voice-panel ${panelOffset === "left" ? "offset-left" : ""}`}>
          <div className="voice-visualizer">
            <div className="mic-icon-wrap">
              {listening && <div className="mic-pulse" />}
              <Mic size={24} color={listening ? "var(--primary)" : "#94a3b8"} />
            </div>
            <div className={`voice-wave ${listening ? "active" : ""}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <span className="listening-text">
              {listening ? "Listening" : "Processing..."}
            </span>
          </div>

          <div className="transcript-area">
            {transcript ? (
              <p className="transcript-text">{transcript}</p>
            ) : (
              <p className="transcript-placeholder">Waiting for your command...</p>
            )}
            {error && <p className="voice-error">Error: {error}</p>}
          </div>

          <div className="voice-guide">
            <p className="voice-guide-title">Supported Commands</p>
            <ul>
              <li>"Go to inventory"</li>
              <li>"Go to dashboard"</li>
              <li>"Add product"</li>
              <li>"Voice off"</li>
              <li>"Gesture on"</li>
              <li>"Gesture off"</li>
              <li>"Logout"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
