import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';  

const HomePage = () => {
  const navigate = useNavigate();  
  const [file, setFile] = useState(null);  

  // Function to handle file upload
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
  };

  // Function to handle analysis
  const handleAnalyze = async () => {
    // 1. Validate if a file is uploaded
    // 2. Send the file to your backend/API
    // 3. Wait for the response
    // 4. Navigate to results page

    // For now, we'll just navigate to the results page
    navigate('/results');
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
              <a href="/#about" className="text-gray-600 hover:text-blue-600">About Us</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Contact Us</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Expert Feedback on Your Essays
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your essay and rubric, and let our AI provide detailed feedback and suggestions
          </p>

          {/* Upload Section */}
          <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx"
                  />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drag and drop your files here, or click to select files
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
              </label>
              {file && (
                <p className="mt-2 text-sm text-green-600">
                  File selected: {file.name}
                </p>
              )}
            </div>
            <button 
              onClick={handleAnalyze}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Analyze Essay
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Instant Feedback</h3>
              <p className="text-gray-600">Get detailed analysis and suggestions in seconds</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Rubric Aligned</h3>
              <p className="text-gray-600">Feedback matched perfectly to your requirements</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Easy to Use</h3>
              <p className="text-gray-600">Simple upload and analyze process</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;