import { useEffect, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export function useVoice({ onCommand, enabled = true }) {
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // Process transcript when it changes
  useEffect(() => {
    if (!transcript) return;
    const cmd = transcript.toLowerCase().trim();

    if (cmd.includes("go to dashboard") || cmd.includes("dashboard")) {
      onCommand("navigate", "dashboard");
    } else if (cmd.includes("go to inventory") || cmd.includes("inventory")) {
      onCommand("navigate", "inventory");
    } else if (cmd.includes("go to reports") || cmd.includes("reports")) {
      onCommand("navigate", "reports");
    } else if (cmd.includes("go to users") || cmd.includes("users")) {
      onCommand("navigate", "users");
    } else if (cmd.includes("go to settings") || cmd.includes("settings")) {
      onCommand("navigate", "settings");
    } else if (cmd.includes("add product") || cmd.includes("new product")) {
      onCommand("add_product");
    } else if (cmd.includes("logout") || cmd.includes("log out") || cmd.includes("sign out")) {
      onCommand("logout");
    }

    resetTranscript();
  }, [transcript]);

  const startListening = useCallback(() => {
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  }, []);

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  return {
    listening,
    transcript,
    startListening,
    stopListening,
    supported: browserSupportsSpeechRecognition,
  };
}