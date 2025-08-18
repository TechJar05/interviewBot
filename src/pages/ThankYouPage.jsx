import React, { useState, useEffect ,useRef} from "react";
import axios from "axios";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable"; //

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);


const ThankYouPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [report, setReport] = useState(null);
  const [phase, setPhase] = useState(0);
  const chartRef = useRef(null);

  useEffect(() => {
  handleViewReport();
}, []);

  

  useEffect(() => {
    const analyzeTimer = setTimeout(() => setPhase(1), 5000);
    const prepareTimer = setTimeout(() => setPhase(2), 10000);
    return () => {
      clearTimeout(analyzeTimer);
      clearTimeout(prepareTimer);
    };
  }, []);

  const handleViewReport = async () => {
  setLoading(true);
  setError(null);
  setSuccess(null);
  setReport(null);

  try {
    const assistantId = localStorage.getItem("assistantId");
    const resumeId    = localStorage.getItem("resumeId");
    const bearerToken = import.meta.env.VITE_PRIVATE_API_KEY;

    if (!assistantId || !resumeId) {
      setError("Missing assistantId or resumeId");
      setLoading(false);
      return;
    }

    // If you saved the callId when the interview started/ended, read it here.
    // It's more reliable than picking calls[0].
    const storedCallId = localStorage.getItem("callId"); // optional

    // 1) Wait until the relevant call is ENDED
    const endedCallId = await waitForEndedCall({
      assistantId,
      bearerToken,
      targetCallId: storedCallId || null,  // use if available
      timeoutMs: 120000,                   // 2 minutes (tweak if needed)
      intervalMs: 3000,                    // poll every 3s
    });

    // 2) Now fetch the report for that ended call
    const reportRes = await axios.post(
      `https://nexai.qwiktrace.com/api/interview/fetch/${endedCallId}/`,
      { resume_id: resumeId },
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!reportRes?.data?.report) {
      throw new Error("Report not available in response");
    }

    setReport(reportRes.data.report);
    setSuccess("The report has been successfully fetched!");
  } catch (e) {
    console.error(e);
    setError(e?.message || "There was an error processing the interview report.");
  } finally {
    setLoading(false);
  }
};


  const handleDownloadPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Interview Report", 14, 20);
  doc.setFontSize(12);

  // Candidate Info
  autoTable(doc, {
    startY: 30,
    head: [["Candidate Name", "Position", "Overall Score"]],
    body: [[report.candidate_name, report.position, report.overall_score]],
  });

  // Strengths
  if (report.overall_strengths?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Overall Strengths"]],
      body: report.overall_strengths.map((s) => [s]),
    });
  }

  // Improvements
  if (report.overall_improvements?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Overall Improvements"]],
      body: report.overall_improvements.map((imp) => [imp]),
    });
  }

  // Recommendations
  if (report.recommendations?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Recommendations"]],
      body: report.recommendations.map((r) => [r]),
    });
  }

   // ✅ Add Chart Image
  if (chartRef.current) {
    const chartImage = chartRef.current.toBase64Image();
    doc.addPage();
    doc.text("Skills Chart", 14, 20);
    doc.addImage(chartImage, "PNG", 15, 30, 180, 160);
  }

  doc.save(`${report.candidate_name}_InterviewReport.pdf`);
};

  const Spinner = () => (
    <svg
      className="animate-spin h-5 w-5 text-[#00adb5] inline-block ml-2"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );

  const skillChartData = {
    labels: report?.scores_per_skill?.map((skill) => skill.skill) || [],
    datasets: [
      {
        label: "Skill Scores",
        data: report?.scores_per_skill?.map((skill) => skill.score) || [],
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(75, 192, 192, 0.6)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(75, 192, 192, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const skillChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      datalabels: {
        formatter: (value, ctx) => {
          const total = ctx.chart.data.datasets[0].data.reduce(
            (sum, val) => sum + val,
            0
          );
          const percentage = ((value / total) * 100).toFixed(1) + "%";
          return percentage;
        },
        color: "#fff",
        font: { weight: "bold", size: 14 },
      },
    },
    maintainAspectRatio: false,
  };

  // Poll Vapi until there's an ENDED call for this assistant (or a specific callId)
async function waitForEndedCall({ assistantId, bearerToken, targetCallId = null, timeoutMs = 120000, intervalMs = 3000 }) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`https://api.vapi.ai/call?assistantId=${assistantId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error(`Vapi /call failed with ${res.status}`);

    const calls = await res.json();
    if (Array.isArray(calls) && calls.length) {
      // If you saved callId at start/end, prefer that exact call
      let candidate = null;

      if (targetCallId) {
        candidate = calls.find(c => c.id === targetCallId);
      } else {
        // otherwise, take the most recent ENDED call for this assistant
        const ended = calls
          .filter(c => c.status === "ended" || c.endedAt)
          .sort((a, b) => new Date(b.updatedAt || b.endedAt || b.createdAt) - new Date(a.updatedAt || a.endedAt || a.createdAt));
        if (ended.length) candidate = ended[0];
      }

      if (candidate && (candidate.status === "ended" || candidate.endedAt)) {
        return candidate.id;
      }
    }

    // wait and try again
    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error("Timed out waiting for call to end");
}


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center px-8 py-4">
        <h1 className="text-4xl font-extrabold text-black">
          Your Interview is Complete!
        </h1>
        <div className="mt-4">
          {success && <p className="text-black">{success}</p>}
          {error && <p className="text-black">{error}</p>}

          {phase === 0 && (
            <p className="mt-6 text-lg text-gray-700">
              Analyzing your interview... <Spinner />
            </p>
          )}
          {phase === 1 && (
            <p className="mt-6 text-lg text-gray-700">
              Preparing report... <Spinner />
            </p>
          )}

          {/* {phase === 2 && !report && (
            <button
              onClick={handleViewReport}
              className="mt-6 px-6 py-3 text-white bg-[#00adb5] rounded-lg hover:bg-[#009ba2]"
              disabled={loading}
            >
              {loading ? "Generating..." : "View Report"}
            </button>
          )} */}

          {report && (
            <div className="mt-6 border rounded-lg shadow-lg bg-white p-6 text-left">
              <h2 className="text-xl font-bold text-black mb-4">Interview Report</h2>

              <table className="min-w-full text-black border mb-6">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border">Candidate Name</th>
                    <th className="py-2 px-4 border">Position</th>
                    <th className="py-2 px-4 border">Overall Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border">{report.candidate_name}</td>
                    <td className="py-2 px-4 border">{report.position}</td>
                    <td className="py-2 px-4 border">{report.overall_score}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="font-semibold text-lg text-black">Overall Strengths:</h3>
              <ul className="mb-4">
                {report.overall_strengths?.length > 0 ? (
                  report.overall_strengths.map((s, i) => (
                    <li key={i} className="ml-4 text-black">- {s}</li>
                  ))
                ) : (
                  <p className="text-black">No strengths mentioned.</p>
                )}
              </ul>

              <h3 className="font-semibold text-lg text-black">Overall Improvements:</h3>
              <ul className="mb-4">
                {report.overall_improvements?.length > 0 ? (
                  report.overall_improvements.map((imp, i) => (
                    <li key={i} className="ml-4 text-black">- {imp}</li>
                  ))
                ) : (
                  <p className="text-black">No improvements mentioned.</p>
                )}
              </ul>

              <h3 className="font-semibold text-lg text-black">Recommendations:</h3>
              <ul className="mb-6">
                {report.recommendations?.length > 0 ? (
                  report.recommendations.map((r, i) => (
                    <li key={i} className="ml-4 text-black">- {r}</li>
                  ))
                ) : (
                  <p className="text-black">No recommendations available.</p>
                )}
              </ul>

              <div className="flex justify-center mb-6">
                <div style={{ width: "300px", height: "300px" }}>
                  <Doughnut ref={chartRef} data={skillChartData} options={skillChartOptions}     
                  />
                </div>
              </div>

              {/* Button at the bottom */}
              <div className="flex justify-center">
                <button
                  onClick={handleDownloadPDF}
                  className="px-6 py-3 bg-[#00adb5] text-white rounded-lg hover:bg-[#009ba2]"
                >
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
