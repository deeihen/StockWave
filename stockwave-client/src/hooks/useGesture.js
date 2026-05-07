import { useEffect, useRef, useCallback, useState } from "react";

const GESTURE_COOLDOWN = 500; // ms between gestures
const GESTURE_REPEAT_MS = 1200; // allow same gesture repeat if held

export function useGesture({ onGesture, enabled = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastGestureTime = useRef(0);
  const lastGestureRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);

  const detectGesture = useCallback((landmarks) => {
    const now = Date.now();
    if (now - lastGestureTime.current < GESTURE_COOLDOWN) return;

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

    // Thumb extended to the side
    const thumbUp = thumbTip.x < landmarks[3].x;

    // ── OPEN PALM (all 4 fingers up) → Confirm / Navigate
    if (indexUp && middleUp && ringUp && pinkyUp) {
      if (lastGestureRef.current === "open_palm" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "open_palm";
      onGesture("open_palm");
      return;
    }

    // ── THREE FINGERS (index+middle+ring) → Start Voice
    if (indexUp && middleUp && ringUp && !pinkyUp) {
      if (lastGestureRef.current === "voice_start" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "voice_start";
      onGesture("voice_start");
      return;
    }

    // ── PINKY UP (only pinky) → Stop Camera
    if (!indexUp && !middleUp && !ringUp && pinkyUp) {
      if (lastGestureRef.current === "stop_camera" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "stop_camera";
      onGesture("stop_camera");
      return;
    }

    // ── FIST (all fingers down) → Cancel
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
      if (lastGestureRef.current === "fist" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "fist";
      onGesture("fist");
      return;
    }

    // ── POINT UP (only index up) → Scroll up / Previous
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      if (lastGestureRef.current === "point_up" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "point_up";
      onGesture("point_up");
      return;
    }

    // ── PEACE / V SIGN (index + middle up) → Next page
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      if (lastGestureRef.current === "peace" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "peace";
      onGesture("peace");
      return;
    }

    // ── THUMBS UP → Confirm / Add
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
      if (lastGestureRef.current === "thumbs_up" && now - lastGestureTime.current < GESTURE_REPEAT_MS) return;
      lastGestureTime.current = now;
      lastGestureRef.current = "thumbs_up";
      onGesture("thumbs_up");
      return;
    }
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
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862"
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
            lastGestureRef.current = null;
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