// src/components/chat-message.tsx

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Message, Source } from '@/app/types/chat';

export function ChatMessage({ message }: { message: Message }) {
  // Get sources from the message
  const sources: Source[] = message.sources || [];
  const isAssistant = message.role === 'assistant';

  /*
    Credits to the free icon from Icons8:
    <a target="_blank" href="https://icons8.com/icon/22396/user">User</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
  */
  return (
    <div className={`flex items-start gap-4 pr-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <Avatar className="w-8 h-8 border">
          <AvatarImage src="/inquiro-logo.png" alt="Inquiro" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`space-y-2 overflow-hidden ${isAssistant ? 'max-w-[80%]' : 'max-w-[80%]'}`}>
        <div className={`prose prose-slate prose-sm dark:prose-invert max-w-none ${
          isAssistant 
            ? 'bg-blue-500 text-white p-3 rounded-lg rounded-bl-none'
            : 'bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-br-none'
        }`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>

        {isAssistant && sources && sources.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="sources">
              <AccordionTrigger className="text-sm">Sources ({sources.length})</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  {sources.map((source, index) => (
                    <Card key={source.id} className="bg-slate-50 dark:bg-slate-900 border-l-4 border-blue-500">
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-semibold">Source {index + 1}</CardTitle>
                          <button 
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() => window.open(`/api/source/${source.id}`, '_blank')}
                          >
                            View Original Thread
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Client Query:</span>
                            <p className="mt-1 text-gray-900 dark:text-gray-100">{source.question}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Firm Answer:</span>
                            <p className="mt-1 text-gray-900 dark:text-gray-100">{source.answer}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
      
      {!isAssistant && (
        <Avatar className="w-8 h-8 border">
          <AvatarImage src="/user-icon.png" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}