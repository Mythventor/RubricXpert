import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [essayFile, setEssayFile] = useState(null);
  const [rubricFile, setRubricFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleEssayUpload = (event) => {
    setEssayFile(event.target.files[0]);
  };

  const handleRubricUpload = (event) => {
    setRubricFile(event.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!essayFile || !rubricFile) {
      alert('Please upload both essay and rubric files');
      return;
    }

    setIsLoading(true);
    setProgress(0);

    // Increment progress gradually to 99% over ~6 seconds.
    const incrementInterval = 100; // ms
    const maxProgress = 99;
    const totalTicks = 15000 / incrementInterval; // 60 ticks over 6 seconds
    const incrementAmount = maxProgress / totalTicks;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < maxProgress) {
          return Math.min(prev + incrementAmount, maxProgress);
        }
        return prev;
      });
    }, incrementInterval);

    try {
      const formData = new FormData();
      formData.append('essay', essayFile);
      formData.append('rubric', rubricFile);

      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      // Clear timer, set progress to 100%, and navigate.
      clearInterval(timer);
      setProgress(100);

      if (data.success) {
        navigate('/results', { 
          state: { 
            feedback: data.feedback,
            essayName: essayFile.name,
            rubricName: rubricFile.name,
          },
        });
      } else {
        alert('Analysis failed: ' + data.error);
        setIsLoading(false);
        setProgress(0);
      }
    } catch (error) {
      clearInterval(timer);
      console.error('Error:', error);
      alert('Failed to analyze essay');
      setIsLoading(false);
      setProgress(0);
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Expert Feedback on Your Essays
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your essay and rubric for instant feedback
          </p>

          {/* Upload Section */}
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Essay Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Upload Essay</h3>
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleEssayUpload}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Drop your essay here</p>
                  </div>
                </label>
                {essayFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Essay: {essayFile.name}
                  </p>
                )}
              </div>

              {/* Rubric Upload */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Upload Rubric</h3>
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleRubricUpload}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Drop your rubric here</p>
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
              disabled={isLoading || !essayFile || !rubricFile}
              className={`relative w-full mt-6 py-2 px-4 rounded-md overflow-hidden ${
                isLoading || !essayFile || !rubricFile
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {isLoading ? (
                <>
                  {/* The overlay div fills the button based on progress */}
                  <div
                    className="absolute inset-0 bg-blue-800 opacity-50 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                  <span className="relative z-10">
                    Analyzing... {Math.floor(progress)}%
                  </span>
                </>
              ) : (
                'Analyze Essay'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
