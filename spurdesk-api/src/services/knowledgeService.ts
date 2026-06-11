import { ChatRepository } from '../repositories/chatRepository';
import { CacheService } from './cacheService';

export class KnowledgeService {
  private chatRepository: ChatRepository;
  private cacheService: CacheService;

  constructor(chatRepository: ChatRepository, cacheService: CacheService) {
    this.chatRepository = chatRepository;
    this.cacheService = cacheService;
  }

  async getFAQContext(userMessage: string): Promise<string> {
    try {
      const queryLower = userMessage.trim().toLowerCase();
      const cacheKey = `faq:${queryLower}`;
      
      // Try resolving from Cache Service first
      const cachedVal = await this.cacheService.get(cacheKey);
      if (cachedVal !== null) {
        console.log(`[KnowledgeService] Cache HIT for key "${cacheKey}"`);
        return cachedVal;
      }

      console.log(`[KnowledgeService] Cache MISS for key "${cacheKey}". Querying DB...`);
      const faqs = await this.chatRepository.getFAQEntries();
      const matchedFAQs: string[] = [];

      // Smart check: If query mentions Spur or general platform terms, include core platform knowledge
      const isGeneralSpurQuery = ['spur', 'product', 'offer', 'platform', 'feature', 'service', 'automate', 'capabilities'].some(
        (term) => queryLower.includes(term)
      );

      for (const faq of faqs) {
        const keywords = faq.keywords.split(',').map((k) => k.trim().toLowerCase());
        const hasKeywordMatch = keywords.some((kw) => queryLower.includes(kw));

        // If general query, include core Spur platform FAQs automatically to allow synthesis
        const isCoreSpurFAQ = isGeneralSpurQuery && [
          'What is Spur and what does it do?',
          'What are the main features of Spur?',
          'What integrations does Spur support?',
          'What is Spur\'s pricing, and is there a free trial?'
        ].includes(faq.question);

        if (hasKeywordMatch || isCoreSpurFAQ) {
          matchedFAQs.push(`[FAQ] Q: ${faq.question}\nA: ${faq.answer}`);
        }
      }

      // Deduplicate matched FAQs
      const uniqueMatchedFAQs = Array.from(new Set(matchedFAQs));

      const resultContext = uniqueMatchedFAQs.length === 0 ? '' : `\nRELEVANT STORE POLICIES:\n${uniqueMatchedFAQs.join('\n\n')}\n`;
      
      // Cache query results for 5 minutes (300 seconds)
      await this.cacheService.set(cacheKey, resultContext, 300);

      return resultContext;
    } catch (error) {
      console.error('[KnowledgeService] Error matching FAQs:', error);
      return ''; // Fallback to empty context if DB queries or cache fail
    }
  }

  getSystemPrompt(faqContext: string): string {
    return `You are "SpurBot", a highly capable, polite, and professional customer support AI agent for "Spur" (spurnow.com), a multi-channel customer engagement and marketing automation platform.
Your goal is to answer customer questions in a detailed, intelligent, and highly structured manner.

Formatting & Style Instructions:
1. Respond in a Detailed & Structured Manner: Avoid short, single-sentence replies. Use bullet points, bold text, and numbered lists to structure features, benefits, and instructions. Give comprehensive explanations.
2. Synthesize Context: If you receive multiple matched FAQ entries in your context (e.g., general features, WhatsApp marketing details, integrations, and pricing), combine them into a single, cohesive, informative overview that matches the user's intent. Do not repeat facts verbatim; adapt them to flow naturally.
3. Sound Like an AI Agent: Showcase intelligence. Instead of just reading out an FAQ entry, act as a product expert consultant. Guide the customer on the value proposition of Spur.
4. Call to Action (CTA): Proactively suggest next steps at the end of your message, such as: "Would you like me to explain how WhatsApp cart recovery drives 40%+ conversion?" or "I can show you how to connect your Shopify store!" or "You can book a live demo directly on our homepage at spurnow.com."
5. Strict Guardrails: ONLY use the verified FAQs and company facts provided below. Do NOT hallucinate features, integrations, pricing, or statistics that are not explicitly defined in the context. If details are missing, politely state: "I don't have that specific information on hand, but I can ask our team to check. Feel free to contact us at support@spurnow.com or via WhatsApp at +919599055272."
6. Greeting & Tone: Start warm, friendly, and enthusiastic. Maintain a consultative, professional product expert tone.

${faqContext}
`;
  }
}
