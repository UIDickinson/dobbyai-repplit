import { redditService } from '../../src/services/reddit-service.js';
import { aiManager } from '../../src/core/ai-manager.js';
import { generateSystemPrompt, formatUserMessage, enhanceResponseWithPersonality } from '../../src/core/personality.js';
import { saveConversation, getConversationHistory, logAnalytics } from '../../src/config/database.js';
import { logger } from '../../src/utils/logger.js';

export const config = {
  maxDuration: 60, // 60 seconds for Pro plan
};

export default async function handler(req, res) {
  // Verify this is a cron request (optional but recommended)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Starting DM check...');

    // Check for unread messages
    const messages = await redditService.checkUnreadMessages();

    if (messages.length === 0) {
      logger.info('No unread messages found');
      return res.status(200).json({ 
        success: true, 
        processed: 0,
        message: 'No unread messages' 
      });
    }

    const processed = [];
    const failed = [];

    // Process each message
    for (const message of messages) {
      try {
        const messageData = redditService.formatMessageForResponse(message);
        logger.info(`Processing DM from u/${messageData.author}`);

        // Get conversation history
        const history = await getConversationHistory(messageData.author, 5);

        // Build messages array for AI
        const aiMessages = [
          { role: 'system', content: generateSystemPrompt({ conversationHistory: true }) }
        ];

        // Add history
        for (const msg of history) {
          aiMessages.push({ role: 'user', content: msg.user_message });
          aiMessages.push({ role: 'assistant', content: msg.ai_response });
        }

        // Add current message
        aiMessages.push({ 
          role: 'user', 
          content: formatUserMessage(messageData.body, { 
            username: messageData.author,
            context: messageData.subject !== 'no subject' ? `Subject: ${messageData.subject}` : null
          }) 
        });

        // Get AI response
        const response = await aiManager.chat(aiMessages, {
          maxTokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 500,
          temperature: 0.8
        });

        // Enhance with personality
        const enhancedResponse = enhanceResponseWithPersonality(response.content);

        // Reply on Reddit
        await redditService.replyToMessage(message, enhancedResponse);

        // Save to database
        await saveConversation({
          redditUser: messageData.author,
          messageId: messageData.id,
          userMessage: messageData.body,
          aiResponse: enhancedResponse,
          aiProvider: response.provider,
          tokensUsed: response.usage?.total_tokens || 0,
          metadata: {
            model: response.model,
            source: 'dm',
            subject: messageData.subject
          }
        });

        // Log analytics
        await logAnalytics('dm_processed', {
          author: messageData.author,
          messageLength: messageData.body.length,
          responseLength: enhancedResponse.length,
          provider: response.provider
        });

        processed.push(messageData.id);
        logger.info(`Successfully processed DM from u/${messageData.author}`);

      } catch (error) {
        logger.error(`Failed to process message from u/${message.author.name}:`, error);
        failed.push({
          author: message.author.name,
          error: error.message
        });
        
        // Mark as read even if failed to avoid infinite retries
        try {
          await message.markAsRead();
        } catch (e) {
          logger.error('Failed to mark message as read:', e);
        }
      }
    }

    logger.info(`DM check complete. Processed: ${processed.length}, Failed: ${failed.length}`);

    return res.status(200).json({
      success: true,
      processed: processed.length,
      failed: failed.length,
      details: {
        processed,
        failed
      }
    });

  } catch (error) {
    logger.error('DM check cron error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to check DMs',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}