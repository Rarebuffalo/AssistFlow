const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  messages: Message[];
  sessionId: string;
  title: string;
}

export interface ChatMessageResponse {
  reply: string;
  sessionId: string;
  conversationTitle: string;
  error?: boolean;
}

export interface ConversationItem {
  id: string;
  title: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
}

export class ChatApi {
  static async sendMessage(message: string, sessionId?: string): Promise<ChatMessageResponse> {
    try {
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message.');
      }

      return await response.json();
    } catch (error: any) {
      console.error('[ChatApi] Error sending message:', error);
      throw error;
    }
  }

  static async fetchHistory(sessionId: string): Promise<ChatHistoryResponse> {
    try {
      const response = await fetch(`${API_BASE}/chat/history/${sessionId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch conversation history.');
      }

      return await response.json();
    } catch (error: any) {
      console.error('[ChatApi] Error fetching history:', error);
      throw error;
    }
  }

  static async fetchConversations(): Promise<ConversationItem[]> {
    try {
      const response = await fetch(`${API_BASE}/chat/conversations`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch conversations.');
      }

      return await response.json();
    } catch (error: any) {
      console.error('[ChatApi] Error fetching conversations:', error);
      throw error;
    }
  }
}
