export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  title: string;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: ChatMessage;
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: Record<string, boolean>;
  error: Error | null;
  status: 'connecting' | 'connected' | 'disconnected';
}

export interface ChatWebSocketMessage {
  type: 'message' | 'typing_start' | 'typing_end' | 'message_status';
  payload: any;
}

export interface ChatOptions {
  onError?: (error: Error) => void;
  onStatusChange?: (status: ChatState['status']) => void;
  onMessageReceived?: (message: ChatMessage) => void;
}
