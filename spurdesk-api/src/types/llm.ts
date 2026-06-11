export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  generateReply(messages: LLMMessage[]): Promise<string>;
}
