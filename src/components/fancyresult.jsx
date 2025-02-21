import React, { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseFeedback } from './feedbackParser';

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Assume that the backend sends raw feedback text via location.state
  // (when navigating from the HomePage after a successful analysis)
  const rawFeedback = location.state && location.state.feedback;
  
  // Local state for parsed feedback
  const [parsedFeedback, setParsedFeedback] = useState(null);
  
  // Chat state (for clarification chat, as in your current code)
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // If no feedback was passed, use fallback data (or navigate back)
  useEffect(() => {
      const parsed = parseFeedback(rawFeedback);
      setParsedFeedback(parsed);
    }, [rawFeedback]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      setChatHistory([...chatHistory, { user: true, message: chatMessage }]);
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          { 
            user: false, 
            message: "I can help clarify the feedback. What specific aspect would you like to know more about?" 
          }
        ]);
      }, 1000);
      setChatMessage('');
    }
  };

  if (!parsedFeedback) {
    return <p>Loading feedback...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">RubricXpert</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/" className="text-gray-600 hover:text-blue-600">Home</a>
              <a href="/#about" className="text-gray-600 hover:text-blue-600">About Us</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Contact Us</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feedback Section */}
          <div className="space-y-6">
            {/* Overall Score & General Feedback */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Overall Score</h2>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-blue-600">
                      {parsedFeedback.overallScore}%
                    </span>
                  </div>
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 60}`}
                      strokeDashoffset={`${2 * Math.PI * 60 * (1 - parsedFeedback.overallScore / 100)}`}
                      className="text-blue-600"
                    />
                  </svg>
                </div>
              </div>
              {/* General Feedback displayed under overall score */}
              {parsedFeedback.generalFeedback && (
                <div className="mt-6">
                  <p className="text-gray-600">{parsedFeedback.generalFeedback}</p>
                </div>
              )}
            </div>

            {/* Detailed Criteria */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Feedback</h2>
              <div className="space-y-4">
                {parsedFeedback.criteria.map((criterion, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {criterion.name}
                      </h3>
                      <span className="text-blue-600 font-semibold">
                        {criterion.score}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div 
                        className="bg-blue-600 rounded-full h-2.5"
                        style={{ width: `${(criterion.score / 100) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-600">{criterion.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <MessageSquare className="mr-2 h-6 w-6" />
              Ask for Clarification
            </h2>
            <div className="flex-grow overflow-y-auto mb-4 space-y-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.user ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                      msg.user
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your question here..."
                className="flex-grow rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
