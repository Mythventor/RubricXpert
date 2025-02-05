import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';  

const HomePage = () => {
  const navigate = useNavigate();  
  const [essayFile, setEssayFile] = useState(null);
  const [rubricFile, setRubricFile] = useState(null);

  // Function to handle essay upload
  const handleEssayUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setEssayFile(uploadedFile);
  };

  // Function to handle rubric upload
  const handleRubricUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setRubricFile(uploadedFile);
  };

  // Function to handle analysis
  const handleAnalyze = async () => {
    if (!essayFile || !rubricFile) {
      alert('Please upload both essay and rubric files');
      return;
    }
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
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Essay Upload Box */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Upload Essay</h3>
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleEssayUpload}
                      accept=".pdf,.doc,.docx"
                    />
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drop your essay here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX
                    </p>
                  </div>
                </label>
                {essayFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Essay: {essayFile.name}
                  </p>
                )}
              </div>

              {/* Rubric Upload Box */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Upload Rubric</h3>
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleRubricUpload}
                      accept=".pdf,.doc,.docx"
                    />
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drop your rubric here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX
                    </p>
                  </div>
                </label>
                {rubricFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Rubric: {rubricFile.name}
                  </p>
                )}
              </div>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={!essayFile || !rubricFile}
              className={`w-full mt-6 py-2 px-4 rounded-md ${
                (!essayFile || !rubricFile)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
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