import React, { useState } from "react";
import axios from "axios";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ThankYouPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [report, setReport] = useState(null); // To hold the fetched report data

  // Function to handle the API call when the button is clicked
  const handleViewReport = async () => {
    setLoading(true); // Set loading to true when the API call starts
    setError(null);   // Reset error state before making the call
    setSuccess(null); // Reset success message before making the call
    setReport(null);  // Reset the report data before fetching new data

    try {
      const assistantId = localStorage.getItem("assistantId");
      const resumeId = localStorage.getItem("resumeId");
      const bearerToken = import.meta.env.VITE_PRIVATE_API_KEY; // from .env

      if (!assistantId || !resumeId) {
        console.error("Missing assistantId or resumeId");
        setError("Missing assistantId or resumeId");
        setLoading(false);
        return;
      }

      // 1️⃣ Get latest call from Vapi API
      const callListRes = await fetch(
        `https://api.vapi.ai/call?assistantId=${assistantId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const callListBody = await callListRes.json();
      console.log("📞 Call list:", callListBody);

      if (!Array.isArray(callListBody) || callListBody.length === 0) {
        console.error("No valid call data found in response");
        setError("No valid call data found in response");
        setLoading(false);
        return;
      }

      const firstCallId = callListBody[0]?.id;  // Access the first call ID

      if (!firstCallId) {
        console.error("No call ID found in response");
        setError("No call ID found in response");
        setLoading(false);
        return;
      }

      // 2️⃣ Send POST to NexAI API to fetch the interview report
      const reportRes = await axios.post(
        `https://nexai.qwiktrace.com/api/interview/fetch/${firstCallId}/`,
        { resume_id: resumeId },
        { headers: { Authorization: `Bearer ${bearerToken}` } }
      );

      console.log("✅ Post-interview API call successful", reportRes.data);

      setReport(reportRes.data.report);  // Set the report data received from the API
      setSuccess("The report has been successfully fetched!");

    } catch (err) {
      console.error("❌ Error in post-interview process:", err);
      setError("There was an error processing the interview report.");
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for the chart
  const chartData = {
    labels: ["Overall Score"],
    datasets: [
      {
        label: "Interview Score",
        data: [report?.overall_score || 0],
        backgroundColor: ["rgba(0, 123, 255, 0.6)"],
        borderColor: ["rgba(0, 123, 255, 1)"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center px-8 py-4">
        <h1 className="text-4xl font-extrabold text-black">
          Your Interview is Complete!
        </h1>
        <div className="mt-4">
          {/* Show success or error messages */}
          {success && <p className="text-black">{success}</p>}
          {error && <p className="text-black">{error}</p>}

          {/* View Report button */}
          <button
            onClick={handleViewReport}
            className="mt-6 px-6 py-3 text-black bg-[#00adb5] rounded-lg"
            disabled={loading}
          >
            {loading ? "Loading..." : "View Report"}
          </button>

          {/* Display the interview report after fetching */}
          {report && (
            <div className="mt-6">
              {/* Display Report in Table */}
              <h2 className="text-xl font-bold text-black mb-4">Interview Report</h2>
              <table className="min-w-full bg-white text-black shadow-md rounded-lg">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Candidate Name</th>
                    <th className="py-2 px-4 border-b">Position</th>
                    <th className="py-2 px-4 border-b">Overall Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-b">{report.candidate_name}</td>
                    <td className="py-2 px-4 border-b">{report.position}</td>
                    <td className="py-2 px-4 border-b">{report.overall_score}</td>
                  </tr>
                </tbody>
              </table>

              {/* Display Strengths and Improvements */}
              <div className="mt-6 text-left">
                <h3 className="font-semibold text-lg text-black">Overall Strengths:</h3>
                <ul>
                  {report.overall_strengths?.length > 0 ? (
                    report.overall_strengths.map((strength, index) => (
                      <li key={index} className="ml-4 text-black">- {strength}</li>
                    ))
                  ) : (
                    <p className="text-black">No strengths mentioned.</p>
                  )}
                </ul>

                <h3 className="font-semibold text-lg mt-4 text-black">Overall Improvements:</h3>
                <ul>
                  {report.overall_improvements?.length > 0 ? (
                    report.overall_improvements.map((improvement, index) => (
                      <li key={index} className="ml-4 text-black">- {improvement}</li>
                    ))
                  ) : (
                    <p className="text-black">No improvements mentioned.</p>
                  )}
                </ul>

                <h3 className="font-semibold text-lg mt-4 text-black">Recommendations:</h3>
                <ul>
                  {report.recommendations?.length > 0 ? (
                    report.recommendations.map((recommendation, index) => (
                      <li key={index} className="ml-4 text-black">- {recommendation}</li>
                    ))
                  ) : (
                    <p className="text-black">No recommendations available.</p>
                  )}
                </ul>
              </div>

              {/* Display Bar Chart for Score */}
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2 text-black">Overall Score Representation</h3>
                <Bar data={chartData} options={{ responsive: true }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
