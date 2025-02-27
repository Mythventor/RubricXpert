export function parseFeedback(feedbackText) {
  // Return default values if no feedback text is provided
  if (!feedbackText) {
    return {
      overallScore: 0,
      criteria: [],
      generalFeedback: ""
    };
  }

  try {
    const criteriaRegex = /\*\*(.+?):\*\*\s*(\d+)\/100[ \t]*\r?\nFeedback:\s*([\s\S]*?)(?=\r?\n\*\*|OVERALL SCORE:|GENERAL FEEDBACK:|$)/g;
    
    let criteria = [];
    let match;
    while ((match = criteriaRegex.exec(feedbackText)) !== null) {
      const name = match[1].trim();
      const score = parseInt(match[2].trim(), 10); // Convert to number
      const feedback = match[3].trim();
      criteria.push({ name, score, feedback });
    }

    // --- Parse Overall Score ---
    // Matches: OVERALL SCORE: $86$
    const overallScoreMatch = feedbackText.match(/OVERALL SCORE:\s*\$(\d+)\$/);
    const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : 0;

    // --- Parse General Feedback ---
    // Matches: GENERAL FEEDBACK: followed by any text until the end.
    const generalFeedbackMatch = feedbackText.match(/GENERAL FEEDBACK:\s*([\s\S]*)$/);
    const generalFeedback = generalFeedbackMatch ? generalFeedbackMatch[1].trim() : "";

    return { 
      overallScore, 
      criteria, 
      generalFeedback 
    };
  } catch (error) {
    console.error("Error parsing feedback:", error);
    
    // Return a default structure in case of parsing errors
    return {
      overallScore: 0,
      generalFeedback: "There was an error parsing the feedback. Please try again.",
      criteria: []
    };
  }
}