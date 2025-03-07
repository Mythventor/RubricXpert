export function parseFeedback(feedbackData) {
  // Return default values if no feedback data is provided
  if (!feedbackData) {
    return {
      overallScore: 0,
      criteria: [],
      generalFeedback: ""
    };
  }

  try {
    // Regex to extract blocks in the format:
    // **Block Name**: [score]/100
    // Feedback: [feedback text]
    const regex = /\*\*(.*?)\*\*\s*:\s*(\d+)[\/]?100\s*[\r\n]+Feedback:\s*([\s\S]*?)(?=\*\*|$)/g;
    let blocks = [];
    let match;
    
    while ((match = regex.exec(feedbackData)) !== null) {
      const name = match[1].trim();
      const score = parseInt(match[2].trim(), 10);
      const feedback = match[3].trim();
      blocks.push({ name, score, feedback });
    }
    
    if (blocks.length === 0) {
      return {
        overallScore: 0,
        criteria: [],
        generalFeedback: ""
      };
    }
    
    // The first block is the overall analysis
    const overallAnalysis = blocks[0];
    // The remaining blocks are individual criteria feedback
    const criteria = blocks.slice(1);
    
    return {
      overallScore: overallAnalysis.score,
      criteria,
      generalFeedback: overallAnalysis.feedback
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
