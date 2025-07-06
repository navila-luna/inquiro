import { PrismaClient } from '@prisma/client';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isQuestion, isNonAnswerResponse } from '@/app/lib/patterns';


// --- INITIALIZE CLIENTS ---
const prisma = new PrismaClient();
const pinecone = new Pinecone();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// --- DEFINE CONSTANTS ---
const PINECONE_INDEX_NAME = 'knowledge-base-index';
const SYNTHESIS_MODEL_NAME = 'gemini-1.5-flash';
const EMBEDDING_MODEL_NAME = 'text-embedding-004';

// Using Node.js runtime for Pinecone compatibility
export const runtime = 'nodejs';

// Main API POST handler
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userQuery = messages[messages.length - 1].content;

    // Check if user input is a question
    const userIsAskingQuestion = isQuestion(userQuery);

    // 1. Create Embedding for the user's query
    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL_NAME });
    const embeddingResult = await embeddingModel.embedContent(userQuery);
    const queryVector = embeddingResult.embedding.values;

    // 2. Vector Search in Pinecone, retrieve the top 5 most similar results
    const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
    const queryResponse = await pineconeIndex.query({
      topK: 5,
      vector: queryVector,
      includeMetadata: true,
    });

    // 3. Fetch Context from PostgreSQL using Prisma
    const knowledgePairIds = queryResponse.matches.map((match) => match.id);
    const context = await prisma.knowledgePair.findMany({
      where: {
        id: { in: knowledgePairIds },
      },
      // We could also include source messages here if needed later
    });

    // 4. Synthesize and Stream the response
    const formattedContext = context
      .map((kp) => `Question: ${kp.question}\nAnswer: ${kp.answer}`)
      .join('\n\n---\n\n');
    
    const systemPrompt = `
      You are Inquiro, an expert AI assistant. Your task is to provide a direct, synthesized answer to the user's question based *only* on the provided context from a knowledge base.
      - Do not use any outside knowledge.
      - If the context does not contain the answer, state that you don't have enough information.
      - Be concise and helpful.
      - After providing the answer, ask if you can help with anything else. 
      - If the user says no, say goodbye.
      - If the user says yes, ask them what else you can help with.
    `;

    const synthesisModel = genAI.getGenerativeModel({ model: SYNTHESIS_MODEL_NAME });
    const result = await synthesisModel.generateContent({
        contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nCONTEXT:\n${formattedContext}\n\nUSER'S QUESTION:\n${userQuery}` }]
        }]
    });

    const response = await result.response;
    const text = response.text();

    // Debug logging
    console.log('🔍 AI Response:', text);
    console.log('🔍 User is asking question:', userIsAskingQuestion);
    
    // Check if AI response is just saying goodbye or asking for more
    const aiIsProvidingAnswer = !isNonAnswerResponse(text);
    console.log('🔍 AI is providing answer:', aiIsProvidingAnswer);
    
    // Only provide sources if user is asking a question AND AI is providing an answer
    const shouldProvideSources = userIsAskingQuestion && aiIsProvidingAnswer;
    console.log('🔍 Should provide sources:', shouldProvideSources);

    // Return response with conditional source data
    const responseData = {
      text: text,
      sources: shouldProvideSources ? context.map(kp => ({
        question: kp.question,
        answer: kp.answer,
        id: kp.id
      })) : []
    };

    return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[SEARCH API ERROR]', error);
    return new Response('An error occurred. Please try again.', { status: 500 });
  }
}