// hooks/useVoice.js
import { useEffect, useRef, useState, useCallback } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoice({ onCommand }) {
  const recogRef = useRef(null);
  const finalizedRef = useRef(false);
  const transcriptRef = useRef("");
  const commandDispatchedRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const supported = !!SpeechRecognition;

  const processCommand = useCallback((text) => {
    const cmd = text.toLowerCase().trim();
    if (!cmd) return;
    
    console.log("Processing voice command:", cmd);

    if (cmd.includes("voice off") || cmd.includes("stop voice")) onCommand("voice_off");
    else if (cmd.includes("gesture on") || cmd.includes("start gesture")) onCommand("gesture_on");
    else if (cmd.includes("export"))            onCommand("export_report");
    else if (cmd.includes("dashboard"))         onCommand("navigate", "dashboard");
    else if (cmd.includes("inventory"))         onCommand("navigate", "inventory");
    else if (cmd.includes("product"))           onCommand("add_product");
    else if (cmd.includes("report"))            onCommand("navigate", "reports");
    else if (cmd.includes("user"))              onCommand("navigate", "users");
    else if (cmd.includes("setting"))           onCommand("navigate", "settings");
    else if (cmd.includes("logout") || cmd.includes("log out")) onCommand("logout");
  }, [onCommand]);

  const stopListening = useCallback(() => {
    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch {
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
    commandDispatchedRef.current = false;
    transcriptRef.current = "";

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
      
      transcriptRef.current = current;
      setTranscript(current);

      if (result.isFinal && !finalizedRef.current) {
        finalizedRef.current = true;
        if (!commandDispatchedRef.current) {
          commandDispatchedRef.current = true;
          processCommand(current);
        }
      }
    };

    recog.onend = () => {
      setListening(false);
      const finalTranscript = transcriptRef.current;
      if (finalTranscript && !commandDispatchedRef.current) {
        commandDispatchedRef.current = true;
        processCommand(finalTranscript);
      }
      transcriptRef.current = "";
      setTranscript("");
    };

    recog.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setError(event.error);
      setListening(false);
      setTranscript("");
      
      if (event.error === 'not-allowed') {
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
