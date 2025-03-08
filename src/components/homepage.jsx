import React, { useState } from 'react';
import { Upload, FileText, FileSpreadsheet, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation'; 

const HomePage = () => {
  const navigate = useNavigate();
  const [essayFile, setEssayFile] = useState(null);
  const [rubricFile, setRubricFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingEssay, setIsDraggingEssay] = useState(false);
  const [isDraggingRubric, setIsDraggingRubric] = useState(false);

  const handleEssayUpload = (event) => {
    setEssayFile(event.target.files[0]);
  };

  const handleRubricUpload = (event) => {
    setRubricFile(event.target.files[0]);
  };

  const handleDragOver = (e, setIsDragging) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e, setIsDragging) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e, setFile, setIsDragging) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
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
              speed={50}
              style={{ paddingLeft: '5px' }}
              repeat={Infinity}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            />
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your essay and rubric for instant feedback
          </p>

          {/* Upload Section */}
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full opacity-50 transform translate-x-20 -translate-y-20"></div>
            
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Your Documents</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Essay Upload */}
              <div className="relative">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-600" />
                  Upload Essay
                </h3>
                <label className="block">
                  <div 
                    className={`border-2 ${isDraggingEssay ? 'border-blue-500 bg-blue-50' : essayFile ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300'} rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer`}
                    onDragOver={(e) => handleDragOver(e, setIsDraggingEssay)}
                    onDragLeave={(e) => handleDragLeave(e, setIsDraggingEssay)}
                    onDrop={(e) => handleDrop(e, setEssayFile, setIsDraggingEssay)}
                  >
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleEssayUpload}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    {essayFile ? (
                      <Check className="mx-auto h-10 w-10 text-green-500" />
                    ) : (
                      <Upload className="mx-auto h-10 w-10 text-blue-500" />
                    )}
                    <p className="mt-2 text-sm text-gray-600">
                      {essayFile ? 'File ready' : 'Drop your essay here or click to browse'}
                    </p>
                  </div>
                </label>
                {essayFile && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-md flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    <span className="truncate">{essayFile.name}</span>
                  </div>
                )}
              </div>

              {/* Rubric Upload */}
              <div className="relative">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <FileSpreadsheet className="mr-2 h-5 w-5 text-blue-600" />
                  Upload Rubric
                </h3>
                <label className="block">
                  <div 
                    className={`border-2 ${isDraggingRubric ? 'border-blue-500 bg-blue-50' : rubricFile ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300'} rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer`}
                    onDragOver={(e) => handleDragOver(e, setIsDraggingRubric)}
                    onDragLeave={(e) => handleDragLeave(e, setIsDraggingRubric)}
                    onDrop={(e) => handleDrop(e, setRubricFile, setIsDraggingRubric)}
                  >
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleRubricUpload}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    {rubricFile ? (
                      <Check className="mx-auto h-10 w-10 text-green-500" />
                    ) : (
                      <Upload className="mx-auto h-10 w-10 text-blue-500" />
                    )}
                    <p className="mt-2 text-sm text-gray-600">
                      {rubricFile ? 'File ready' : 'Drop your rubric here or click to browse'}
                    </p>
                  </div>
                </label>
                {rubricFile && (
                  <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-md flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    <span className="truncate">{rubricFile.name}</span>
                  </div>
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