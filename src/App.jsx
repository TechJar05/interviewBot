// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import Setup from './pages/SetUp';
// import Header from './component/Header';
// import ThankYouPage from './pages/ThankYouPage';
// import InterviewBot from './component/Interview';
// import Report from './pages/Report'; // Correct import with capital I

// function Layout() {
//   const location = useLocation();

//   return (
//     <>
//       {/* Show header on all pages except /interview-started */}
//       {location.pathname !== '/interview/interview-started' && <Header />}

//       <Routes>
//         {/* Updated Setup Route to accept dynamic id and new route names */}
//         <Route path="/interview/:id" element={<Setup />} />
//         <Route path="/interview/interview-started" element={<InterviewBot />} />
//         <Route path="/interview/thank-you" element={<ThankYouPage />} />
//         <Route path="/interview/report" element={<Report />} />

//       </Routes>
//     </>
//   );
// }

// function App() {
//   return (
//     <Router>
//       <Layout />
//     </Router>
//   );
// }

// export default App;

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Setup from './pages/SetUp';
import Header from './component/Header';
import ThankYouPage from './pages/ThankYouPage';
import InterviewBot from './component/Interview';
import Report from './pages/Report';

function Layout() {
  const location = useLocation();

  useEffect(() => {
    // List of routes where back/forward navigation should be disabled
    const protectedRoutes = [
      '/interview/interview-started',
      '/interview/thank-you',
      '/interview/report'
    ];

    if (protectedRoutes.includes(location.pathname)) {
      // Push current state to history stack
      window.history.pushState(null, '', window.location.href);
      // Intercept back/forward
      window.onpopstate = function () {
        window.history.pushState(null, '', window.location.href);
      };
    } else {
      // Allow normal navigation on other routes
      window.onpopstate = null;
    }
  }, [location]);

  return (
    <>
      {/* Show header on all pages except interview-started */}
      {location.pathname !== '/interview/interview-started' && <Header />}

      <Routes>
        <Route path="/interview/:id" element={<Setup />} />
        <Route path="/interview/interview-started" element={<InterviewBot />} />
        <Route path="/interview/thank-you" element={<ThankYouPage />} />
        <Route path="/interview/report" element={<Report />} />
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
