'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal } from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { useRef, useEffect, useState } from 'react';
import { Message } from '@/app/types/chat';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  console.log('Messages:', messages);
  console.log('Is loading:', isLoading);

  // Automatically scroll to the bottom of the chat
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [userMessage] })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.text,
          sources: data.sources
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('API request failed');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl h-full flex flex-col shadow-lg">
        <CardContent className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.length > 0 ? (
              messages.map((m) => <ChatMessage key={m.id} message={m} />)
            ) : (
              <div className="flex justify-center items-center h-full">
                <div className="text-center p-4 rounded-lg">
                  <h1 className="text-2xl font-semibold">Inquiro</h1>
                  <p className="text-muted-foreground mt-1">
                    Ask a question about your unique knowledge base.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              className="flex-1"
            />
            <Button type="submit" disabled={!input}>
              <SendHorizonal className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}