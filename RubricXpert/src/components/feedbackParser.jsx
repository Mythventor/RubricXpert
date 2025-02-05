export function parseFeedback(feedbackText) {
    const criteriaRegex = /\*\*(.+?):\*\*\s*(\d+)\/100[ \t]*\r?\nFeedback:\s*([\s\S]*?)(?=\r?\n\*\*|OVERALL SCORE:|GENERAL FEEDBACK:|$)/g;
  
  let criteria = [];
  let match;
  while ((match = criteriaRegex.exec(feedbackText)) !== null) {
    const name = match[1].trim();
    const score = match[2].trim();
    const feedback = match[3].trim();
    criteria.push({ name, score, feedback });
  }

  // --- Parse Overall Score ---
  // Matches: OVERALL SCORE: $86$
  const overallScoreMatch = feedbackText.match(/OVERALL SCORE:\s*\$(\d+)\$/);
  const overallScore = overallScoreMatch ? overallScoreMatch[1] : null;

  // --- Parse General Feedback ---
  // Matches: GENERAL FEEDBACK: followed by any text until the end.
  const generalFeedbackMatch = feedbackText.match(/GENERAL FEEDBACK:\s*([\s\S]*)$/);
  const generalFeedback = generalFeedbackMatch ? generalFeedbackMatch[1].trim() : null;

  return { overallScore, criteria, generalFeedback };
  }