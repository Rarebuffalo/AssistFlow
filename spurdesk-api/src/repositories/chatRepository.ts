import prisma from '../db/prisma';

export class ChatRepository {
  async createConversation(id: string, title: string) {
    return prisma.conversation.create({
      data: {
        id,
        title,
        channel: 'live_chat'
      }
    });
  }

  async getConversation(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async saveMessage(conversationId: string, sender: 'user' | 'ai', text: string) {
    return prisma.message.create({
      data: {
        conversationId,
        sender,
        text
      }
    });
  }

  async getRecentMessages(conversationId: string, limit = 10) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit
    }).then(messages => messages.reverse()); // Sort back to chronological order
  }

  async getAllMessages(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getFAQEntries() {
    return prisma.knowledgeBase.findMany();
  }

  async getAllConversations() {
    return prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' }
    });
  }
}
