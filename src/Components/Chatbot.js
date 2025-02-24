import React, { useState, useRef, useEffect, useContext } from "react";
import { AggregatedDataContext } from "../Components/AggregatedDataContext"; // Access shared data from BSS
import responses from "../data/responses.json"; // Import fallback JSON responses
import { IoMdChatbubbles } from "react-icons/io";
import { FiSend } from "react-icons/fi";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get aggregated data from uploaded files
  const { aggregatedData, maximumHoursData } = useContext(AggregatedDataContext);

  // ✅ Get AI Response
  const getResponse = (userInput) => {
    if (!userInput || typeof userInput !== "string") {
      return "I couldn't understand that. Please try again!";
    }

    const lowerInput = userInput.toLowerCase().trim();

    if (lowerInput.includes("top employee")) {
      if (aggregatedData && aggregatedData.length > 0) {
        const topEmployee = aggregatedData[0];
        return `Top Employee: ${topEmployee.employeeName} with ${topEmployee.totalHours} hours.`;
      } else {
        return "No data available. Please upload a file first.";
      }
    }

    if (lowerInput.includes("max hours")) {
      if (maximumHoursData && maximumHoursData.length > 0) {
        const maxData = maximumHoursData[0];
        return `Max Hours: ${maxData.maxHoursFormatted} by ${maxData.employeeName}, occurring on ${maxData.maxCount} day(s).`;
      } else {
        return "No data available. Please upload a file first.";
      }
    }

    // ✅ Fix: Ensure response is always a string
    const response = responses[lowerInput];
    if (Array.isArray(response)) {
      return response[Math.floor(Math.random() * response.length)]; // Pick a random response
    } else if (typeof response === "string") {
      return response; // Directly return the string response
    } else {
      return responses["default"][0]; // Default fallback if no match
    }
  };

  // ✅ Show predefined + uploaded file suggestions
  const loadSuggestions = () => {
    let defaultSuggestions = Object.keys(responses).slice(0, 3); // Top 3 default suggestions
    let fileSuggestions = [];

    if (aggregatedData && aggregatedData.length > 0) {
      fileSuggestions = ["Top Employee", "Max Hours"];
    }

    setSuggestions([...defaultSuggestions, ...fileSuggestions]);
  };

  // ✅ Send message (Fixed: Ensures the button works properly)
  const sendMessage = (selectedInput = null) => {
    const userInput = selectedInput || input.trim();
    if (!userInput || typeof userInput !== "string") return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { text: userInput, sender: "user" },
      { text: getResponse(userInput), sender: "bot" }
    ]);

    setInput(""); // ✅ Clear input field

    // Auto-scroll to latest message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    // Re-display suggestions after bot response
    setTimeout(loadSuggestions, 500);
  };

  // ✅ Handle Enter key press
  const handleKeyDown = (event) => {
    if (event.key === "Enter") sendMessage();
  };

  // ✅ Auto-show suggestions when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 300);
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [isOpen, aggregatedData]); // Update suggestions when new data is uploaded

  return (
    <>
      {/* Chatbot Floating Button */}
      <button
        className="fixed bottom-6 right-6 bg-red-500 p-4 rounded-full text-white shadow-lg hover:bg-red-600 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <IoMdChatbubbles size={24} />
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-16 right-6 w-80 bg-white shadow-lg rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
            <button className="text-gray-600 hover:text-gray-800" onClick={() => setIsOpen(false)}>
              ✖
            </button>
          </div>

          {/* Chat Messages Window */}
          <div className="h-64 overflow-y-auto border p-2 rounded bg-gray-100">
            {messages.map((msg, index) => (
              <div key={index} className={`p-2 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <span className={`px-3 py-1 text-sm rounded-lg shadow-md ${
                  msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"
                }`}>
                  {msg.text}
                </span>
              </div>
            ))}
            {/* Invisible div for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* Clickable Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-gray-500 text-sm mb-2">Choose a question:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={`px-3 py-1 rounded-full shadow-sm text-sm ${
                      suggestion === "Top Employee" || suggestion === "Max Hours"
                        ? "bg-green-300 hover:bg-green-400"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input & Send Button */}
          <div className="flex mt-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
              onClick={() => sendMessage()} // ✅ Now works when clicking
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
