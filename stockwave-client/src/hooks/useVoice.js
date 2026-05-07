// hooks/useVoice.js
import { useEffect, useRef, useState, useCallback } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice({ onCommand, enabled = true }) {
  const recogRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const supported = !!SpeechRecognition;

  const processCommand = useCallback((text) => {
    const cmd = text.toLowerCase().trim();
    console.log("Final transcript:", cmd);

    if (cmd.includes("dashboard"))         onCommand("navigate", "dashboard");
    else if (cmd.includes("inventory"))    onCommand("navigate", "inventory");
    else if (cmd.includes("report"))       onCommand("navigate", "reports");
    else if (cmd.includes("user"))         onCommand("navigate", "users");
    else if (cmd.includes("setting"))      onCommand("navigate", "settings");
    else if (cmd.includes("add product") || cmd.includes("new product"))
                                           onCommand("add_product");
    else if (cmd.includes("logout") || cmd.includes("log out") || cmd.includes("sign out"))
                                           onCommand("logout");
  }, [onCommand]);

  const startListening = useCallback(() => {
    if (!supported) return;

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.continuous = false;    // one phrase at a time — cleanest approach
    recog.interimResults = true; // shows live transcript in the UI while speaking

    recog.onstart = () => setListening(true);

    recog.onresult = (e) => {
      const current = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(" ");
      setTranscript(current);
    };

    // onend fires ONCE with the full final phrase — no premature resets
    recog.onend = () => {
      setListening(false);
      setTranscript(prev => {
        if (prev) processCommand(prev);
        return "";
      });
    };

    recog.onerror = (e) => {
      console.error("Speech error:", e.error);
      setListening(false);
      setTranscript("");
    };

    recogRef.current = recog;
    recog.start();
  }, [supported, processCommand]);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => recogRef.current?.abort();
  }, []);

  return { listening, transcript, startListening, stopListening, supported };
}