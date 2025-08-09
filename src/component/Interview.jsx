import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

const InterviewBot = () => {
  const [vapiInstance, setVapiInstance] = useState(null);
  const [status, setStatus] = useState("Ready to connect");
  const [isInterviewing, setIsInterviewing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const config = {
  assistantId: import.meta.env.VITE_ASSISTANT_ID,
  apiKey: import.meta.env.VITE_API_KEY,
  buttonConfig: {
    show: false,
  },
};

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    script.onload = () => {
      console.log("Vapi SDK loaded");
      startInterview(); // Auto-start
    };
    document.body.appendChild(script);

    return () => {
      if (vapiInstance) {
        vapiInstance.stop();
      }
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(() => {});
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startInterview = async () => {
    if (!window.vapiSDK) {
      setStatus("Failed to load interview SDK");
      return;
    }

    setStatus("Connecting...");
    setIsInterviewing(true);
    await startCamera();

    const instance = window.vapiSDK.run({
      apiKey: config.apiKey,
      assistant: config.assistantId,
      config: config.buttonConfig,
      onCallStart: (callData) => {
        if (callData?.id) {
          sessionStorage.setItem("callId", callData.id);
        }
      },
    });

    instance.on("call-start", () => setStatus("Interview in progress..."));

    instance.on("call-end", () => {
      setStatus("Interview completed");
      setIsInterviewing(false);
      setVapiInstance(null);
      stopCamera();
    });

    instance.on("error", (error) => {
      setStatus(`Error: ${error.message}`);
      setIsInterviewing(false);
      setVapiInstance(null);
      stopCamera();
    });

    setVapiInstance(instance);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1b1e23] to-[#2c2f36] text-[#DFD0B8] px-4 py-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-[#222831] border border-[#948979] rounded-xl shadow-xl p-8 max-w-4xl w-full grid md:grid-cols-2 gap-6"
      >
        <div className="flex flex-col justify-center text-center">
          <h1 className="text-3xl font-bold mb-4">NexAI Interview Bot</h1>
          <p className="text-sm mb-6">{status}</p>
        </div>

        <div className="w-[400px] h-[400px] bg-black flex items-center justify-center rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          ></video>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewBot;
