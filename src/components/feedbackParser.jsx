export function parseFeedback(feedbackData) {
  // Return default values if no feedback data is provided
  if (!feedbackData || !feedbackData.results || !Array.isArray(feedbackData.results)) {
    console.error("Invalid feedback data format:", feedbackData);
    return {
      overallScore: 0,
      criteria: [],
      generalFeedback: "No feedback data available."
    };
  }

  try {
    const results = feedbackData.results;
    
    // Calculate overall score as average of all scores
    const validScores = results.filter(item => item.score !== null && !isNaN(item.score));
    const overallScore = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, item) => sum + item.score, 0) / validScores.length * 25) // Scale to 100 (assuming scores are 1-4)
      : 0;
    
    // Format criteria
    const criteria = results.map(item => ({
      name: item.criterion || "Unnamed Criterion",
      score: item.score !== null && !isNaN(item.score) ? item.score * 25 : 0, // Scale to 100 (assuming 1-4 scale)
      feedback: item.feedback || ""
    }));
    
    // Use the combined feedback as general feedback
    let generalFeedback = "Overall Assessment:\n\n";
    if (criteria.length > 0) {
      generalFeedback += `This essay scored ${overallScore} out of 100 across ${criteria.length} criteria. `;
      
      // Add strengths and weaknesses
      const strengths = criteria.filter(c => c.score >= 75).map(c => c.name);
      const weaknesses = criteria.filter(c => c.score <= 50).map(c => c.name);
      
      if (strengths.length > 0) {
        generalFeedback += `Strengths include ${strengths.join(', ')}. `;
      }
      
      if (weaknesses.length > 0) {
        generalFeedback += `Areas for improvement include ${weaknesses.join(', ')}.`;
      }
    }
    
    return {
      overallScore,
      criteria,
      generalFeedback
    };
  } catch (error) {
    console.error("Error parsing feedback:", error);
    return {
      overallScore: 0,
      criteria: [],
      generalFeedback: "There was an error parsing the feedback. Please try again."
    };
  }
}