import { aiManager } from '../src/core/ai-manager.js';
import { generateSystemPrompt, formatUserMessage, enhanceResponseWithPersonality } from '../src/core/personality.js';
import { saveConversation, getConversationHistory, logAnalytics } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId, includeHistory = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get conversation history if requested
    let conversationHistory = [];
    if (includeHistory && userId) {
      conversationHistory = await getConversationHistory(userId, 5);
    }

    // Build messages array
    const messages = [
      { role: 'system', content: generateSystemPrompt({ conversationHistory: includeHistory }) }
    ];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({ role: 'user', content: msg.user_message });
      messages.push({ role: 'assistant', content: msg.ai_response });
    }

    // Add current message
    messages.push({ 
      role: 'user', 
      content: formatUserMessage(message, { username: userId }) 
    });

    // Get AI response
    const response = await aiManager.chat(messages, {
      maxTokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 500,
      temperature: 0.8
    });

    // Enhance with personality
    const enhancedResponse = enhanceResponseWithPersonality(response.content);

    // Save to database
    if (userId) {
      await saveConversation({
        redditUser: userId,
        messageId: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userMessage: message,
        aiResponse: enhancedResponse,
        aiProvider: response.provider,
        tokensUsed: response.usage?.total_tokens || 0,
        metadata: {
          model: response.model,
          source: 'api'
        }
      });
    }

    // Log analytics
    await logAnalytics('chat_api_request', {
      userId,
      messageLength: message.length,
      responseLength: enhancedResponse.length,
      provider: response.provider
    });

    logger.info(`Chat API request processed for user: ${userId || 'anonymous'}`);

    return res.status(200).json({
      success: true,
      response: enhancedResponse,
      metadata: {
        provider: response.provider,
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    logger.error('Chat API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process chat request',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}