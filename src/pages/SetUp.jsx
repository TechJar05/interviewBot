import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import axios from "axios";
import { FaBuilding, FaBriefcase, FaEnvelope } from "react-icons/fa";

const Setup = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null); // <- hold stream for cleanup
  const { id } = useParams();  // Dynamically get the id from URL params
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [interviewData, setInterviewData] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(1);

  // Turn on camera immediately (robust logic + cleanup)
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error("Camera API not supported in this browser.");
          return;
        }

        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // if component unmounted while awaiting permissions, stop and return
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // helpful on some browsers (Safari)
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            // ignore play error — video will still show in many browsers
            // console.warn("Video play() failed:", playErr);
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      // stop any active tracks
      const s =
        streamRef.current || (videoRef.current && videoRef.current.srcObject);
      if (s && s.getTracks) {
        s.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
      }
      // remove srcObject to help garbage collection
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = null;
        } catch (_) {}
      }
    };
  }, []);

  // Fetch interview data dynamically using the id from URL params
  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        // Dynamically passing the id in the URL
        const resumeJdRes = await axios.get(
          `https://nexai.qwiktrace.com/ibot/interview/resume/${id}`,
          { withCredentials: true }
        );
         localStorage.setItem("resumeId", resumeJdRes.data.id);  // Store id in localStorage
        setInterviewData(resumeJdRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Setup error:", err);
        setError("Failed to load interview data.");
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [id]); // Re-fetch if id changes

 const handleStart = async () => {
  if (!interviewData) {
    alert("Interview data not available.");
    return;
  }
  try {
    setLoading(true);
    setLoadingStep(1);
    setTimeout(() => setLoadingStep(2), 4000);
    // Update the path here to match the new route "/interview-started"
    navigate("/interview/interview-started", {
      state: { interviewStarted: true, interviewData },
    });
  } catch (err) {
    console.error("Error starting interview:", err);
    alert("Failed to start interview.");
    setLoading(false);
  }
};


  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-10 relative overflow-hidden">
      {loadingStep > 1 && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-white text-lg animate-pulse flex items-center gap-3 px-6 text-center">
            <i className="fas fa-spinner fa-spin text-xl"></i>
            Preparing your interview...
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl w-full max-w-6xl overflow-hidden border border-gray-200"
      >
        <div className="grid md:grid-cols-2 grid-cols-1">
          {/* Info Section */}
          <div className="p-10 flex flex-col justify-between text-gray-800">
            <div className="space-y-6 text-sm">
              <h2 className="text-3xl  tracking-wide font-[sans-serif] font-extrabold">
                Welcome,{" "}
                <span className="text-[#00adb5] ">
                  {interviewData?.candidate_name || "Candidate"}
                </span>
                !
              </h2>
              <p className="text-base text-gray-700">
                You’re about to begin your interview powered by our{" "}
                <span className="font-semibold text-[#00adb5]">
                  AI Assistant
                </span>
                .
              </p>

              {/* Instructions */}
              <div className="bg-[#F9F6FF] p-5 rounded-2xl shadow-sm">
                <h3 className="font-semibold text-lg mb-3 text-[#00adb5]">
                  Before You Start:
                </h3>
                <ul className="space-y-2 text-gray-700">
                  {[
                    "⏳ The Interview will last for 10 minutes.",
                    "🎧 Use headphones for clear audio.",
                    "🔇 Find a quiet environment.",
                    "💡 Sit in a well-lit space.",
                    "📶 Ensure stable internet connection.",
                  ].map((tip, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.2 }}
                      className="flex items-center gap-2"
                    >
                      {tip}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Candidate Details */}
              <div className="mt-6 space-y-2 text-sm leading-relaxed">
                <p className="flex items-center gap-2">
                  <FaBuilding className="text-[#5E4AE3] font-extrabold" />
                  <strong>Organization:</strong>{" "}
                  {interviewData?.organization_name}
                </p>
                <p className="flex items-center gap-2">
                  <FaBriefcase className="text-[#5E4AE3]" />
                  <strong>Job Title:</strong> {interviewData?.job_title}
                </p>
                <p className="flex items-center gap-2">
                  <FaEnvelope className="text-[#5E4AE3]" />
                  <strong>Email:</strong> {interviewData?.email}
                </p>
              </div>
            </div>

            {/* Start Button */}
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 15px rgba(94, 74, 227, 0.6)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              disabled={loading}
              className="mt-6 bg-[#00adb5] -[#81cfd8] hover:text-black text-white px-6 py-3 rounded-full font-semibold shadow-md transition-all"
            >
              <i className="fas fa-play mr-2"></i> Start Interview
            </motion.button>
          </div>

          {/* Camera Preview */}
          <div className="bg-black flex items-center justify-center relative w-full h-64 md:h-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover md:rounded-r-3xl"
            ></video>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Setup;
