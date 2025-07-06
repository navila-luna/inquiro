import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: knowledgePairId } = await params;

    // Get the knowledge pair and its source messages
    const knowledgePair = await prisma.knowledgePair.findUnique({
      where: { id: knowledgePairId },
      include: {
        sourceMessages: {
          include: {
            message: {
              include: {
                author: true,
                thread: true
              }
            }
          }
        }
      }
    });

    if (!knowledgePair) {
      return new Response('Knowledge pair not found', { status: 404 });
    }

    // Get all messages from the thread(s) that contain the source messages
    const threadIds = [...new Set(knowledgePair.sourceMessages.map(s => s.message.threadId))];
    
    const threads = await prisma.thread.findMany({
      where: { id: { in: threadIds } },
      include: {
        messages: {
          include: {
            author: true
          },
          orderBy: {
            sentAt: 'asc'
          }
        }
      }
    });

    // Create HTML response
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Original Email Thread - ${knowledgePair.question}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: #2563eb; color: white; padding: 20px; }
          .header h1 { margin: 0; font-size: 1.5rem; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .knowledge-summary { background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; }
          .knowledge-summary h2 { margin: 0 0 15px 0; color: #1e293b; font-size: 1.2rem; }
          .qa-pair { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin-bottom: 15px; }
          .qa-pair strong { color: #374151; }
          .threads { padding: 20px; }
          .thread { margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .thread-header { background: #f1f5f9; padding: 15px; border-bottom: 1px solid #e2e8f0; }
          .thread-header h3 { margin: 0; color: #1e293b; }
          .message { padding: 15px; border-bottom: 1px solid #f1f5f9; }
          .message:last-child { border-bottom: none; }
          .message-header { margin-bottom: 10px; font-size: 0.9rem; color: #64748b; }
          .message-content { line-height: 1.6; color: #1e293b; white-space: pre-wrap; }
          .highlight { background: #fef3c7; padding: 2px 4px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Original Email Thread</h1>
            <p>Knowledge Pair ID: ${knowledgePairId}</p>
          </div>
          
          <div class="knowledge-summary">
            <h2>Knowledge Extracted</h2>
            <div class="qa-pair">
              <strong>Question:</strong> ${knowledgePair.question}<br>
              <strong>Answer:</strong> ${knowledgePair.answer}
            </div>
          </div>
          
          <div class="threads">
            ${threads.map(thread => `
              <div class="thread">
                <div class="thread-header">
                  <h3>Thread: ${thread.subject}</h3>
                </div>
                ${thread.messages.map(message => `
                  <div class="message">
                    <div class="message-header">
                      <strong>From:</strong> ${message.author.email} | 
                      <strong>Date:</strong> ${message.sentAt.toLocaleString()} | 
                      <strong>Message ID:</strong> ${message.originalMessageId}
                    </div>
                    <div class="message-content">${message.content}</div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[SOURCE API ERROR]', error);
    return new Response('An error occurred while fetching the source.', { status: 500 });
  }
} 