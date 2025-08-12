import React from "react";
import { useLocation } from "react-router-dom";

const Report = () => {
  const location = useLocation();
  const { reportData } = location.state || {};  // Get the report data from state

  if (!reportData) {
    return <div>No report data available.</div>;
  }

  return (
    <div>
      <h1>Interview Report</h1>
      <div>
        {/* Render the interview report data here */}
        <p><strong>Candidate Name:</strong> {reportData.candidate_name}</p>
        <p><strong>Job Title:</strong> {reportData.job_title}</p>
        <p><strong>Status:</strong> {reportData.status}</p>
        {/* Display other interview details as needed */}
      </div>
    </div>
  );
};

export default Report;
