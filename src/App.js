import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import "./App.css";
import Home from "./Components/Home";
import Nav from "./Components/Nav";
import Chatbot from "./Components/Chatbot";
import AggregatedDataProvider from "./Components/AggregatedDataContext"; // ✅ Import Fixed

// BSS
import GuideBSS from "./Components/BSS/Guide";
import BSS from "./Components/BSS/BSS";

// Data Lake
import GuideDL from "./Components/DL/Guide";
import DL from "./Components/DL/DL";

// API Factory
import GuideAPI from "./Components/AF/Guide";
import APIFactory from "./Components/AF/AF";

// Zentity Factory
import ZF from "./Components/ZF/ZF";
import GuideZF from "./Components/ZF/Guide";

// Digital Factory
import DF from "./Components/DF/DF";
import GuideDF from "./Components/DF/Guide";

function App() {
  const currentYear = new Date().getFullYear();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AggregatedDataProvider> {/* ✅ Context Provider Wrapping the App */}
      <Router basename="/EmployeeWorkAnalysis">
        <div className="flex flex-col min-h-screen">
          
          {/* Navigation Bar */}
          <div
            className={`fixed top-0 w-full transition-all duration-300 z-50 
            ${isScrolled 
              ? "h-12 bg-gray-800 dark:bg-gray-900 shadow-md" 
              : "h-20 bg-white/80 dark:bg-gray-900/80 shadow-lg backdrop-blur-lg"
            }`}
          >
            <Nav />
          </div>

          {/* Main Content */}
          <div className={isScrolled ? "pt-14" : "pt-24"}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/bss" element={<BSS />} />
              <Route path="/bss-guide" element={<GuideBSS />} />
              <Route path="/dl" element={<DL />} />
              <Route path="/dl-guide" element={<GuideDL />} />
              <Route path="/af" element={<APIFactory />} />
              <Route path="/af-guide" element={<GuideAPI />} />
              <Route path="/zf" element={<ZF />} />
              <Route path="/zf-guide" element={<GuideZF />} />
              <Route path="/df" element={<DF />} />
              <Route path="/df-guide" element={<GuideDF />} />
            </Routes>
          </div>

          {/* AI Chatbot Floating Button */}
          <Chatbot />

          {/* Footer */}
          <footer className="bg-white rounded-lg shadow-sm mt-auto dark:bg-gray-800">
            <div className="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
              <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
                © {currentYear} <span> </span>
                <a 
                  href="mailto:intern-mohammed.marshudi@vodafone.om" 
                  className="hover:underline text-red-600 font-semibold">
                   Mohammed Al-Marshudi - Vodafone
                </a>. All Rights Reserved.
              </span>
            </div>
          </footer>
        </div>
      </Router>
    </AggregatedDataProvider>
  );
}

export default App;
