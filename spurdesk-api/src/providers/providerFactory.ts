import { LLMProvider } from '../types/llm';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';
import { AnthropicProvider } from './anthropicProvider';

export class ProviderFactory {
  static getProvider(): LLMProvider {
    // Determine provider dynamically from environment variable or active key
    let providerType = (process.env.LLM_PROVIDER || '').toLowerCase().trim();

    if (!providerType) {
      // Automatic detection fallback if LLM_PROVIDER is not specified
      if (process.env.OPENAI_API_KEY) {
        providerType = 'openai';
      } else if (process.env.ANTHROPIC_API_KEY) {
        providerType = 'anthropic';
      } else {
        providerType = 'gemini';
      }
    }

    console.log(`[ProviderFactory] Resolving LLM Provider: "${providerType.toUpperCase()}"`);

    switch (providerType) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'gemini':
      default:
        return new GeminiProvider();
    }
  }
}
