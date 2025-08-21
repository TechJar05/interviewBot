import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import botImage from "../assets/botImage.png"; // small DP for assistant bubbles
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { useLocation } from "react-router-dom";

const InterviewBot = () => {
  const [vapiInstance, setVapiInstance] = useState(null);
  const [status, setStatus] = useState(""); // "Interview in progress..." / "Interview completed"
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [buttonTitle, setButtonTitle] = useState("Start Interview");
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const location = useLocation();
  const { interviewData } = location.state || {};

  const [sentWrapUp, setSentWrapUp] = useState(false);
  const [needsWrapUp, setNeedsWrapUp] = useState(false);
  const [sentFinalMessage, setSentFinalMessage] = useState(false);
  const [lastQuestionTime, setLastQuestionTime] = useState(null);

  // Default title

  // Live & final transcripts
  const [assistantLive, setAssistantLive] = useState("");
  const [candidateLive, setCandidateLive] = useState("");

  // Combined chat log: { role: "assistant"|"user", text: string, id: number }
  const [chat, setChat] = useState([]);

  // 10-minute countdown (in seconds); null = hidden
  const [remaining, setRemaining] = useState(null);
  const timerRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chatRef = useRef(null); // auto-scroll chat container
  const wsRef = useRef(null); // monitor websocket fallback

  // State to hold dynamically fetched assistantId
  const [assistantId, setAssistantId] = useState(
    interviewData?.assistant_id || ""
  );

  const config = {
    assistantId: assistantId, // Use dynamic assistantId from state
    apiKey: import.meta.env.VITE_API_KEY,
    buttonConfig: {
      offset: "0px",
      width: "100px",
      height: "48px",
      type: "pill",
      idle: {
        color: "#00adb5",
        textColor: "#ffffff",
        type: "pill",
        title: buttonTitle,
        subtitle: "",
        icon: "",
      },
      loading: {
        color: "#00adb5",
        textColor: "#ffffff",
        type: "pill",
        title: "Connecting...",
        subtitle: "",
        icon: "",
      },
      active: {
        color: "#dc2626",
        textColor: "#ffffff",
        type: "pill",
        title: "End Interview",
        subtitle: "",
        icon: "",
      },
      transitionDuration: 0,
    },
  };

  // Auto-scroll chat
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, assistantLive, candidateLive]);

  useEffect(() => {
    if (!assistantId && interviewData?.resume_id) {
      axios
        .get(
          `https://nexai.qwiktrace.com/ibot/interview/resume/${interviewData.resume_id}`,
          { withCredentials: true }
        )
        .then((res) => setAssistantId(res.data.assistant_id))
        .catch((err) => console.error(err));
    }
  }, [assistantId, interviewData?.resume_id]);

  // Helpers
  const pickText = (msg) => {
    if (!msg) return "";
    if (typeof msg.transcript === "string") return msg.transcript; // your SDK primary field
    if (typeof msg.delta === "string") return msg.delta;
    if (typeof msg.text === "string") return msg.text;
    if (typeof msg.output === "string") return msg.output;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content
        .map((c) => (typeof c === "string" ? c : c?.text || c?.value || ""))
        .join(" ")
        .trim();
    }
    if (msg?.data?.text) return msg.data.text;
    return "";
  };

  const isPartial = (t) =>
    ["partial", "interim", "temp", "temporary"].includes(
      String(t || "").toLowerCase()
    );
  const isFinal = (t) =>
    ["final", "finalized", "complete", "completed"].includes(
      String(t || "").toLowerCase()
    );
  const isAssistantRole = (role) =>
    ["assistant", "ai", "bot"].includes(String(role || "").toLowerCase());
  const isUserRole = (role) =>
    ["user", "human", "caller", "customer", "client", "candidate"].includes(
      String(role || "").toLowerCase()
    );

  // Timer controls
  const startTimer = (seconds = 600) => {
    setRemaining(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRemaining(null);
  };

  const mmss = (s) => {
    const m = Math.floor((s ?? 0) / 60);
    const sec = (s ?? 0) % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    script.defer = true;
    script.async = true;
    script.onload = () => {
      startInterview(); // auto-start to match your flow
    };
    document.body.appendChild(script);

    return () => {
      if (vapiInstance) vapiInstance.stop();
      wsRef.current?.close();
      stopCamera();
      stopTimer();
    };
  }, [assistantId]);

  // 🔔 Mark when we need to send wrap-up (at 1 minute)
  useEffect(() => {
    if (remaining === 60 && !sentWrapUp) {
      setNeedsWrapUp(true);
      console.log("⏰ 1 minute remaining - waiting for natural break");
    }
  }, [remaining, sentWrapUp]);

  // 🔔 Send wrap-up message at natural conversation break (with question answering time)
  useEffect(() => {
    if (needsWrapUp && !sentWrapUp && vapiInstance) {
      // Check if assistant just finished speaking (no live message)
      if (!assistantLive && !candidateLive) {
        // If a question was asked recently, wait at least 15 seconds for candidate to answer
        const timeSinceQuestion = lastQuestionTime
          ? Date.now() - lastQuestionTime
          : Infinity;
        const minAnswerTime = 15000; // 15 seconds

        if (timeSinceQuestion >= minAnswerTime) {
          setSentWrapUp(true);
          setNeedsWrapUp(false);

          try {
            vapiInstance.send({
              type: "add-message",
              message: {
                role: "system",
                content:
                  "Now mention that only one minute remains. Allow the candidate to give a brief final answer if they were responding to a question, then begin wrapping up the interview naturally.",
              },
            });
            console.log(
              "⚡ Graceful wrap-up message sent during natural break"
            );
          } catch (err) {
            console.error("⚌ Failed to send wrap-up message:", err);
          }
        } else {
          console.log(
            `⏳ Waiting ${Math.ceil(
              (minAnswerTime - timeSinceQuestion) / 1000
            )}s more for candidate to answer question`
          );
        }
      }
    }
  }, [
    needsWrapUp,
    sentWrapUp,
    vapiInstance,
    assistantLive,
    candidateLive,
    lastQuestionTime,
  ]);

  // 🎬 Send final closing message in last 10 seconds
  useEffect(() => {
    if (remaining === 10 && !sentFinalMessage && vapiInstance) {
      setSentFinalMessage(true);

      // Wait 2-3 seconds for any ongoing conversation to pause
      setTimeout(() => {
        try {
          vapiInstance.send({
            type: "add-message",
            message: {
              role: "system",
              content:
                'Take a brief pause, then deliver a professional closing message: "Thank you for your time today. This concludes our interview. We will review your responses and get back to you within the next few days. Have a great day!"',
            },
          });
          console.log("🎯 Final closing message sent");
        } catch (err) {
          console.error("⚌ Failed to send final message:", err);
        }
      }, 2500); // 2.5 second pause before final message
    }
  }, [remaining, sentFinalMessage, vapiInstance]);

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
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const pushChat = (role, text) => {
    // Ensure text is always a string
    const textToPush = typeof text === "string" ? text : JSON.stringify(text);
    setChat((prev) => [
      ...prev,
      { role, text: textToPush, id: prev.length + 1 },
    ]);
  };

  const startInterview = async () => {
    if (!window.vapiSDK) {
      setStatus("Failed to load interview SDK");
      return;
    }

    setIsInterviewing(true);
    await startCamera();
    setSentWrapUp(false);
    setNeedsWrapUp(false);
    setSentFinalMessage(false);
    setLastQuestionTime(null);

    const instance = window.vapiSDK.run({
      apiKey: config.apiKey,
      assistant: config.assistantId, // Use dynamic assistantId here
      config: config.buttonConfig,
      onCallStart: (callData) => {
        console.log("SDK call data:", callData); // Log entire callData for debugging

        if (callData?.id) {
          console.log("Storing call ID:", callData.id);
          // Store the call ID in both sessionStorage and localStorage
          sessionStorage.setItem("callId", callData.id);
          localStorage.setItem("callId", callData.id); // Store in localStorage as well
        } else {
          console.error("Call ID not found in SDK response.");
        }

        if (callData?.monitor?.listenUrl) {
          console.log("Storing listenUrl:", callData.monitor.listenUrl);
          sessionStorage.setItem("listenUrl", callData.monitor.listenUrl);
        }

        if (callData?.monitor?.controlUrl) {
          console.log("Storing controlUrl:", callData.monitor.controlUrl);
          localStorage.setItem("controlUrl", callData.monitor.controlUrl);
        }

        instance.setState("active"); // instant "End Interview"
      },
    });

    // Debug logs
    const dbg = (name, ...args) => console.log(`[vapi:${name}]`, ...args);
    ["message", "call-start", "call-end", "error"].forEach((evt) =>
      instance.on?.(evt, (...a) => dbg(evt, ...a))
    );

    // Client events: both roles
    instance.on?.("message", (raw) => {
      if (!raw) return;
      const role = String(raw.role || "").toLowerCase();
      const text = pickText(raw);
      const ttype = raw.transcriptType;

      if (isAssistantRole(role)) {
        if (raw.type === "transcript") {
          if (isPartial(ttype)) setAssistantLive(text || "");
          else if (isFinal(ttype) && text) {
            setAssistantLive("");
            pushChat("assistant", text);
          }
          return;
        }
        if (raw.type === "model-output" && text) {
          pushChat("assistant", text);
          setAssistantLive("");
        }
        if (!raw.type && text) {
          pushChat("assistant", text);
          setAssistantLive("");
        }
        return;
      }

      if (isUserRole(role)) {
        if (raw.type === "transcript") {
          if (isPartial(ttype)) setCandidateLive(text || "");
          else if (isFinal(ttype) && text) {
            setCandidateLive("");
            pushChat("user", text);
          }
          return;
        }
        if (raw.type === "model-output" && text) {
          pushChat("user", text);
          setCandidateLive("");
        }
        if (!raw.type && text) {
          pushChat("user", text);
          setCandidateLive("");
        }
      }
    });

    // Timer + optional server monitor
    instance.on("call-start", () => {
      setStatus("Interview in progress...");
      startTimer(600);

      const url = sessionStorage.getItem("listenUrl");
      if (!url) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          const evt = JSON.parse(e.data || "{}");
          const role = String(evt?.role || "").toLowerCase();
          const text = pickText(evt);
          const ttype = evt?.transcriptType;

          console.log("WebSocket received data:", evt); // Debugging log

          if (isAssistantRole(role)) {
            if (evt?.type === "transcript") {
              if (isPartial(ttype)) setAssistantLive(text || "");
              else if (isFinal(ttype) && text) {
                setAssistantLive("");
                pushChat("assistant", text);
              }
              return;
            }
            if (evt?.type === "model-output" && text) {
              pushChat("assistant", text);
              setAssistantLive("");
            }
            return;
          }

          if (isUserRole(role)) {
            if (evt?.type === "transcript") {
              if (isPartial(ttype)) setCandidateLive(text || "");
              else if (isFinal(ttype) && text) {
                setCandidateLive("");
                pushChat("user", text);
              }
              return;
            }
            if (evt?.type === "model-output" && text) {
              pushChat("user", text);
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
      setAssistantLive("");
      setCandidateLive("");
      stopTimer();
      wsRef.current?.close();
      wsRef.current = null;
      setVapiInstance(null);
      stopCamera();

      setButtonTitle("Interview Ended");
      window.location.href = "/interview/thank-you"; // Redirect to home or another page
    });

    instance.on("error", (error) => {
      setStatus(`Error: ${error.message}`);
      setIsInterviewing(false);
      setAssistantLive("");
      setCandidateLive("");
      stopTimer();
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
        className="relative w-full max-w-6xl bg-white border-[3px] border-[#00adb5]/40 rounded-3xl shadow-sm"
      >
        {/* ⏱️ Timer top-right */}
        {remaining !== null && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-2 bg-white border border-[#00adb5]/40 rounded-full px-3 py-1 shadow-sm">
              <span className="text-lg">⏱</span>
              <span className="font-mono font-bold text-[#00adb5]">
                {mmss(remaining)}
              </span>
            </div>
          </div>
        )}

        {/* EXACT 50/50 split */}
        <div className="grid grid-cols-1 md:grid-cols-[50%_50%]">
          {/* LEFT: Title + divider + chat */}
          <div
            className="p-8 md:p-10 bg-white rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none
                          border-b md:border-b-0 md:border-r border-[#00adb5]/20"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="text-[#00adb5]">NEX AI</span>{" "}
              {/* <span className="text-[#f5540f]">NEX AI</span>{" "} */}
              <span className="text-[#0f172a]">Interview Bot</span>
            </h1>

            {/* Partition line under title */}
            <div className="mt-4 mb-5 h-px bg-[#00adb5]/20" />

            {/* Status (optional) */}
            {status && (
              <p className="mb-3 text-xs font-semibold tracking-wide text-[#00adb5]">
                {status}
              </p>
            )}

            {/* Chat area — fixed height, scrolls internally to avoid layout shifts */}
            <div ref={chatRef} className="h-[28rem] overflow-auto pr-1">
              {/* Render final messages in order */}
              <ul className="space-y-3">
                {chat.map((m) => {
                  const isAssistant = m.role === "assistant";
                  return (
                    <li
                      key={m.id}
                      className={`flex items-end gap-2 ${
                        isAssistant ? "justify-start" : "justify-end"
                      }`}
                    >
                      {/* Assistant: avatar on left, user: avatar on right */}
                      {isAssistant && (
                        <img
                          src={botImage}
                          alt="Bot"
                          className="w-8 h-8 rounded-full shrink-0 border border-[#00adb5]/40"
                        />
                      )}

                      {/* Bubble */}
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-[15px] leading-relaxed
                          ${
                            isAssistant
                              ? "bg-[#E6FAFB] text-[#0f172a] border border-[#00adb5]/40"
                              : "bg-[#00adb5] text-white"
                          }`}
                      >
                        {/* Ensure m.text is always a string */}
                        {typeof m.text === "string"
                          ? m.text
                          : JSON.stringify(m.text)}
                      </div>

                      {!isAssistant && <div></div>}
                    </li>
                  );
                })}

                {/* Live bubbles (not added to history) */}
                {assistantLive && (
                  <li className="flex items-end gap-2 justify-start opacity-90">
                    <img
                      src={botImage}
                      alt="Bot"
                      className="w-8 h-8 rounded-full shrink-0 border border-[#00adb5]/40"
                    />
                    <div className="max-w-[80%] rounded-2xl px-3 py-2 text-[15px] bg-[#E6FAFB] text-[#0f172a] border border-[#00adb5]/40">
                      {assistantLive}
                    </div>
                  </li>
                )}

                {candidateLive && (
                  <li className="flex items-end gap-2 justify-end opacity-90">
                    <div className="max-w-[80%] rounded-2xl px-3 py-2 text-[15px] bg-[#00adb5] text-white">
                      {candidateLive}
                    </div>
                    {/* User's Avatar (optional) */}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* RIGHT: Camera (unchanged) */}
          <div
            className="p-8 md:p-10 bg-white rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none
                          border-t md:border-t-0 border-[#00adb5]/20"
          >
            <div className="rounded-xl overflow-hidden border border-[#00adb5]/30 bg-white">
              <div className="bg-[#00adb5] text-white text-sm px-3 py-2">
                Camera Preview
              </div>
              <div className="w-full bg-white" style={{ height: "28rem" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                ></video>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewBot;
