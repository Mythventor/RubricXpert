import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseFeedback } from './feedbackParser';
import ReactMarkdown from 'react-markdown';

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Assume that the backend sends raw feedback text via location.state
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
      console.log('Raw feedback:', rawFeedback);
      const parsed = parseFeedback(rawFeedback);
      setParsedFeedback(parsed);
    } else {
      console.error('No feedback data found');
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
        // Extract essay text from rawFeedback if available
        let essayText = "";
        
        // Try to get essay text from different possible locations in the feedback data
        if (rawFeedback && rawFeedback.essay_text) {
          essayText = rawFeedback.essay_text;
        } else if (rawFeedback && rawFeedback.paragraphs) {
          essayText = rawFeedback.paragraphs.join('\n\n');
        } else if (rawFeedback && rawFeedback.results && 
                  rawFeedback.results[0] && 
                  Array.isArray(rawFeedback.results[0].paragraphs)) {
          // If paragraphs are in the first result item
          essayText = rawFeedback.results[0].paragraphs.join('\n\n');
        }
        
        console.log("Essay text extracted:", essayText ? "Yes (length: " + essayText.length + ")" : "No");
        
        // Create payload with message, feedback context, chat history, and essay
        const payload = {
          message: chatMessage,
          feedback: JSON.stringify(rawFeedback), // Stringify the full feedback object
          chatHistory: chatHistory,
          essay_text: essayText
        };
        
        // Make API call to backend
        const response = await fetch('http://127.0.0.1:5000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error('Network response was not ok: ' + response.status);
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Add AI response to chat
          setChatHistory(prev => [...prev, { user: false, message: data.response }]);
        } else {
          setChatHistory(prev => [...prev, { 
            user: false, 
            message: "Sorry, I encountered an error: " + (data.error || "Unknown error") 
          }]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setChatHistory(prev => [...prev, { 
          user: false, 
          message: "Sorry, there was a problem connecting to the server: " + error.message 
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
            {}

            {/* Detailed Criteria */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Feedback</h2>
              <div className="space-y-4">
              {parsedFeedback && parsedFeedback.criteria && parsedFeedback.criteria.map((criterion, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                <h3 className="text-lg font-semibold text-gray-900">
                    {criterion.name}
                </h3>
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
                      <ReactMarkdown>{msg.message}</ReactMarkdown>
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
                className={`text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
