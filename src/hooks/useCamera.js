// src/hooks/useCamera.js
import { useEffect } from 'react';

export const useCamera = (videoRef) => {
  useEffect(() => {
    let stream;

    const startCamera = async () => {
      try {
        // Request video only (no audio unless you need it)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // Required for autoplay
          videoRef.current.playsInline = true; // iOS Safari fix

          // Try to play the video
          await videoRef.current.play().catch((err) => {
            console.warn("Autoplay blocked, waiting for user interaction:", err);
          });
        }
      } catch (err) {
        console.error("Camera error:", err);
        // Better error message handling
        alert("Unable to access the camera. Please check your browser permissions.");
      }
    };

    // Check HTTPS (required for getUserMedia)
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      startCamera();
    } else {
      console.warn("Camera access requires HTTPS or localhost.");
    }

    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);
};
