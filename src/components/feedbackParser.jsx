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

    // Calculate overall score as average of final_summary.overall_score values
    const validScores = results.filter(
      item =>
        item.final_summary &&
        item.final_summary.overall_score !== null &&
        !isNaN(item.final_summary.overall_score)
    );
    const overallScore =
      validScores.length > 0
        ? Math.round(
            validScores.reduce((sum, item) => sum + item.final_summary.overall_score, 0) /
              validScores.length *
              25 // Scale to 100 (assuming scores are 1-4)
          )
        : 0;

    // Format criteria from each feedback item
    const criteria = results.map(item => {
      const final = item.final_summary || {};
      return {
        name: final.criterion || item.criterion || "Unnamed Criterion",
        score:
          final.overall_score !== null && !isNaN(final.overall_score)
            ? final.overall_score * 25 // Scale to 100 (assuming 1-4)
            : 0,
        feedback: final.summary_feedback || ""
      };
    });

    // Construct a general feedback string that includes strengths, weaknesses, and detailed feedback
    let generalFeedback = "Overall Assessment:\n\n";
    if (criteria.length > 0) {
      const strengths = criteria.filter(c => c.score >= 75).map(c => c.name);
      const weaknesses = criteria.filter(c => c.score < 75).map(c => c.name);

      if (strengths.length > 0) {
        generalFeedback += `Strengths include ${strengths.join(', ')}. `;
      }
      if (weaknesses.length > 0) {
        generalFeedback += `Areas for improvement include ${weaknesses.join(', ')}.`;
      }
      generalFeedback += "\n\nDetailed Feedback:\n";
      criteria.forEach(c => {
        generalFeedback += `- ${c.name}: ${c.feedback}\n`;
      });
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
