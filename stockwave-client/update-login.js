const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/Login.jsx');
let content = fs.readFileSync(file, 'utf8');

// Find and replace the useEffect hook
const searchPattern = /const BarcodeDetectorAPI = window\.BarcodeDetector;[\s\S]*?}, \[qrActive, handleQrLogin, stopQrScan\]\);/;

const replacement = `if (!navigator.mediaDevices?.getUserMedia) {
      setQrError("Camera access is not available on this device.");
      setQrActive(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        setQrError("");
        
        // Load jsQR library from CDN if not already loaded
        if (!window.jsQR) {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
          script.async = true;
          script.onload = () => {
            if (!cancelled) {
              startCamera();
            }
          };
          script.onerror = () => {
            setQrError("Failed to load QR scanner library.");
            setQrActive(false);
          };
          document.head.appendChild(script);
        } else {
          startCamera();
        }

        const startCamera = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
            });
            if (cancelled) {
              stream.getTracks().forEach((track) => track.stop());
              return;
            }
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
            }

            // Create canvas for QR detection
            const canvas = document.createElement("canvas");
            const canvasContext = canvas.getContext("2d");

            const scanFrame = () => {
              if (cancelled || !videoRef.current) return;
              try {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvasContext.drawImage(videoRef.current, 0, 0);
                const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
                const code = window.jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                  stopQrScan();
                  setQrActive(false);
                  if (code.data) handleQrLogin(code.data);
                  else setQrError("QR code is empty.");
                  return;
                }
              } catch (err) {
                console.error("QR scan error:", err);
              }
              rafRef.current = requestAnimationFrame(scanFrame);
            };

            rafRef.current = requestAnimationFrame(scanFrame);
          } catch (err) {
            stopQrScan();
            setQrActive(false);
            setQrError("Camera access was blocked. Allow access and try again.");
          }
        };
      } catch (err) {
        stopQrScan();
        setQrActive(false);
        setQrError("Failed to start camera.");
      }
    };

    start();

    return () => {
      cancelled = true;
      stopQrScan();
    };
  }, [qrActive, handleQrLogin, stopQrScan]);`;

if (searchPattern.test(content)) {
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ Updated Login.jsx with jsQR library support');
} else {
  console.error('✗ Could not find useEffect pattern in Login.jsx');
  process.exit(1);
}
