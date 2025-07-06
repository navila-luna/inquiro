export type Source = {
  question: string;
  answer: string;
  id: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

export type ChatState = {
  messages: Message[];
  isLoading: boolean;
  error?: string;
}; 