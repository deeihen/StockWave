import { useEffect, useRef, useCallback } from "react";

const GESTURE_COOLDOWN = 1500; // ms between gestures

export function useGesture({ onGesture, enabled = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastGestureTime = useRef(0);

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
    const wrist = landmarks[0];

    // Is finger up? tip higher than base (lower y value)
    const indexUp = indexTip.y < indexBase.y;
    const middleUp = middleTip.y < middleBase.y;
    const ringUp = ringTip.y < ringBase.y;
    const pinkyUp = pinkyTip.y < pinkyBase.y;

    // Thumb extended to the side
    const thumbUp = thumbTip.x < landmarks[3].x;

    // ── OPEN PALM (all 4 fingers up) → Confirm / Navigate
    if (indexUp && middleUp && ringUp && pinkyUp) {
      lastGestureTime.current = now;
      onGesture("open_palm");
      return;
    }

    // ── FIST (all fingers down) → Cancel
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
      lastGestureTime.current = now;
      onGesture("fist");
      return;
    }

    // ── POINT UP (only index up) → Scroll up / Previous
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      lastGestureTime.current = now;
      onGesture("point_up");
      return;
    }

    // ── PEACE / V SIGN (index + middle up) → Next page
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      lastGestureTime.current = now;
      onGesture("peace");
      return;
    }

    // ── THUMBS UP → Confirm / Add
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
      lastGestureTime.current = now;
      onGesture("thumbs_up");
      return;
    }
  }, [onGesture]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const loadHands = async () => {
      try {
        const { Hands } = await import("@mediapipe/hands");
        const { Camera } = await import("@mediapipe/camera_utils");

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
          }
        });

        handsRef.current = hands;

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraRef.current = camera;
        }
      } catch (err) {
        console.error("Gesture init failed:", err);
      }
    };

    loadHands();

    return () => {
      active = false;
      cameraRef.current?.stop();
      handsRef.current?.close();
    };
  }, [enabled, detectGesture]);

  return { videoRef, canvasRef };
}