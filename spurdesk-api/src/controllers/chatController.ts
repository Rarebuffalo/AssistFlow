import { Request, Response, NextFunction } from 'express';
import { ConversationService } from '../services/conversationService';

export class ChatController {
  private conversationService: ConversationService;

  constructor(conversationService: ConversationService) {
    this.conversationService = conversationService;
  }

  postMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, sessionId } = req.body;
      const result = await this.conversationService.handleMessage(message, sessionId);
      
      // If there was an error calling the LLM provider, we return a 502/200 but flag it
      // Standard take-home instructions request displaying friendly error inside conversation message
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      
      // Basic validation for sessionId format in GET route params
      if (!sessionId) {
        return res.status(400).json({
          error: true,
          message: 'sessionId parameter is required.',
          requestId: req.requestId
        });
      }

      const result = await this.conversationService.getHistory(sessionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.conversationService.getConversations();
      res.json(result);
    } catch (err) {
      next(err);
    }
  };


  // --- Extensibility: Example Channel Integrations ---
  // postWhatsAppMessage = async (req: Request, res: Response, next: NextFunction) => {
  //   try {
  //     const { fromNumber, text } = req.body;
  //     // 1. Route text message to unified conversation layer under the 'whatsapp' channel designation
  //     const result = await this.conversationService.handleMessage(text, fromNumber);
  //     // 2. Dispatch response back to the user via WhatsApp Business API Client
  //     await whatsappClient.sendMessage(fromNumber, result.reply);
  //     res.sendStatus(200);
  //   } catch (err) {
  //     next(err);
  //   }
  // };
}
