import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react"; // Import useState & useEffect
import './App.css';
import Home from './Components/Home';
import Nav from './Components/Nav';

// BSS
import GuideBSS from './Components/BSS/Guide';
import BSS from './Components/BSS/BSS';

// Data Lake
import GuideDL from './Components/DL/Guide';
import DL from './Components/DL/DL';

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
  const currentYear = new Date().getFullYear(); // Dynamic year

  // State for navbar shrink effect
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true); // Shrink navbar when scrolled down
      } else {
        setIsScrolled(false); // Return to normal size when at the top
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Router>
      <div className="flex flex-col min-h-screen"> {/* Ensures footer stays at bottom */}

        {/* Navigation Bar with Darker Background on Scroll */}
        <div className={`fixed top-0 w-full transition-all duration-300 z-50 
          ${isScrolled ? "h-12 bg-gray-800 dark:bg-gray-900 shadow-md" : "h-20 bg-white/80 dark:bg-gray-900/80 shadow-lg backdrop-blur-lg"}`}>
          <Nav />
        </div>

        {/* Add padding to prevent content from being hidden under fixed navbar */}
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

        {/* Footer */}
        <footer className="bg-white rounded-lg shadow-sm mt-auto dark:bg-gray-800">
          <div className="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
            <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
              © {currentYear} <a href="mailto:intern-mohammed.marshudi@vodafone.om" className="hover:underline text-red-600 font-semibold">
                Marshudi - Vodafone
              </a>. All Rights Reserved.
            </span>
          </div>
        </footer>

      </div>
    </Router>
  );
}

export default App;
