 import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Setup from './pages/SetUp';
// import InterviewPage from './pages/InterviewPage';
// import ThankYouPage from './pages/ThankYouPage';
import Header from './component/header';
import InterviewBot from './component/interview';
import Report from './pages/Report';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#555b5b] text-[#DFD0B8] font-sans">
        <Header />
        <Routes>
          <Route path="/" element={<Setup />} />
          <Route path="/interview" element={<InterviewBot />} />
          + <Route path="/report/:callId" element={<Report />} />
          {/* <Route path="/jobs/interview/:token" element={<Setup />} /> */}
          {/* <Route path="/interview" element={<InterviewPage />} /> */}
          {/* <Route path="/thank-you" element={<ThankYouPage />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
