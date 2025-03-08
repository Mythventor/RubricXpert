import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation'; 

const HomePage = () => {
  const navigate = useNavigate();
  const [essayFile, setEssayFile] = useState(null);
  const [rubricFile, setRubricFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('essay', essayFile);
      formData.append('rubric', rubricFile);

      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        navigate('/results', { 
          state: { 
            feedback: data.feedback,
            essayName: essayFile.name,
            rubricName: rubricFile.name
          } 
        });
      } else {
        alert('Analysis failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze essay');
    } finally {
      setIsLoading(false);
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
          <div className='inline-block mb-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium'>AI-Powered Essay Analysis</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get Expert Feedback on Your
            <TypeAnimation
              sequence={[
                ' Essays',
                2000, // wait 2s
                ' Research Papers',
                2000, // wait 2s
                ' Personal Statements',
                2000, // wait 2s
              ' Cover Letters',
                2000, // wait 2s
              ' Academic Writing',
                2000 // wait 2s
                ]}
      wrapper="span"
      speed={25}
      style={{ paddingLeft: '5px' }}
      repeat={Infinity}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
      />
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
                    <p className="mt-2 text-sm text-gray-600">Upload your essay here</p>
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
                    <p className="mt-2 text-sm text-gray-600">Upload your rubric here</p>
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
              className={`w-full mt-6 py-2 px-4 rounded-md ${
                isLoading || !essayFile || !rubricFile
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {isLoading ? 'Analyzing...' : 'Analyze Essay'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;