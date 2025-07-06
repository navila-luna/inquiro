import { PrismaClient } from '@prisma/client';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
import { mockValidExtractions, LlmExtractionResult } from '../data/mockValidExtractions';

// --- INITIALIZE CLIENTS ---
const prisma = new PrismaClient();
const pinecone = new Pinecone();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Set to true to skip API calls and use mock data for testing
const SKIP_API_CALLS = process.env.SKIP_API_CALLS === 'true' || process.env.NODE_ENV === 'test';
// Set to true to skip Pinecone operations for testing
const SKIP_PINECONE = process.env.SKIP_PINECONE === 'true';

const PINECONE_INDEX_NAME = 'knowledge-base-index';
// const GPT_MODEL = 'gpt-4o';
// const EMBEDDING_MODEL = 'text-embedding-3-small';

// Using Google's embedding model for extraction and embedding because its free
const EXTRACTION_MODEL = 'gemini-1.5-flash';
const EMBEDDING_MODEL = 'text-embedding-004'; 


type RawMessage = { id: string; sender: string; recipient: string; date: string; content: string };
type RawThread = { id: string; subject: string; messages: RawMessage[] };

// Type for the processor function result (unused since we made the function generic)
type _ProcessorResult = LlmExtractionResult | null;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to process with rate limiting
// 4 seconds between requests (15 per minute = 4 seconds each)
async function processWithRateLimit<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  delayMs: number = 4000,
  batchSize: number = 1
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const index = i + j;
      
      try {
        const result = await processor(item, index);
        results.push(result);
        
        // Add delay between requests (except for the last one)
        if (index < items.length - 1) {
          await delay(delayMs);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to process item ${index}:`, errorMessage);
        // For embeddings, we'll push null and filter later
        results.push(null as R);
      }
    }
  }
  
  return results;
}

// --- MAIN SEEDING FUNCTION ---
async function main() {
  console.log('🌱 Starting the seeding process...');

  try {
    // 1. READ RAW DATA FROM JSON FILE
    const dataPath = path.join(process.cwd(), 'src/app/data/emails.json');
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const rawThreads: RawThread[] = JSON.parse(fileContent);
    console.log(`📄 Read ${rawThreads.length} threads from emails.json`);
    

    // 2. EXTRACT KNOWLEDGE USING GOOGLE'S GEMINI (WITH RATE LIMITING)
    let validExtractions: LlmExtractionResult[];
    
    if (SKIP_API_CALLS) {
      console.log('🚫 Skipping API calls - using mock data for testing');
      validExtractions = mockValidExtractions;
      console.log(`📝 Using ${validExtractions.length} mock extractions for testing`);
    } else {
      console.log(`🤖 🤖 Extracting knowledge from threads using ${EXTRACTION_MODEL}...`);
      const model = genAI.getGenerativeModel({ model: EXTRACTION_MODEL });
      
      /* 
          Process a limited number of threads to avoid quota issues.
          We'll process 5 threads which should give us good coverage without hitting limits.
          TODO: Add a layer of caching to avoid re-extracting the same knowledge pairs.
      */
      const threadsToProcess = rawThreads.slice(0, 5);
      console.log(`📝 Processing ${threadsToProcess.length} threads (limited for quota management)`);
      
      const allExtractions = await processWithRateLimit(
        threadsToProcess,
        async (thread: RawThread, _index: number) => {
          const formattedThread = thread.messages
            .map((msg) => `From: ${msg.sender}\nTo: ${msg.recipient}\nDate: ${msg.date}\nMessage ID: ${msg.id}\n\n${msg.content}`)
            .join('\n\n---\n\n');

          const systemPrompt = `
            You are an expert data analyst. Your task is to analyze an email thread and extract structured knowledge.
            Extract all distinct Question-Answer pairs. Also, identify relationships between these pairs.
            - The question should be a concise, well-phrased version of the client's query.
            - The answer should be a clear, synthesized answer from the firm.
            - Be aware that the person who answers may not be the original recipient.
            - A single thread can contain multiple, unrelated Q&A pairs.
            - Identify if one Q&A pair clarifies, expands on, or is a follow-up to another pair within the same thread.

            Respond with a single, valid JSON object matching this structure:
            {
              "knowledgePairs": [
                { "id": "kp_1", "question": "...", "answer": "...", "source_message_ids": ["msg_id_1"] }
              ],
              "knowledgeEdges": [
                { "sourcePairId": "kp_1", "targetPairId": "kp_2", "relationshipType": "CLARIFIES" }
              ]
            }
          `;

          try {
            const result = await model.generateContent([
              systemPrompt,
              formattedThread
            ]);
            const response = await result.response;
            const text = response.text();
            
            // Extract JSON from the response (Gemini might wrap it in markdown)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]) as LlmExtractionResult;
            } else {
              console.error(`❌ Failed to extract JSON from response for thread ${thread.id}`);
              return null;
            }
          } catch (error) {
            console.error(`❌ Failed to process thread ${thread.id}:`, error);
            return null;
          }
        },
        // 4 seconds delay between requests
        4000, 
        1 // Process one at a time
      );

      validExtractions = allExtractions.filter((extraction): extraction is LlmExtractionResult => extraction !== null);
      console.log(`Extracted knowledge from ${validExtractions.length} threads.`);
    }

    // 3. POPULATE POSTGRESQL DATABASE
    console.log('🐘 Populating PostgreSQL database...');
    
    // Clear all existing data first
    console.log('   -> 🗑️ Clearing old data...');
    await prisma.knowledgeEdge.deleteMany();
    await prisma.knowledgePairSource.deleteMany();
    await prisma.knowledgePair.deleteMany();
    await prisma.message.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.user.deleteMany();

    // Determine which threads to process for database population
    const threadsToProcess = SKIP_API_CALLS ? rawThreads.slice(0, 1) : rawThreads.slice(0, 5);

    // Create Users, Threads, and Messages
    const userEmails = new Set<string>(threadsToProcess.flatMap((t: RawThread) => t.messages.flatMap((m: RawMessage) => [m.sender, m.recipient])));
    await prisma.user.createMany({ data: Array.from(userEmails).map((email) => ({ email })) });
    
    const users = await prisma.user.findMany();
    const userEmailToIdMap = new Map(users.map((u) => [u.email, u.id]));

    for (const thread of threadsToProcess) {
      await prisma.thread.create({ data: { id: thread.id, subject: thread.subject }});
      for (const message of thread.messages) {
        await prisma.message.create({
          data: {
            originalMessageId: message.id,
            content: message.content,
            sentAt: new Date(message.date),
            authorId: userEmailToIdMap.get(message.sender)!,
            threadId: thread.id,
          },
        });
      }
    }
    
    const messages = await prisma.message.findMany();
    const originalMsgIdToDbIdMap = new Map(messages.map((m) => [m.originalMessageId, m.id]));
    
    // Create KnowledgePairs and Edges
    const tempKpIdToDbIdMap = new Map<string, string>();
    for (const extraction of validExtractions) {
      for (const kp of extraction.knowledgePairs) {
        const newKp = await prisma.knowledgePair.create({
          data: {
            question: kp.question,
            answer: kp.answer,
          }
        });
        tempKpIdToDbIdMap.set(kp.id, newKp.id);
        
        // Create junction table records for source messages
        for (const sourceMessageId of kp.source_message_ids) {
          const dbMessageId = originalMsgIdToDbIdMap.get(sourceMessageId);
          if (dbMessageId) {
            await prisma.knowledgePairSource.create({
              data: {
                messageId: dbMessageId,
                knowledgePairId: newKp.id,
              }
            });
          }
        }
      }
      for (const edge of extraction.knowledgeEdges) {
        await prisma.knowledgeEdge.create({
          data: {
            sourcePairId: tempKpIdToDbIdMap.get(edge.sourcePairId)!,
            targetPairId: tempKpIdToDbIdMap.get(edge.targetPairId)!,
            relationshipType: edge.relationshipType,
          }
        })
      }
    }
    console.log('PostgreSQL populated successfully.');

    // 4. POPULATE PINECONE VECTOR DATABASE
    if (SKIP_PINECONE) {
      console.log('🚫 Skipping Pinecone operations - using mock mode for testing');
    } else {
      console.log('🌲 🌲 Populating Pinecone vector database...');
      
      // Check if index exists and is ready
      let indexExists = false;
      try {
        const indexDescription = await pinecone.describeIndex(PINECONE_INDEX_NAME);
        if (indexDescription.status?.state === 'Ready') {
          console.log(`   -> ✅ Index '${PINECONE_INDEX_NAME}' already exists and is ready`);
          indexExists = true;
        } else {
          console.log(`   -> ⏳ Index '${PINECONE_INDEX_NAME}' exists but is not ready (state: ${indexDescription.status?.state})`);
          console.log('   -> ⏳ Waiting for index to be ready...');
          // Wait for index to be ready (max 2 minutes)
          for (let i = 0; i < 12; i++) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            const status = await pinecone.describeIndex(PINECONE_INDEX_NAME);
            if (status.status?.state === 'Ready') {
              console.log(`   -> ✅ Index '${PINECONE_INDEX_NAME}' is now ready`);
              indexExists = true;
              break;
            }
            console.log(`   -> ⏳ Still waiting... (${i + 1}/12)`);
          }
          if (!indexExists) {
            console.log('   -> ⚠️ Index is taking longer than expected to be ready, proceeding anyway...');
            indexExists = true; // Proceed anyway
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('404') || errorMessage.includes('404')) {
          console.log(`   -> 🔨 Index '${PINECONE_INDEX_NAME}' does not exist, creating it...`);
          try {
          /* 
            NOTE: Would've optimized my latency by using US-East-2 to match Neon db AWS region
            But its not part of the free tier, so I'm using US-East-1 for now. 
          */
            await pinecone.createIndex({
              name: PINECONE_INDEX_NAME,
              dimension: 768, 
              metric: 'cosine',
              spec: {
                serverless: {
                  cloud: 'aws',
                  region: 'us-east-1' 
                }
              }
            });
            console.log(`   -> ✅ Index '${PINECONE_INDEX_NAME}' created successfully`);
            
            // Wait for index to be ready
            console.log('   -> ⏳ Waiting for index to be ready...');
            for (let i = 0; i < 12; i++) {
              await new Promise(resolve => setTimeout(resolve, 10000));
              try {
                const status = await pinecone.describeIndex(PINECONE_INDEX_NAME);
                if (status.status?.state === 'Ready') {
                  console.log(`   -> ✅ Index '${PINECONE_INDEX_NAME}' is ready`);
                  indexExists = true;
                  break;
                }
                console.log(`   -> ⏳ Still waiting... (${i + 1}/12)`);
              } catch (_waitError: unknown) {
                console.log(`   -> ⏳ Still initializing... (${i + 1}/12)`);
              }
            }
            if (!indexExists) {
              console.log('   -> ⚠️ Index creation is taking longer than expected, proceeding anyway...');
              indexExists = true;
            }
          } catch (createError: unknown) {
            const createErrorMessage = createError instanceof Error ? createError.message : String(createError);
            console.error(`   -> ❌ Index creation failed: ${createErrorMessage}`);
            throw createError;
          }
        } else {
          console.error(`   -> ❌ Unexpected error checking index: ${errorMessage}`);
          throw error;
        }
      }
    
    const knowledgePairsFromDb = await prisma.knowledgePair.findMany();
    const textsToEmbed = knowledgePairsFromDb.map((kp) => `Question: ${kp.question}\nAnswer: ${kp.answer}`);
    
    console.log(`   -> ✍️ Creating embeddings for ${textsToEmbed.length} knowledge pairs...`);
    
    // Use Google's embedding model with rate limiting to avoid going above quota
    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    
    // 4 seconds delay between requests, processing one at a time to avoid going above quota
    type EmbeddingResult = { values: number[] } | null;
    const embeddings = await processWithRateLimit<string, EmbeddingResult>(
      textsToEmbed,
      async (text: string, _index: number) => {
        try {
          const result = await embeddingModel.embedContent(text);
          return result.embedding as { values: number[] };
        } catch (_error) {
          console.error(`❌ Failed to create embedding for text: ${text.substring(0, 100)}...`);
          return null;
        }
      },
      4000,
      1
    );

    const vectors = embeddings
      .map((embedding, index) => {
        if (!embedding) return null;
        return {
          id: knowledgePairsFromDb[index].id,
          values: embedding.values,
          metadata: {
            question: knowledgePairsFromDb[index].question,
          },
        };
      })
      .filter((vector): vector is NonNullable<typeof vector> => vector !== null);

    const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

      console.log(`   -> 📤 Upserting ${vectors.length} vectors to Pinecone...`);
      // Upsert vectors in batches for efficiency
      for (let i = 0; i < vectors.length; i += 100) {
          const batch = vectors.slice(i, i + 100);
          await pineconeIndex.upsert(batch);
      }
      console.log('Pinecone populated successfully.');
    }

  } catch (error) {
    console.error('An error occurred during the seeding process:', error);
    process.exit(1);
  } finally {
    // Ensure Prisma Client is disconnected
    await prisma.$disconnect();
    console.log('🔚 Seeding process finished.');
  }
}

// --- EXECUTE THE SCRIPT ---
main();