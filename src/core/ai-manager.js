import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Bottleneck from 'bottleneck';
import { logger } from '../utils/logger.js';

class AIManager {
  constructor() {
    this.openaiKeys = (process.env.OPENAI_API_KEYS || '').split(',').filter(Boolean);
    this.anthropicKeys = (process.env.ANTHROPIC_API_KEYS || '').split(',').filter(Boolean);
    this.sentientKeys = (process.env.SENTIENT_API_KEYS || '').split(',').filter(Boolean);
    this.defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'sentient';
    this.currentOpenAIIndex = 0;
    this.currentAnthropicIndex = 0;
    this.currentSentientIndex = 0;
    
    // Rate limiter
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 200
    });
    
    this.initializeClients();
  }

  initializeClients() {
    this.openaiClients = this.openaiKeys.map(key => new OpenAI({ apiKey: key }));
    this.anthropicClients = this.anthropicKeys.map(key => new Anthropic({ apiKey: key }));
    
    // Sentient AI uses OpenAI-compatible API via Fireworks
    this.sentientClients = this.sentientKeys.map(key => new OpenAI({
      apiKey: key,
      baseURL: process.env.SENTIENT_BASE_URL || 'https://api.fireworks.ai/inference/v1'
    }));
  }

  rotateOpenAIKey() {
    this.currentOpenAIIndex = (this.currentOpenAIIndex + 1) % this.openaiKeys.length;
    logger.info(`Rotated to OpenAI key index: ${this.currentOpenAIIndex}`);
  }

  rotateAnthropicKey() {
    this.currentAnthropicIndex = (this.currentAnthropicIndex + 1) % this.anthropicKeys.length;
    logger.info(`Rotated to Anthropic key index: ${this.currentAnthropicIndex}`);
  }

  rotateSentientKey() {
    this.currentSentientIndex = (this.currentSentientIndex + 1) % this.sentientKeys.length;
    logger.info(`Rotated to Sentient key index: ${this.currentSentientIndex}`);
  }

  getCurrentOpenAIClient() {
    return this.openaiClients[this.currentOpenAIIndex];
  }

  getCurrentAnthropicClient() {
    return this.anthropicClients[this.currentAnthropicIndex];
  }

  getCurrentSentientClient() {
    return this.sentientClients[this.currentSentientIndex];
  }

  async chat(messages, options = {}) {
    const provider = options.provider || this.defaultProvider;
    const maxRetries = options.maxRetries || 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (provider === 'openai') {
          return await this.chatWithOpenAI(messages, options);
        } else if (provider === 'anthropic') {
          return await this.chatWithAnthropic(messages, options);
        }
      } catch (error) {
        logger.error(`AI chat error (attempt ${attempt + 1}):`, error.message);
        
        // Rotate key on rate limit or auth errors
        if (error.status === 429 || error.status === 401) {
          if (provider === 'openai') {
            this.rotateOpenAIKey();
          } else {
            this.rotateAnthropicKey();
          }
        }
        
        // Try alternate provider on last attempt
        if (attempt === maxRetries - 1) {
          if (provider === 'openai' && this.anthropicClients.length > 0) {
            logger.info('Falling back to Anthropic');
            return await this.chatWithAnthropic(messages, options);
          } else if (provider === 'anthropic' && this.openaiClients.length > 0) {
            logger.info('Falling back to OpenAI');
            return await this.chatWithOpenAI(messages, options);
          }
        }
        
        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }
    
    throw new Error('All AI providers failed');
  }

  async chatWithOpenAI(messages, options) {
    return this.limiter.schedule(async () => {
      const client = this.getCurrentOpenAIClient();
      const response = await client.chat.completions.create({
        model: options.model || process.env.AI_MODEL || 'gpt-4-turbo-preview',
        messages: messages,
        temperature: options.temperature || 0.8,
        max_tokens: options.maxTokens || 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });
      
      return {
        content: response.choices[0].message.content,
        provider: 'openai',
        model: response.model,
        usage: response.usage
      };
    });
  }

  async chatWithAnthropic(messages, options) {
    return this.limiter.schedule(async () => {
      const client = this.getCurrentAnthropicClient();
      
      // Convert messages format for Anthropic
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');
      
      const response = await client.messages.create({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 500,
        system: systemMessage?.content || '',
        messages: conversationMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        temperature: options.temperature || 0.8
      });
      
      return {
        content: response.content[0].text,
        provider: 'anthropic',
        model: response.model,
        usage: response.usage
      };
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiManager = new AIManager();