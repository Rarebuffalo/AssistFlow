import { LLMMessage, LLMProvider } from '../types/llm';

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.modelName = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not defined.');
    }
  }

  async generateReply(messages: LLMMessage[]): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;

    const systemMessage = messages.find(m => m.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;
    const userMessages = messages.filter(m => m.role !== 'system');

    while (attempt < maxRetries) {
      try {
        attempt++;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: this.modelName,
            system: systemInstruction,
            messages: userMessages.map(msg => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content
            })),
            max_tokens: 1024
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Anthropic API request failed: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as any;
        const reply = data.content?.[0]?.text;
        if (!reply) {
          throw new Error('Empty response received from Anthropic API.');
        }
        return reply;
      } catch (error: any) {
        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          console.warn(`[AnthropicProvider] Transient error on attempt ${attempt}/${maxRetries}: ${error.message || error}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[AnthropicProvider] Terminal error:`, error);
          throw error;
        }
      }
    }
    throw new Error('Failed to generate response from Anthropic API.');
  }
}
