import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Bottleneck from 'bottleneck';
import { logger } from '../utils/logger.js';

class AIManager {
  constructor() {
    this.openaiKeys = (process.env.OPENAI_API_KEYS || '').split(',').filter(Boolean);
    this.anthropicKeys = (process.env.ANTHROPIC_API_KEYS || '').split(',').filter(Boolean);
    this.sentientKeys = (process.env.SENTIENT_API_KEYS || '').split(',').filter(Boolean);
    
    // Set default provider to one that's actually available
    this.defaultProvider = this.determineDefaultProvider();
    
    this.currentOpenAIIndex = 0;
    this.currentAnthropicIndex = 0;
    this.currentSentientIndex = 0;
    
    // Rate limiter
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 200
    });
    
    this.initializeClients();
    this.logAvailableProviders();
  }

  determineDefaultProvider() {
    // Priority: sentient > openai > anthropic
    if (this.sentientKeys.length > 0) return 'sentient';
    if (this.openaiKeys.length > 0) return 'openai';
    if (this.anthropicKeys.length > 0) return 'anthropic';
    
    throw new Error('No AI provider API keys configured. Please set OPENAI_API_KEYS, ANTHROPIC_API_KEYS, or SENTIENT_API_KEYS');
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

  logAvailableProviders() {
    logger.info('🤖 AI Providers initialized:');
    logger.info(`   OpenAI: ${this.openaiKeys.length} key(s)`);
    logger.info(`   Anthropic: ${this.anthropicKeys.length} key(s)`);
    logger.info(`   Sentient: ${this.sentientKeys.length} key(s)`);
    logger.info(`   Default Provider: ${this.defaultProvider}`);
  }

  rotateOpenAIKey() {
    if (this.openaiKeys.length === 0) return;
    this.currentOpenAIIndex = (this.currentOpenAIIndex + 1) % this.openaiKeys.length;
    logger.info(`Rotated to OpenAI key index: ${this.currentOpenAIIndex}`);
  }

  rotateAnthropicKey() {
    if (this.anthropicKeys.length === 0) return;
    this.currentAnthropicIndex = (this.currentAnthropicIndex + 1) % this.anthropicKeys.length;
    logger.info(`Rotated to Anthropic key index: ${this.currentAnthropicIndex}`);
  }

  rotateSentientKey() {
    if (this.sentientKeys.length === 0) return;
    this.currentSentientIndex = (this.currentSentientIndex + 1) % this.sentientKeys.length;
    logger.info(`Rotated to Sentient key index: ${this.currentSentientIndex}`);
  }

  getCurrentOpenAIClient() {
    if (this.openaiClients.length === 0) return null;
    return this.openaiClients[this.currentOpenAIIndex];
  }

  getCurrentAnthropicClient() {
    if (this.anthropicClients.length === 0) return null;
    return this.anthropicClients[this.currentAnthropicIndex];
  }

  getCurrentSentientClient() {
    if (this.sentientClients.length === 0) return null;
    return this.sentientClients[this.currentSentientIndex];
  }

  async chat(messages, options = {}) {
    const provider = options.provider || this.defaultProvider;
    const maxRetries = options.maxRetries || 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (provider === 'openai' && this.openaiClients.length > 0) {
          return await this.chatWithOpenAI(messages, options);
        } else if (provider === 'anthropic' && this.anthropicClients.length > 0) {
          return await this.chatWithAnthropic(messages, options);
        } else if (provider === 'sentient' && this.sentientClients.length > 0) {
          return await this.chatWithSentient(messages, options);
        } else {
          throw new Error(`Provider ${provider} not available or not configured`);
        }
      } catch (error) {
        logger.error(`AI chat error (attempt ${attempt + 1}) with ${provider}:`, error.message);
        
        // Rotate key on rate limit or auth errors
        if (error.status === 429 || error.status === 401) {
          if (provider === 'openai') {
            this.rotateOpenAIKey();
          } else if (provider === 'anthropic') {
            this.rotateAnthropicKey();
          } else if (provider === 'sentient') {
            this.rotateSentientKey();
          }
        }
        
        // Try alternate provider on last attempt
        if (attempt === maxRetries - 1) {
          return await this.fallbackToAvailableProvider(provider, messages, options);
        }
        
        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }
    
    throw new Error('All AI providers failed');
  }

  async fallbackToAvailableProvider(failedProvider, messages, options) {
    logger.info(`Attempting fallback from ${failedProvider}...`);
    
    // Try providers in order: sentient, openai, anthropic (excluding the failed one)
    const fallbackOrder = ['sentient', 'openai', 'anthropic'].filter(p => p !== failedProvider);
    
    for (const provider of fallbackOrder) {
      try {
        if (provider === 'sentient' && this.sentientClients.length > 0) {
          logger.info('Falling back to Sentient');
          return await this.chatWithSentient(messages, options);
        } else if (provider === 'openai' && this.openaiClients.length > 0) {
          logger.info('Falling back to OpenAI');
          return await this.chatWithOpenAI(messages, options);
        } else if (provider === 'anthropic' && this.anthropicClients.length > 0) {
          logger.info('Falling back to Anthropic');
          return await this.chatWithAnthropic(messages, options);
        }
      } catch (error) {
        logger.error(`Fallback to ${provider} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('All fallback providers failed');
  }

  async chatWithOpenAI(messages, options) {
    const client = this.getCurrentOpenAIClient();
    if (!client) throw new Error('OpenAI client not available');
    
    return this.limiter.schedule(async () => {
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
    const client = this.getCurrentAnthropicClient();
    if (!client) throw new Error('Anthropic client not available');
    
    return this.limiter.schedule(async () => {
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

  async chatWithSentient(messages, options) {
    const client = this.getCurrentSentientClient();
    if (!client) throw new Error('Sentient client not available');
    
    return this.limiter.schedule(async () => {
      const response = await client.chat.completions.create({
        model: options.model || 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',
        messages: messages,
        temperature: options.temperature || 0.8,
        max_tokens: options.maxTokens || 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });
      
      return {
        content: response.choices[0].message.content,
        provider: 'sentient',
        model: response.model,
        usage: response.usage
      };
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to check provider availability
  getAvailableProviders() {
    return {
      openai: this.openaiClients.length > 0,
      anthropic: this.anthropicClients.length > 0,
      sentient: this.sentientClients.length > 0
    };
  }
}

export const aiManager = new AIManager();