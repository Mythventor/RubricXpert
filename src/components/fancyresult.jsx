import React, { useEffect, useState, useRef } from 'react';
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
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Reference for auto-scrolling chat
  const chatContainerRef = useRef(null);

  // If no feedback was passed, use fallback data (or navigate back)
  useEffect(() => {
    if (rawFeedback) {
      const parsed = parseFeedback(rawFeedback);
      setParsedFeedback(parsed);
    } else {
      // Optionally navigate back if no feedback
      // navigate('/');
    }
  }, [rawFeedback, navigate]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (chatMessage.trim()) {
      // Add user message to chat
      const newUserMessage = { user: true, message: chatMessage };
      setChatHistory(prev => [...prev, newUserMessage]);
      
      // Clear input field
      setChatMessage('');
      
      // Show loading state
      setIsLoading(true);
      
      try {
        // Create payload with message, feedback context, and chat history
        const payload = {
          message: chatMessage,
          feedback: rawFeedback, // Send the raw feedback for context
          chatHistory: chatHistory // Send chat history for context
        };
        
        // Make API call to your backend
        const response = await fetch('http://127.0.0.1:5000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Add AI response to chat
          setChatHistory(prev => [...prev, { user: false, message: data.response }]);
        } else {
          // Handle error from API
          setChatHistory(prev => [...prev, { 
            user: false, 
            message: "Sorry, I encountered an error. Please try again." 
          }]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Add error message to chat
        setChatHistory(prev => [...prev, { 
          user: false, 
          message: "Sorry, there was a problem connecting to the server. Please try again later." 
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!parsedFeedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading feedback...</p>
        </div>
      </div>
    );
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
            <div 
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto mb-4 space-y-4 max-h-[500px] p-2"
            >
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 my-8">
                  <p>Ask questions about your feedback to get clarification</p>
                  <p className="text-sm mt-2">Examples:</p>
                  <ul className="text-sm mt-1 space-y-1">
                    <li>"How can I improve my thesis statement?"</li>
                    <li>"Can you explain what you meant by lack of coherence?"</li>
                    <li>"What are some specific ways to enhance my evidence?"</li>
                  </ul>
                </div>
              ) : (
                chatHistory.map((msg, index) => (
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
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg p-3 flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={isLoading}
                placeholder="Type your question here..."
                className="flex-grow rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading || !chatMessage.trim()}
                className={`text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isLoading || !chatMessage.trim() 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
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