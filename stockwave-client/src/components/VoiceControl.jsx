import { useEffect, useState } from "react";
import { useVoice } from "../hooks/useVoice";
import "./VoiceControl.css";
import { Mic, MicOff } from "lucide-react";

export default function VoiceControl({ onCommand, startSignal = 0 }) {
  const [active, setActive] = useState(false);

  const { listening, transcript, startListening, stopListening, supported, error } =
    useVoice({ onCommand, enabled: active });

  if (!supported) return null;

  // Handle signal from GestureControl
  useEffect(() => {
    if (startSignal > 0 && !listening) {
      startListening();
      setActive(true);
    }
  }, [startSignal, listening, startListening]);

  // Sync internal active state with hook's listening state
  useEffect(() => {
    if (active && !listening && !transcript) {
      setActive(false);
    }
  }, [active, listening, transcript]);

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
        className={`voice-btn ${listening ? "active" : ""}`}
        onClick={toggle}
        title={listening ? "Stop voice control" : "Start voice control"}
      >
        {listening ? <Mic size={18} /> : <MicOff size={18} />}
        <span>{listening ? "Listening..." : "Voice"}</span>
      </button>

      {(listening || transcript) && (
        <div className="voice-panel">
          <div className="voice-visualizer">
            <div className="mic-icon-wrap">
              {listening && <div className="mic-pulse" />}
              <Mic size={24} color={listening ? "var(--primary)" : "#94a3b8"} />
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
              <li>"Logout"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
