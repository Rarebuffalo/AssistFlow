import { LLMMessage, LLMProvider } from '../types/llm';

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not defined.');
    }
  }

  async generateReply(messages: LLMMessage[]): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.modelName,
            messages: messages.map(msg => ({
              role: msg.role === 'assistant' ? 'assistant' : msg.role,
              content: msg.content
            }))
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as any;
        const reply = data.choices?.[0]?.message?.content;
        if (!reply) {
          throw new Error('Empty response received from OpenAI API.');
        }
        return reply;
      } catch (error: any) {
        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          console.warn(`[OpenAIProvider] Transient error on attempt ${attempt}/${maxRetries}: ${error.message || error}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[OpenAIProvider] Terminal error:`, error);
          throw error;
        }
      }
    }
    throw new Error('Failed to generate response from OpenAI API.');
  }
}
