// Patterns for detecting if user input is a question
export const questionPatterns = {
  // Non-question patterns (user responses that are not questions)
  nonQuestion: [
    /^(nah|no|nope|not really|i'm good|that's all|thanks|thank you|bye|goodbye|see you|that's it)$/,
    /^(no thanks|no thank you|i don't think so|not right now|maybe later)$/,
    /^(that's all i need|i'm done|that's everything|nothing else)$/
  ],
  
  // Question patterns (user inputs that are questions)
  question: [
    /\?$/, // Ends with question mark
    /^(what|how|why|when|where|who|which|can you|could you|would you|do you|does|is|are|was|were|will|should|might|may)/, // Starts with question words
    /^(tell me|explain|describe|show me|help me|i need|i want to know|i'm looking for)/ // Starts with request phrases
  ]
};

// Patterns for detecting if AI response is not providing an answer
export const nonAnswerPatterns = [
  // Goodbye patterns
  /^(goodbye|bye|see you|take care|have a great day|thanks for chatting)$/,
  
  // Follow-up question patterns
  /^(is there anything else i can help you with\?*|can i help you with anything else\?*|what else can i help you with\?*)$/,
  /^(let me know if you need anything else|feel free to ask if you have more questions)$/,
  /^(i'm here if you need anything else|just let me know if you have other questions)$/,
  
  // "Not enough information" patterns - more flexible matching
  /i don't have enough information/,
  /i don't have sufficient information/,
  /i don't have the information needed/,
  /i don't have enough context/,
  /i don't have enough data/,
  /i'm sorry, but i don't have enough information/,
  /unfortunately, i don't have enough information/,
  /the context doesn't contain the answer/,
  /the provided context doesn't include/,
  /the information isn't available in the context/,
  /i don't have enough information to answer your question/
];

// Helper function to check if user input is a question
export function isQuestion(userQuery: string): boolean {
  const query = userQuery.toLowerCase().trim();
  
  // If it matches non-question patterns, it's not a question
  if (questionPatterns.nonQuestion.some(pattern => pattern.test(query))) {
    return false;
  }
  
  // If it matches question patterns, it is a question
  if (questionPatterns.question.some(pattern => pattern.test(query))) {
    return true;
  }
  
  // Default to true for ambiguous cases (better to show sources than hide them)
  return true;
}

// Helper function to check if AI response is just saying goodbye or asking for more
export function isNonAnswerResponse(aiResponse: string): boolean {
  const response = aiResponse.toLowerCase().trim();
  
  console.log('🔍 Checking response for non-answer patterns:', response);
  
  const isNonAnswer = nonAnswerPatterns.some(pattern => pattern.test(response));
  console.log('🔍 Is non-answer response:', isNonAnswer);
  
  return isNonAnswer;
} 