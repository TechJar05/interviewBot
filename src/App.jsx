import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Setup from './pages/SetUp';
import Header from './component/Header';
import InterviewBot from '.componenet/Interview';
import ThankYouPage from './pages/ThankYouPage';
// import Report from './pages/Report';

function Layout() {
  const location = useLocation();

  return (
    <>
      {/* Show header on all pages except /interview */}
      {location.pathname !== '/interview' && <Header />}

      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/interview" element={<InterviewBot />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        {/* <Route path="/report/:callId" element={<Report />} /> */}
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


// import React, { useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import Setup from './pages/SetUp';
// import Header from './component/Header';
// import InterviewBot from './component/interview';
// import ThankYouPage from './pages/ThankYouPage';

// function Layout() {
//   const location = useLocation();

//   useEffect(() => {
//     // Disable the back and forward buttons when on interview page
//     if (location.pathname === '/interview' || location.pathname === '/thank-you') {
//       window.history.pushState(null, '', window.location.href);
//       window.onpopstate = function () {
//         window.history.pushState(null, '', window.location.href);
//       };
//     }

//     // Cleanup on component unmount or navigation change
//     return () => {
//       window.onpopstate = null;
//     };
//   }, [location]);

//   return (
//     <>
//       {/* Show header on all pages except /interview and /thank-you */}
//       {location.pathname !== '/interview' && location.pathname !== '/thank-you' && <Header />}

//       <Routes>
//         <Route path="/" element={<Setup />} />
//         <Route path="/interview" element={<InterviewBot />} />
//         <Route path="/thank-you" element={<ThankYouPage />} />
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
