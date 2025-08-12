import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Setup from './pages/SetUp';
import Header from './component/Header';
import ThankYouPage from './pages/ThankYouPage';
import InterviewBot from './component/Interview'; // Correct import with capital I

function Layout() {
  const location = useLocation();

  return (
    <>
      {/* Show header on all pages except /interview-started */}
      {location.pathname !== '/interview/interview-started' && <Header />}

      <Routes>
        {/* Updated Setup Route to accept dynamic id and new route names */}
        <Route path="/interview/:id" element={<Setup />} />
        <Route path="/interview/interview-started" element={<InterviewBot />} />
        <Route path="/interview/thank-you" element={<ThankYouPage />} />
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
