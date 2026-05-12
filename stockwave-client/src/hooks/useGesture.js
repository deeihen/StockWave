import { useEffect, useRef, useCallback, useState } from "react";

const GESTURE_COOLDOWN = 800; // ms between gestures
const GESTURE_REPEAT_MS = 1500; // allow same gesture repeat if held
const FRAMES_REQUIRED = 4; // consecutive frames required before firing

export function useGesture({ onGesture, enabled = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastGestureTime = useRef(0);
  const lastGestureRef = useRef(null);
  const pendingGesture = useRef(null);
  const gestureFrameCount = useRef(0);
  const [cameraError, setCameraError] = useState(null);

  const detectGesture = useCallback((landmarks) => {
    const fireGesture = (name) => {
      const now = Date.now();
      if (now - lastGestureTime.current < GESTURE_COOLDOWN) return;
      if (lastGestureRef.current === name && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;

      if (pendingGesture.current !== name) {
        pendingGesture.current = name;
        gestureFrameCount.current = 1;
        return;
      }

      gestureFrameCount.current += 1;
      if (gestureFrameCount.current < FRAMES_REQUIRED) return;

      lastGestureTime.current = now;
      lastGestureRef.current = name;
      pendingGesture.current = null;
      gestureFrameCount.current = 0;
      onGesture(name);
    };

    // Finger tips and base indices
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexBase = landmarks[6];
    const middleBase = landmarks[10];
    const ringBase = landmarks[14];
    const pinkyBase = landmarks[18];

    // Is finger up? tip higher than base (lower y value)
    const indexUp = indexTip.y < indexBase.y;
    const middleUp = middleTip.y < middleBase.y;
    const ringUp = ringTip.y < ringBase.y;
    const pinkyUp = pinkyTip.y < pinkyBase.y;

    // Geometric extension/curl checks are orientation-agnostic.
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const thumbMcp = landmarks[2];

    const palmSize = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);
    const thumbLength = Math.hypot(thumbTip.x - thumbMcp.x, thumbTip.y - thumbMcp.y);
    const thumbExtended = thumbLength > palmSize * 0.4;

    const isFingerCurled = (tip, pip) => {
      const tipToWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const pipToWrist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      return tipToWrist < pipToWrist;
    };

    const indexCurled = isFingerCurled(indexTip, indexBase);
    const middleCurled = isFingerCurled(middleTip, middleBase);
    const ringCurled = isFingerCurled(ringTip, ringBase);
    const pinkyCurled = isFingerCurled(pinkyTip, pinkyBase);

    // ── OPEN PALM (all 4 fingers up) → Confirm / Navigate
    if (indexUp && middleUp && ringUp && pinkyUp) {
      fireGesture("open_palm");
      return;
    }

    // ── THREE FINGERS (index+middle+ring) → Start Voice
    if (indexUp && middleUp && ringUp && !pinkyUp) {
      fireGesture("voice_start");
      return;
    }

    // ── PINKY UP (only pinky) → Stop Camera
    if (!indexUp && !middleUp && !ringUp && pinkyUp) {
      fireGesture("stop_camera");
      return;
    }

    // ── THUMBS UP → Confirm / Add
    if (thumbExtended && indexCurled && middleCurled && ringCurled && pinkyCurled) {
      fireGesture("thumbs_up");
      return;
    }

    // ── FIST (all fingers down) → Cancel
    if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
      fireGesture("fist");
      return;
    }

    // ── POINT UP (only index up) → Scroll up / Previous
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      fireGesture("point_up");
      return;
    }

    // ── PEACE / V SIGN (index + middle up) → Next page
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      fireGesture("peace");
      return;
    }

    // Reset pending confirmation when no known gesture is matched.
    pendingGesture.current = null;
    gestureFrameCount.current = 0;
  }, [onGesture]);

  useEffect(() => {
    if (!enabled) {
      cameraRef.current?.stop();
      return;
    }

    let active = true;

    const loadHands = async () => {
      try {
        setCameraError(null);
        // Load Mediapipe via CDN since npm packages don't export as proper ES modules.
        // The libraries attach to window.Hands and window.Camera.
        const loadScript = (src) =>
          new Promise((resolve, reject) => {
            if (window[src.includes("hands") ? "Hands" : "Camera"]) {
              resolve(); // Already loaded
              return;
            }
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });

        // Load Mediapipe Hands and Camera from CDN
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js"
        );

        const Hands = window.Hands;
        const Camera = window.Camera;

        if (typeof Hands !== "function") {
          throw new Error(`Hands not found on window; got ${typeof Hands}`);
        }
        if (typeof Camera !== "function") {
          throw new Error(`Camera not found on window; got ${typeof Camera}`);
        }

        if (!active) return;

        // Request camera permissions explicitly
        try {
          // Request camera permissions explicitly but don't hold the stream.
          // Some browsers lock the camera if a stream is opened and not stopped,
          // preventing Mediapipe's Camera from starting. Acquire the stream
          // then immediately stop tracks to only prompt permissions.
          const tmpStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
          });
          tmpStream.getTracks().forEach((t) => t.stop());
        } catch (permErr) {
          if (permErr.name === "NotAllowedError") {
            setCameraError("Camera permission denied. Please enable camera access in your browser settings.");
          } else if (permErr.name === "NotFoundError") {
            setCameraError("No camera found on this device.");
          } else {
            setCameraError(`Camera error: ${permErr.message}`);
          }
          console.error("Camera permission error:", permErr);
          return;
        }

        // Ensure the video element is attached to the ref before creating Camera.
        // React may not have attached the ref by the time this runs, so poll briefly.
        const waitForVideo = (timeout = 2000) =>
          new Promise((resolve) => {
            const interval = 50;
            let waited = 0;
            const id = setInterval(() => {
              if (!active) {
                clearInterval(id);
                resolve(false);
                return;
              }
              if (videoRef.current) {
                clearInterval(id);
                resolve(true);
                return;
              }
              waited += interval;
              if (waited >= timeout) {
                clearInterval(id);
                resolve(false);
              }
            }, interval);
          });

        if (!active) return;
        const videoReady = videoRef.current || (await waitForVideo(2000));
        if (!videoReady) {
          setCameraError("Video element not ready. Try opening the gesture panel again.");
          return;
        }

        const hands = new Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          if (!active) return;
          if (results.multiHandLandmarks?.length > 0) {
            detectGesture(results.multiHandLandmarks[0]);
          } else {
            pendingGesture.current = null;
            gestureFrameCount.current = 0;
            // Do not reset lastGestureRef here. Keeping the last gesture
            // allows the repeat guard to suppress re-entry across brief
            // no-detection frames (e.g. quick open/close where a frame
            // might be missed). lastGestureTime still governs timing.
          }
        });

        handsRef.current = hands;

        if (videoRef.current && active) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current && active) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240,
          });
          
          try {
            await camera.start();
            cameraRef.current = camera;
          } catch (cameraStartErr) {
            setCameraError("Failed to start camera. Please try again.");
            console.error("Camera start failed:", cameraStartErr);
          }
        }
      } catch (err) {
        console.error("Gesture init failed:", err);
        setCameraError(`Failed to initialize gesture control: ${err?.message ?? err}`);
      }
    };

    loadHands();

    return () => {
      active = false;
      cameraRef.current?.stop();
      handsRef.current?.close();
    };
  }, [enabled, detectGesture]);

  return { videoRef, canvasRef, cameraError };
}