import React, { useEffect, useRef, useState } from "react";

const Report = () => {
  const videoRef = useRef(null);
  const [isInterviewComplete, setInterviewComplete] = useState(false);

  useEffect(() => {
    const getCameraStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Stop stream after 10 seconds for demo
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          setInterviewComplete(true);
        }, 10000);
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    getCameraStream();
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md flex flex-col items-center">
        {/* Camera Preview */}
        <div className="w-full aspect-square overflow-hidden rounded-md border border-gray-300">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Status Text Below Camera */}
        <div className="mt-4 text-center text-lg font-semibold text-gray-700">
          {isInterviewComplete ? "Interview Completed" : "Connecting..."}
        </div>
      </div>
    </div>
  );
};

export default Report;
