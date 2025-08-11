import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Setup from './pages/SetUp';
import Header from './component/header';
import InterviewBot from './component/interview';
import Report from './pages/Report';

function Layout() {
  const location = useLocation();

  return (
    <>
      {/* Show header on all pages except /interview */}
      {location.pathname !== '/interview' && <Header />}

      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/interview" element={<InterviewBot />} />
        <Route path="/report/:callId" element={<Report />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
