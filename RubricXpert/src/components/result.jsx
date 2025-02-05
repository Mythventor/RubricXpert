import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ScoreRing from './ScoreRing';

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { feedback, essayName, rubricName } = location.state || {};
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (feedback) {
      // Extract score from $score$ format
      const scoreMatch = feedback.match(/\$(\d+)\$/);
      if (scoreMatch && scoreMatch[1]) {
        setScore(parseInt(scoreMatch[1]));
      }
    }
  }, [feedback]);

  if (!feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No feedback available</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to upload page
          </button>
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
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Upload
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analysis Results</h1>
            {score !== null && <ScoreRing score={score} />}
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">Essay: {essayName}</p>
            <p className="text-sm text-gray-600">Rubric: {rubricName}</p>
          </div>

          <div className="prose max-w-none">
            {/* Format the feedback with proper line breaks */}
            {feedback.split('\n').map((line, index) => (
              <p key={index} className="mb-2">
                {line}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;