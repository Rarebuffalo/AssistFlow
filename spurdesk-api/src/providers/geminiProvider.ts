import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMMessage, LLMProvider } from '../types/llm';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async generateReply(messages: LLMMessage[]): Promise<string> {
    const maxRetries = 4;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        return await this.executeCall(messages);
      } catch (error: any) {
        const statusCode = error.status || error.statusCode;
        const errorMessage = (error.message || '').toLowerCase();
        
        // Check for common transient error indicators:
        // 503 (Service Unavailable), 429 (Rate Limit/Overloaded), or fetch failures
        const isTransient = 
          statusCode === 503 || 
          statusCode === 429 || 
          errorMessage.includes('503') || 
          errorMessage.includes('429') || 
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('service unavailable') ||
          errorMessage.includes('too many requests');

        if (isTransient && attempt < maxRetries) {
          const delay = attempt * 2500; // 2.5s, 5s, 7.5s exponential backoff to handle rate limits
          console.warn(`[GeminiProvider] Transient error (status ${statusCode || 'unknown'}) on attempt ${attempt}/${maxRetries}: "${error.message || 'unknown'}". Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[GeminiProvider] Terminal error on attempt ${attempt}/${maxRetries}:`, error);
          throw error;
        }
      }
    }
    throw new Error('Failed to generate response from Gemini API after retries.');
  }

  private async executeCall(messages: LLMMessage[]): Promise<string> {
    // Find system instruction if any
    const systemMessage = messages.find((m) => m.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    // Filter system message out of context history
    const chatHistory = messages.filter((m) => m.role !== 'system');

    // The last message is the current user input
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('The last message in history must be from the user.');
    }

    // Map history before the last message for Gemini startChat
    const geminiHistory = chatHistory.slice(0, -1).map((msg) => {
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      };
    });

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction
    });

    // --- Extensibility: Plug Custom AI Tools (Function Calling) Here ---
    // Example: Registering an order lookup tool for the agent:
    // const checkOrderTool = {
    //   functionDeclarations: [{
    //     name: 'checkOrderStatus',
    //     description: 'Fetch delivery dates and order status from Shopify database using an order ID.',
    //     parameters: {
    //       type: 'OBJECT',
    //       properties: { orderId: { type: 'STRING' } },
    //       required: ['orderId']
    //     }
    //   }]
    // };

    const chat = model.startChat({
      history: geminiHistory,
      // tools: [checkOrderTool] // Pass tool declarations directly here to start Chat session
    });

    const response = await chat.sendMessage(lastMessage.content);
    const text = response.response.text();
    
    if (!text) {
      throw new Error('Empty response received from Gemini API.');
    }
    
    return text;
  }
}
