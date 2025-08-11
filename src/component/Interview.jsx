import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import botImage from "../assets/botImage.png"; // adjust if needed

const InterviewBot = () => {
  const [vapiInstance, setVapiInstance] = useState(null);
  const [status, setStatus] = useState(""); // only show "Interview in progress..." / "Interview completed"
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);

  // Assistant transcript
  const [assistantLive, setAssistantLive] = useState("");
  const [assistantHistory, setAssistantHistory] = useState([]);

  // Candidate transcript
  const [candidateLive, setCandidateLive] = useState("");
  const [candidateHistory, setCandidateHistory] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptRef = useRef(null); // auto-scroll container
  const wsRef = useRef(null);         // monitor websocket fallback

  const config = {
    assistantId: import.meta.env.VITE_ASSISTANT_ID,
    apiKey: import.meta.env.VITE_API_KEY,
    buttonConfig: {
      position: "bottom-right",
      offset: "24px",
      width: "180px",
      height: "48px",
      idle: { color: "#00adb5", textColor: "#ffffff", type: "pill", title: "Start Interview", subtitle: "", icon: "" },
      loading:{ color: "#00adb5", textColor: "#ffffff", type: "pill", title: "Connecting...", subtitle: "", icon: "" },
      active: { color: "#dc2626", textColor: "#ffffff", type: "pill", title: "End Interview", subtitle: "", icon: "" },
      transitionDuration: 0,
    },
  };

  // Auto-scroll transcript box
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [assistantLive, assistantHistory, candidateLive, candidateHistory]);

  // Helpers
  const pickText = (msg) => {
    if (!msg) return "";
    if (typeof msg.transcript === "string") return msg.transcript; // your SDK primary field
    if (typeof msg.delta === "string") return msg.delta;           // some builds stream deltas
    if (typeof msg.text === "string") return msg.text;
    if (typeof msg.output === "string") return msg.output;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content.map((c) => (typeof c === "string" ? c : c?.text || c?.value || "")).join(" ").trim();
    }
    if (msg?.data?.text) return msg.data.text;
    return "";
  };
  const isPartial = (t) => ["partial", "interim", "temp", "temporary"].includes(String(t || "").toLowerCase());
  const isFinal   = (t) => ["final", "finalized", "complete", "completed"].includes(String(t || "").toLowerCase());
  const isAssistantRole = (role) => ["assistant", "ai", "bot"].includes(String(role || "").toLowerCase());
  const isUserRole = (role) => ["user", "human", "caller", "customer", "client", "candidate"].includes(String(role || "").toLowerCase());

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    script.onload = () => {
      // Center the Vapi button & hide icon (UI-only)
      const style = document.createElement("style");
      style.textContent = `
        .vapi-btn-container { left:50%!important; right:auto!important; transform:translateX(-50%)!important; bottom:24px!important; z-index:2147483647!important; }
        .vapi-btn img, .vapi-btn svg { display:none!important; }
      `;
      document.head.appendChild(style);

      startInterview(); // keep auto-start
    };
    document.body.appendChild(script);

    return () => {
      if (vapiInstance) vapiInstance.stop();
      wsRef.current?.close();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startInterview = async () => {
    if (!window.vapiSDK) {
      setStatus("Failed to load interview SDK");
      return;
    }

    setIsInterviewing(true);
    await startCamera();

    const instance = window.vapiSDK.run({
      apiKey: config.apiKey,
      assistant: config.assistantId,
      config: config.buttonConfig,
      onCallStart: (callData) => {
        if (callData?.id) sessionStorage.setItem("callId", callData.id);
        if (callData?.monitor?.listenUrl) sessionStorage.setItem("listenUrl", callData.monitor.listenUrl);
        instance.setState("active"); // instant End Interview
      },
    });

    // Debug logs (handy while verifying roles)
    const dbg = (name, ...args) => console.log(`[vapi:${name}]`, ...args);
    ["message","assistant-speech-start","assistant-speech-end","call-start","call-end","error"]
      .forEach((evt) => instance.on?.(evt, (...a) => dbg(evt, ...a)));

    // Bot animation
    instance.on?.("assistant-speech-start", () => setIsBotSpeaking(true));
    instance.on?.("assistant-speech-end", () => setIsBotSpeaking(false));

    // -------- MAIN: client events (both roles) --------
    instance.on?.("message", (raw) => {
      if (!raw) return;
      const role = String(raw.role || "").toLowerCase();

      // Normalized text
      const text = pickText(raw);
      const ttype = raw.transcriptType; // "partial" | "final" (for type="transcript")

      // ASSISTANT stream
      if (isAssistantRole(role)) {
        if (raw.type === "transcript") {
          if (isPartial(ttype)) setAssistantLive(text || "");
          else if (isFinal(ttype) && text) {
            setAssistantHistory((prev) => [...prev, text]);
            setAssistantLive("");
          }
          return;
        }
        // Fallbacks
        if (raw.type === "speech-update") {
          if (text) setAssistantLive(text);
          return;
        }
        if (raw.type === "model-output") {
          if (text) {
            setAssistantHistory((prev) => [...prev, text]);
            setAssistantLive("");
          }
          return;
        }
        if (!raw.type && text) {
          setAssistantHistory((prev) => [...prev, text]);
          setAssistantLive("");
        }
        return;
      }

      // CANDIDATE (user) stream
      if (isUserRole(role)) {
        if (raw.type === "transcript") {
          if (isPartial(ttype)) setCandidateLive(text || "");
          else if (isFinal(ttype) && text) {
            setCandidateHistory((prev) => [...prev, text]);
            setCandidateLive("");
          }
          return;
        }
        // Fallbacks
        if (raw.type === "speech-update") {
          if (text) setCandidateLive(text);
          return;
        }
        if (raw.type === "model-output") {
          if (text) {
            setCandidateHistory((prev) => [...prev, text]);
            setCandidateLive("");
          }
          return;
        }
        if (!raw.type && text) {
          setCandidateHistory((prev) => [...prev, text]);
          setCandidateLive("");
        }
      }
    });

    // Optional fallback: monitor WebSocket (server stream)
    instance.on("call-start", () => {
      setStatus("Interview in progress...");
      const url = sessionStorage.getItem("listenUrl");
      if (!url) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => console.log("[vapi:monitor] open");
        ws.onerror = (e) => console.warn("[vapi:monitor] error", e);
        ws.onclose = () => console.log("[vapi:monitor] close");
        ws.onmessage = (e) => {
          const evt = JSON.parse(e.data || "{}");
          const role = String(evt?.role || "").toLowerCase();
          const text = pickText(evt);
          const ttype = evt?.transcriptType;

          if (isAssistantRole(role)) {
            if (evt?.type === "transcript") {
              if (isPartial(ttype)) setAssistantLive(text || "");
              else if (isFinal(ttype) && text) {
                setAssistantHistory((p) => [...p, text]);
                setAssistantLive("");
              }
              return;
            }
            if (evt?.type === "speech-update") {
              if (text) setAssistantLive(text);
              return;
            }
            if (evt?.type === "model-output") {
              if (text) {
                setAssistantHistory((p) => [...p, text]);
                setAssistantLive("");
              }
            }
            return;
          }

          if (isUserRole(role)) {
            if (evt?.type === "transcript") {
              if (isPartial(ttype)) setCandidateLive(text || "");
              else if (isFinal(ttype) && text) {
                setCandidateHistory((p) => [...p, text]);
                setCandidateLive("");
              }
              return;
            }
            if (evt?.type === "speech-update") {
              if (text) setCandidateLive(text);
              return;
            }
            if (evt?.type === "model-output") {
              if (text) {
                setCandidateHistory((p) => [...p, text]);
                setCandidateLive("");
              }
              return;
            }
            if (!evt?.type && text) {
              setCandidateHistory((p) => [...p, text]);
              setCandidateLive("");
            }
          }
        };
      } catch (err) {
        console.warn("Monitor WebSocket failed:", err);
      }
    });

    instance.on("call-end", () => {
      setStatus("Interview completed");
      setIsInterviewing(false);
      setIsBotSpeaking(false);
      setAssistantLive("");
      setCandidateLive("");
      wsRef.current?.close();
      wsRef.current = null;
      setVapiInstance(null);
      stopCamera();
    });

    instance.on("error", (error) => {
      setStatus(`Error: ${error.message}`);
      setIsInterviewing(false);
      setIsBotSpeaking(false);
      setAssistantLive("");
      setCandidateLive("");
      wsRef.current?.close();
      wsRef.current = null;
      setVapiInstance(null);
      stopCamera();
    });

    setVapiInstance(instance);
  };

  return (
    <div className="min-h-screen bg-white text-[#0f172a] px-4 py-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-6xl bg-white border-[3px] border-[#00adb5]/40 rounded-3xl shadow-sm"
      >
        {/* 45/55 split */}
        <div className="grid grid-cols-1 md:grid-cols-[45%_55%]">
          {/* LEFT: Title + Bot + Status + Transcripts (Assistant + Candidate) */}
          <div className="p-8 md:p-10 bg-white rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none
                          border-b md:border-b-0 md:border-r border-[#00adb5]/20">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 md:mb-6">
              <span className="text-[#00adb5]">NEX AI</span>{" "}
              <span className="text-[#0f172a]">Interview Bot</span>
            </h1>

            <div className="grid place-items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  className="rounded-full p-4"
                  style={{ border: "4px solid #00adb5" }}
                  animate={
                    isBotSpeaking
                      ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(0,173,181,0.3)", "0 0 0 16px rgba(0,173,181,0)", "0 0 0 0 rgba(0,173,181,0)"] }
                      : { scale: 1, boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
                  }
                  transition={isBotSpeaking ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                >
                  <img src={botImage} alt="Interview Bot" className="w-40 h-40 md:w-56 md:h-56 object-contain" />
                </motion.div>

                {status && (
                  <p className="mt-3 text-sm font-medium px-3 py-1 rounded-full" style={{ background: "#00adb5", color: "#ffffff" }}>
                    {status}
                  </p>
                )}
              </div>
            </div>

            {/* Transcripts under the logo (single scrollable box with both sections) */}
            <div ref={transcriptRef} className="mt-5 rounded-xl border border-[#00adb5]/30 bg-white p-3 max-h-64 overflow-auto">
              {/* Assistant */}
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Assistant Transcript</div>
              {assistantHistory.length > 0 && (
                <div className="mt-2 space-y-2">
                  {assistantHistory.map((line, i) => (
                    <p key={`a-${i}`} className="text-[15px] text-slate-800">{line}</p>
                  ))}
                </div>
              )}
              {assistantLive && (
                <div className="mt-2 text-[15px]">
                  <span className="font-medium text-[#00adb5]">Speaking… </span>
                  <span>{assistantLive}</span>
                </div>
              )}

              {/* Divider */}
              <div className="my-3 h-px bg-[#00adb5]/20" />

              {/* Candidate */}
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your Transcript</div>
              {candidateHistory.length > 0 && (
                <div className="mt-2 space-y-2">
                  {candidateHistory.map((line, i) => (
                    <p key={`u-${i}`} className="text-[15px] text-slate-800">{line}</p>
                  ))}
                </div>
              )}
              {candidateLive && (
                <div className="mt-2 text-[15px]">
                  <span className="font-medium text-[#00adb5]">You… </span>
                  <span>{candidateLive}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Camera */}
          <div className="p-8 md:p-10 bg-white rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none
                          border-t md:border-t-0 border-[#00adb5]/20">
            <div className="rounded-xl overflow-hidden border border-[#00adb5]/30 bg-white">
              <div className="bg-[#00adb5] text-white text-sm px-3 py-2">Camera Preview</div>
              <div className="w-full bg-white" style={{ height: "28rem" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewBot;
