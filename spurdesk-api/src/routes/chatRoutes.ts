import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { ConversationService } from '../services/conversationService';
import { ChatRepository } from '../repositories/chatRepository';
import { KnowledgeService } from '../services/knowledgeService';
import { CacheService } from '../services/cacheService';
import { ProviderFactory } from '../providers/providerFactory';
import { validateMessageInput } from '../middleware/validation';

const router = Router();

// Instantiate dependencies manually (simple IoC injection)
const chatRepository = new ChatRepository();
const cacheService = new CacheService();
const knowledgeService = new KnowledgeService(chatRepository, cacheService);
const llmProvider = ProviderFactory.getProvider();
const conversationService = new ConversationService(
  chatRepository,
  knowledgeService,
  llmProvider
);

const chatController = new ChatController(conversationService);

// Bind routing endpoints
router.get('/conversations', chatController.getConversations);
router.get('/test-models', chatController.testModels);
router.post('/message', validateMessageInput, chatController.postMessage);
router.get('/history/:sessionId', chatController.getHistory);

// --- Extensibility: Plug New Channels Here ---
// Example: WhatsApp webhook integration
// router.post('/whatsapp/webhook', validateWhatsAppPayload, chatController.postWhatsAppMessage);
// Example: Instagram messaging integration
// router.post('/instagram/webhook', validateInstagramPayload, chatController.postInstagramMessage);

export default router;
