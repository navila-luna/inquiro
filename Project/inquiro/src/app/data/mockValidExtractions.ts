// src/app/data/mockValidExtractions.ts

// This is the expected JSON structure from our LLM call
// A temporary ID for linking edges, e.g., "kp_1"
export type LlmExtractionResult = {
  knowledgePairs: Array<{
    id: string; 
    question: string;
    answer: string;
    source_message_ids: string[];
  }>;
  knowledgeEdges: Array<{
    sourcePairId: string; 
    targetPairId: string; // Corresponds to a temporary ID above
    relationshipType: 'CLARIFIES' | 'EXPANDS_ON' | 'IS_FOLLOW_UP_TO';
  }>;
};

// Mock data for testing when skipping API calls
export const mockValidExtractions: LlmExtractionResult[] = [
  {
    knowledgePairs: [
      {
        id: "kp_1",
        question: "What are the tax implications of remote work?",
        answer: "Remote work may affect state tax obligations depending on where you work and live.",
        source_message_ids: ["msg_1"]
      },
      {
        id: "kp_2", 
        question: "How do I file for a business license?",
        answer: "Contact your local city hall or county clerk's office for business license requirements.",
        source_message_ids: ["msg_2"]
      },
      {
        id: "kp_3",
        question: "Is the cost of a new office espresso machine for employee use a deductible business expense?",
        answer: "Yes, an office espresso machine used to boost employee morale and productivity is generally a fully deductible business expense. Keep the receipt for your records.",
        source_message_ids: ["msg_3"]
      },
      {
        id: "kp_4",
        question: "What documentation do I need for business expense deductions?",
        answer: "You need receipts, invoices, and proof of business purpose for all deductible expenses. Keep organized records for at least 3 years.",
        source_message_ids: ["msg_4"]
      }
    ],
    knowledgeEdges: [
      {
        sourcePairId: "kp_1",
        targetPairId: "kp_2", 
        relationshipType: "EXPANDS_ON"
      },
      {
        sourcePairId: "kp_3",
        targetPairId: "kp_4",
        relationshipType: "CLARIFIES"
      }
    ]
  }
]; 