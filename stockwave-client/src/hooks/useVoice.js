// hooks/useVoice.js
import { useEffect, useRef, useState, useCallback } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice({ onCommand, enabled = true }) {
  const recogRef = useRef(null);
  const finalizedRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const supported = !!SpeechRecognition;

  const processCommand = useCallback((text) => {
    const cmd = text.toLowerCase().trim();
    if (!cmd) return;
    
    console.log("Processing voice command:", cmd);

    if (cmd.includes("export"))            onCommand("export_report");
    else if (cmd.includes("dashboard"))    onCommand("navigate", "dashboard");
    else if (cmd.includes("inventory"))    onCommand("navigate", "inventory");
    else if (cmd.includes("product"))      onCommand("add_product");
    else if (cmd.includes("report"))       onCommand("navigate", "reports");
    else if (cmd.includes("user"))         onCommand("navigate", "users");
    else if (cmd.includes("setting"))      onCommand("navigate", "settings");
    else if (cmd.includes("logout") || cmd.includes("log out")) onCommand("logout");
  }, [onCommand]);

  const stopListening = useCallback(() => {
    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!supported) return;
    if (listening) {
      stopListening();
      return;
    }

    setError(null);
    finalizedRef.current = false;

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.continuous = false;
    recog.interimResults = true;

    recog.onstart = () => {
      setListening(true);
      setTranscript("");
    };

    recog.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      const current = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(" ");
      
      setTranscript(current);

      if (result.isFinal && !finalizedRef.current) {
        finalizedRef.current = true;
        // Don't stop immediately to allow short pauses if needed, 
        // but since continuous is false, the browser usually stops anyway.
      }
    };

    recog.onend = () => {
      setListening(false);
      // Retrieve the latest transcript from the ref-like closure
      // We use a small delay to ensure the last state update is reflected
      setTimeout(() => {
        setTranscript(prev => {
          if (prev) processCommand(prev);
          return "";
        });
      }, 100);
    };

    recog.onerror = (e) => {
      console.error("Speech Recognition Error:", e.error);
      setError(e.error);
      setListening(false);
      setTranscript("");
      
      if (e.error === 'not-allowed') {
        alert("Microphone access was denied. Please enable it in your browser settings.");
      }
    };

    recogRef.current = recog;
    try {
      recog.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setListening(false);
    }
  }, [supported, listening, stopListening, processCommand]);

  useEffect(() => {
    return () => {
      if (recogRef.current) {
        recogRef.current.abort();
      }
    };
  }, []);

  return { listening, transcript, error, startListening, stopListening, supported };
}
