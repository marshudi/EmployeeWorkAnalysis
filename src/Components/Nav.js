import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Image/logo.png";

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); // Use navigate to programmatically navigate

  const mainNav = [
    { path: "/bss", title: "BSS" },
    { path: "/dl", title: "Data Lake" },
    { path: "/df", title: "Digital Factory" },
    { path: "/af", title: "API Factory" },
    { path: "/zf", title: "Zentity Factory" }
  ];

  const subNavs = {
    "/bss": [
      { path: "/bss", title: "BSS" },
      { path: "/bss-guide", title: "BSS Guide" },
    ],
    "/dl": [
      { path: "/dl", title: "Data Lake" },
      { path: "/dl-guide", title: "Data Lake Guide" },
    ],
    "/af": [
      { path: "/af", title: "API Factory" },
      { path: "/af-guide", title: "API Factory Guide" },
    ],
    "/zf": [
      { path: "/zf", title: "Zentity Factory" },
      { path: "/zf-guide", title: "Zentity Factory Guide" },
    ],
    "/df": [
      { path: "/df", title: "Digital Factory" },
      { path: "/df-guide", title: "Digital Factory Guide" },
    ]
  };

  const currentSection = Object.keys(subNavs).find((section) =>
    location.pathname.startsWith(section)
  );

  return (
    <nav className="bg-white border-gray-200 dark:bg-gray-900">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        
        {/* Logo as a Button */}
        <button
          onClick={() => navigate("/")} // Navigate to Home Page when clicked
          className="flex items-center space-x-3 transition-transform duration-300 hover:scale-105"
        >
          <img src={Logo} className="h-10 md:h-12" alt="Logo" />
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 dark:text-gray-400 dark:hover:bg-red-700 dark:focus:ring-red-600"
        >
          <span className="sr-only">Open main menu</span>
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15" />
          </svg>
        </button>

        <div className={`${isOpen ? "block" : "hidden"} w-full md:block md:w-auto`}>
          <ul className="font-medium flex flex-col p-4 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            {currentSection && subNavs[currentSection] ? (
              subNavs[currentSection].map((navItem) => (
                <li key={navItem.path}>
                  <NavLink to={navItem.path} className={({ isActive }) => `block py-2 px-3 rounded-sm hover:bg-red-500 md:hover:bg-transparent md:border-0 md:hover:text-red-700 dark:hover:bg-red-700 dark:hover:text-red-500 md:dark:hover:bg-transparent ${isActive ? 'text-red-700 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>                    
                    {navItem.title}
                  </NavLink>
                </li>
              ))
            ) : (
              mainNav.map((navItem) => (
                <li key={navItem.path}>
                  <NavLink to={navItem.path} className={({ isActive }) => `block py-2 px-3 rounded-sm hover:bg-red-500 md:hover:bg-transparent md:border-0 md:hover:text-red-700 dark:hover:bg-red-700 dark:hover:text-red-500 md:dark:hover:bg-transparent ${isActive ? 'text-red-700 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>                    
                    {navItem.title}
                  </NavLink>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
