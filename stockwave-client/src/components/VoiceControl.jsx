import { useEffect, useState } from "react";
import { useVoice } from "../hooks/useVoice";
import "./VoiceControl.css";

export default function VoiceControl({ onCommand, startSignal = 0 }) {
  const [active, setActive] = useState(false);

  const { listening, transcript, startListening, stopListening, supported } =
    useVoice({ onCommand, enabled: active });

  if (!supported) return null;

  useEffect(() => {
    if (startSignal > 0 && !listening) {
      startListening();
      setActive(true);
    }
  }, [startSignal, listening, startListening]);

  useEffect(() => {
    if (active && !listening) {
      setActive(false);
    }
  }, [active, listening]);

  const toggle = () => {
    if (listening) {
      stopListening();
      setActive(false);
    } else {
      startListening();
      setActive(true);
    }
  };

  return (
    <div className="voice-wrap">
      <button
        className={`voice-btn ${listening ? "listening" : ""}`}
        onClick={toggle}
        title={listening ? "Stop voice control" : "Start voice control"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3"
            fill={listening ? "white" : "currentColor"}/>
          <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6"
            stroke={listening ? "white" : "currentColor"}
            strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {listening ? "Listening..." : "Voice"}
      </button>

      {listening && (
        <div className="voice-status">
          <span className="voice-dot" />
          <span className="voice-transcript">
            {transcript || "Say a command..."}
          </span>
        </div>
      )}

      {listening && (
        <div className="voice-commands-hint">
          <p>Try saying:</p>
          <ul>
            <li>"Go to inventory"</li>
            <li>"Go to dashboard"</li>
            <li>"Go to reports"</li>
            <li>"Add product"</li>
            <li>"Logout"</li>
          </ul>
        </div>
      )}
    </div>
  );
}