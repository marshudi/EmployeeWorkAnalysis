import React from "react";
import { NavLink } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-4xl text-center p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <h1 className="text-4xl font-bold mb-4 text-red-600">Employee Work Analysis</h1>
        <p className="text-lg mb-6">
          A comprehensive tool designed to analyze and visualize employee work data, providing insights into performance, workload distribution, and trends.
        </p>
        <div className="flex justify-center space-x-4">
          <NavLink
            to="/"
            className="px-6 py-2 text-lg font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-300"
          >
            Get Started
          </NavLink>
          <NavLink
            to="/"
            className="px-6 py-2 text-lg font-semibold text-red-600 border border-red-600 rounded-lg hover:bg-red-600 hover:text-white transition duration-300"
          >
            Learn More
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Home;
