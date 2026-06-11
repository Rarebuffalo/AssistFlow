import { ChatRepository } from '../repositories/chatRepository';
import { KnowledgeService } from './knowledgeService';
import { LLMProvider, LLMMessage } from '../types/llm';
import { randomUUID } from 'crypto';

export class ConversationService {
  private chatRepository: ChatRepository;
  private knowledgeService: KnowledgeService;
  private llmProvider: LLMProvider;

  constructor(
    chatRepository: ChatRepository,
    knowledgeService: KnowledgeService,
    llmProvider: LLMProvider
  ) {
    this.chatRepository = chatRepository;
    this.knowledgeService = knowledgeService;
    this.llmProvider = llmProvider;
  }

  async handleMessage(messageText: string, sessionId?: string) {
    let conversationId = sessionId;
    let isNew = false;
    let title = 'New Chat';

    // 1. Get or Create Conversation
    if (!conversationId) {
      conversationId = randomUUID();
      isNew = true;
      title = messageText.trim().slice(0, 40);
      if (messageText.length > 40) {
        title += '...';
      }
      await this.chatRepository.createConversation(conversationId, title);
    } else {
      const conv = await this.chatRepository.getConversation(conversationId);
      if (!conv) {
        // Fallback if client passed a session ID that doesn't exist
        isNew = true;
        title = messageText.trim().slice(0, 40);
        if (messageText.length > 40) {
          title += '...';
        }
        await this.chatRepository.createConversation(conversationId, title);
      } else {
        title = conv.title;
      }
    }

    // 2. Save User Message to DB
    await this.chatRepository.saveMessage(conversationId, 'user', messageText);

    // 3. Fetch FAQ context based on user message
    const faqContext = await this.knowledgeService.getFAQContext(messageText);
    const systemPrompt = this.knowledgeService.getSystemPrompt(faqContext);

    // 4. Retrieve recent message history (up to last 10 messages for context)
    const recentMessages = await this.chatRepository.getRecentMessages(conversationId, 10);

    // 5. Construct full message list for LLM context
    const llmHistory: LLMMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of recentMessages) {
      llmHistory.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    // 6. Generate AI response from provider
    let aiReply = '';
    try {
      aiReply = await this.llmProvider.generateReply(llmHistory);
    } catch (error: any) {
      console.error('[ConversationService] Error calling LLM Provider:', error);
      // Friendly user fallback error
      aiReply = "The AI service is temporarily unavailable. Please try again in a few moments.";
      // Save user-friendly error to DB so history remains consistent
      await this.chatRepository.saveMessage(conversationId, 'ai', aiReply);
      return {
        reply: aiReply,
        sessionId: conversationId,
        conversationTitle: title,
        error: true
      };
    }

    // 7. Save AI Message to DB
    await this.chatRepository.saveMessage(conversationId, 'ai', aiReply);

    return {
      reply: aiReply,
      sessionId: conversationId,
      conversationTitle: title,
      error: false
    };
  }

  async getHistory(sessionId: string) {
    const conversation = await this.chatRepository.getConversation(sessionId);
    if (!conversation) {
      return {
        messages: [],
        sessionId,
        title: 'New Chat'
      };
    }

    return {
      messages: conversation.messages,
      sessionId: conversation.id,
      title: conversation.title
    };
  }

  async getConversations() {
    return this.chatRepository.getAllConversations();
  }
}
