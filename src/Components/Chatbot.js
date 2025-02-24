import React, { useState, useRef, useEffect, useContext } from "react";
import { AggregatedDataContext } from "../Components/AggregatedDataContext"; // Access shared data from BSS
import responses from "../data/responses.json"; // Import fallback JSON responses
import { IoMdChatbubbles } from "react-icons/io";
import { FiSend } from "react-icons/fi";

const INVOICE_ITEMS = [
  { role: "Project Manager", normalizedRole: "project manager", offsite: 941, onsite: 1141 },
  { role: "PMO Consultant", normalizedRole: "pmo consultant", offsite: 750, onsite: 950 },
  { role: "Senior Technical Manager", normalizedRole: "senior technical manager", offsite: 842, onsite: 1042 },
  { role: "Principal Solution Architect", normalizedRole: "principal solution architect", offsite: 750, onsite: 950 },
  { role: "QA Lead", normalizedRole: "qa lead", offsite: 600, onsite: 800 },
  { role: "Senior QA", normalizedRole: "senior qa", offsite: 495, onsite: 695 },
  { role: "Technical Manager / Technical Lead", normalizedRole: "technical manager", offsite: 650, onsite: 850 },
  { role: "Solution Architect / Business Analyst / Dev Lead / Integration Lead", normalizedRole: "solution architect / business analyst / dev lead / integration lead", offsite: 700, onsite: 900 },
  { role: "Developer / Sr. Developer", normalizedRole: "developer / sr developer", offsite: 495, onsite: 695 },
  { role: "IT Engineer", normalizedRole: "it engineer", offsite: 495, onsite: 695 },
  { role: "Release Manager / QA Analyst", normalizedRole: "release manager", offsite: 495, onsite: 695 },
  { role: "QA / Test", normalizedRole: "qa / test", offsite: 395, onsite: 595 },
];

const PRICE_MAPPING = {};
INVOICE_ITEMS.forEach((item) => {
  PRICE_MAPPING[item.normalizedRole] = {
    onsite: item.onsite,
    offsite: item.offsite,
    role: item.role,
  };
});

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get aggregated data from uploaded files
  const { aggregatedData, maximumHoursData, roleLocationManDays } = useContext(AggregatedDataContext);

  // Enhanced getResponse function moved inside the component
  const getResponse = (userInput) => {
    if (!userInput || typeof userInput !== "string") {
      return "I couldn't understand that. Please try again!";
    }
    const lowerInput = userInput.toLowerCase().trim();

    // Manual command handling inside getResponse
    if (lowerInput === "manual") {
      const manualKeywords = responses.manual || [];
      return { type: "manual", data: manualKeywords };
    }

    // If user asks for total expenses
    if (lowerInput.includes("total expenses")) {
      if (roleLocationManDays && Object.keys(roleLocationManDays).length > 0) {
        let total = 0, onsiteTotal = 0, offsiteTotal = 0;
        Object.entries(roleLocationManDays).forEach(([key, manDays]) => {
          const [role, location] = key.split("|");
          const price = PRICE_MAPPING[role];
          if (price) {
            if (location === "onsite") {
              const exp = manDays * price.onsite;
              onsiteTotal += exp;
              total += exp;
            } else if (location === "offsite") {
              const exp = manDays * price.offsite;
              offsiteTotal += exp;
              total += exp;
            }
          }
        });
        return `Total Expenses: $${total.toFixed(2)} (On‑Site: $${onsiteTotal.toFixed(2)}, Off‑Site: $${offsiteTotal.toFixed(2)})`;
      } else {
        return "No expense data available. Please upload a file first.";
      }
    }

    if (lowerInput.includes("onsite expense")) {
      if (roleLocationManDays && Object.keys(roleLocationManDays).length > 0) {
        let onsiteTotal = 0;
        Object.entries(roleLocationManDays).forEach(([key, manDays]) => {
          const [role, location] = key.split("|");
          if (location === "onsite") {
            const exp = manDays * (PRICE_MAPPING[role]?.onsite || 0);
            onsiteTotal += exp;
          }
        });
        return `On‑Site Expenses: $${onsiteTotal.toFixed(2)}`;
      } else {
        return "No expense data available. Please upload a file first.";
      }
    }

    if (lowerInput.includes("offsite expense")) {
      if (roleLocationManDays && Object.keys(roleLocationManDays).length > 0) {
        let offsiteTotal = 0;
        Object.entries(roleLocationManDays).forEach(([key, manDays]) => {
          const [role, location] = key.split("|");
          if (location === "offsite") {
            const exp = manDays * (PRICE_MAPPING[role]?.offsite || 0);
            offsiteTotal += exp;
          }
        });
        return `Off‑Site Expenses: $${offsiteTotal.toFixed(2)}`;
      } else {
        return "No expense data available. Please upload a file first.";
      }
    }

    // Critical Employee: employee with status Critical and highest total hours
    if (lowerInput.includes("critical employee")) {
      const criticalEmps = aggregatedData.filter(emp => emp.status.toLowerCase() === "critical");
      if (criticalEmps.length > 0) {
        const topCritical = criticalEmps[0];
        return `Critical Employee: ${topCritical.employeeName} with ${topCritical.totalHours} hours. Description: ${topCritical.description || "N/A"}`;
      } else {
        return "No critical employee found.";
      }
    }

    // Top Employee
    if (lowerInput.includes("top employee")) {
      if (aggregatedData && aggregatedData.length > 0) {
        const topEmp = aggregatedData[0];
        return `Top Employee: ${topEmp.employeeName} with ${topEmp.totalHours} hours. Description: ${topEmp.description || "N/A"}`;
      } else {
        return "No data available. Please upload a file first.";
      }
    }
    
    // Max Hours
    if (lowerInput.includes("max hours")) {
      if (maximumHoursData && Object.keys(maximumHoursData).length > 0) {
        return `Max Hours: ${maximumHoursData.employeeName} with ${maximumHoursData.totalHours} hours. Description: ${maximumHoursData.description || "N/A"}`;
      } else {
        return "No max hours data available. Please upload a file first.";
      }
    }

    // Fallback to responses.json
    const fallbackResponse = responses[lowerInput];
    if (Array.isArray(fallbackResponse)) {
      return fallbackResponse[Math.floor(Math.random() * fallbackResponse.length)];
    } else if (typeof fallbackResponse === "string") {
      return fallbackResponse;
    } else {
      return responses["default"][0];
    }
  };

  // Load suggestions (default and file suggestions)
  const loadSuggestions = () => {
    const defaultSuggestions = Object.keys(responses).slice(0, 3);
    let fileSuggestions = [];
    if (aggregatedData && aggregatedData.length > 0) {
      fileSuggestions = ["Top Employee", "Max Hours", "Total Expenses", "Critical Employee"];
    }
    setSuggestions([...defaultSuggestions, ...fileSuggestions]);
  };

  // Send message function
  const sendMessage = (selectedInput = null) => {
    const userInput = selectedInput || input.trim();
    if (!userInput || typeof userInput !== "string") return;
    const botResponse = getResponse(userInput);
    if (botResponse && botResponse.type === "manual") {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: userInput, sender: "user" },
        { type: "manual", data: botResponse.data }
      ]);
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: userInput, sender: "user" },
        { text: botResponse, sender: "bot" }
      ]);
    }
    setInput("");
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    setTimeout(loadSuggestions, 500);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") sendMessage();
  };

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
  }, [isOpen, aggregatedData]);

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
                {msg.type === "manual" ? (
                  <div className="bg-gray-300 text-black p-2 rounded-lg">
                    <p className="font-bold mb-2">Available Commands:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.data.map((command, i) => (
                        <button
                          key={i}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600"
                          onClick={() => sendMessage(command)}
                        >
                          {command}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className={`px-3 py-1 text-sm rounded-lg shadow-md ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"}`}>
                    {msg.text}
                  </span>
                )}
              </div>
            ))}
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
                      ["Top Employee", "Max Hours", "Total Expenses", "Critical Employee"].includes(suggestion)
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
              onClick={() => sendMessage()}
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
