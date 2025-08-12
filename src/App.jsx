import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Setup from './pages/SetUp';
import Header from './component/Header';
import ThankYouPage from './pages/ThankYouPage';
import InterviewBot from './component/Interview';

function Layout() {
  const location = useLocation();

  return (
    <>
      {/* Show header on all pages except interview screens */}
      {!location.pathname.startsWith('/interview') && <Header />}

      <Routes>
        {/* Home page */}
        <Route path="/" element={<Setup />} />

        {/* Setup page before interview */}
        <Route path="/interview/:id" element={<Setup />} />

        {/* Actual interview */}
        <Route path="/interview" element={<InterviewBot />} />

        {/* Thank You page */}
        <Route path="/thank-you" element={<ThankYouPage />} />
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
