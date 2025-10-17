import { validateEnvVars, parseBoolean } from '../utils/helpers.js';

// Validate AI provider environment variables
export function validateAIConfig() {
  const hasOpenAI = process.env.OPENAI_API_KEYS;
  const hasAnthropic = process.env.ANTHROPIC_API_KEYS;
  const hasSentient = process.env.SENTIENT_API_KEYS;
  
  if (!hasOpenAI && !hasAnthropic && !hasSentient) {
    throw new Error('At least one AI provider (OpenAI, Anthropic, or Sentient) must be configured');
  }
}

// OpenAI configuration
export const openAIConfig = {
  apiKeys: (process.env.OPENAI_API_KEYS || '').split(',').filter(Boolean),
  
  models: {
    default: process.env.AI_MODEL || 'gpt-4-turbo-preview',
    chat: 'gpt-4-turbo-preview',
    fast: 'gpt-3.5-turbo',
    creative: 'gpt-4-turbo-preview',
  },
  
  parameters: {
    temperature: 0.8,
    maxTokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 500,
    topP: 1,
    frequencyPenalty: 0.3,
    presencePenalty: 0.6,
  },
  
  rateLimit: {
    maxCalls: parseInt(process.env.AI_RATE_LIMIT_CALLS) || 50,
    periodMs: parseInt(process.env.AI_RATE_LIMIT_PERIOD) || 60000,
  },
  
  timeout: 30000, // 30 seconds
  
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
};

// Anthropic (Claude) configuration
export const anthropicConfig = {
  apiKeys: (process.env.ANTHROPIC_API_KEYS || '').split(',').filter(Boolean),
  
  models: {
    default: 'claude-3-5-sonnet-20241022',
    chat: 'claude-3-5-sonnet-20241022',
    fast: 'claude-3-haiku-20240307',
    creative: 'claude-3-opus-20240229',
  },
  
  parameters: {
    temperature: 0.8,
    maxTokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 500,
    topP: 1,
  },
  
  rateLimit: {
    maxCalls: parseInt(process.env.AI_RATE_LIMIT_CALLS) || 50,
    periodMs: parseInt(process.env.AI_RATE_LIMIT_PERIOD) || 60000,
  },
  
  timeout: 30000,
  
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
};

// Sentient AI (via Fireworks) configuration
export const sentientConfig = {
  apiKeys: (process.env.SENTIENT_API_KEYS || '').split(',').filter(Boolean),
  baseURL: process.env.SENTIENT_BASE_URL || 'https://api.fireworks.ai/inference/v1/completions',
  
  models: {
    default: 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',
    chat: 'accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b',
    fast: 'accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new',
    creative: 'accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new',
  },
  
  parameters: {
    temperature: 0.8,
    maxTokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 500,
    topP: 1,
    frequencyPenalty: 0.3,
    presencePenalty: 0.6,
  },
  
  rateLimit: {
    maxCalls: parseInt(process.env.AI_RATE_LIMIT_CALLS) || 50,
    periodMs: parseInt(process.env.AI_RATE_LIMIT_PERIOD) || 60000,
  },
  
  timeout: 30000,
  
  retryConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
};

// General AI configuration
export const aiConfig = {
  defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'sentient',
  
  // Feature flags
  enableKeyRotation: parseBoolean(process.env.ENABLE_KEY_ROTATION, true),
  enableFallback: parseBoolean(process.env.ENABLE_PROVIDER_FALLBACK, true),
  
  // Response configuration
  maxResponseLength: parseInt(process.env.MAX_RESPONSE_LENGTH) || 500,
  minResponseLength: 20,
  
  // Context management
  maxConversationHistory: 5,
  maxContextTokens: 3000,
  
  // Quality settings
  temperatureRange: {
    min: 0.5,
    max: 1.0,
    default: 0.8,
  },
  
  // Token management
  tokenBuffer: 100, // Reserve tokens for formatting
  estimatedTokensPerWord: 1.3,
};

// Provider capabilities
export const providerCapabilities = {
  openai: {
    supportsFunctions: true,
    supportsVision: true,
    supportsStreaming: true,
    maxContextWindow: 128000,
    costPerToken: {
      input: 0.01 / 1000,
      output: 0.03 / 1000,
    },
  },
  
  anthropic: {
    supportsFunctions: true,
    supportsVision: true,
    supportsStreaming: true,
    maxContextWindow: 200000,
    costPerToken: {
      input: 0.003 / 1000,
      output: 0.015 / 1000,
    },
  },
  
  sentient: {
    supportsFunctions: true,
    supportsVision: false,
    supportsStreaming: true,
    maxContextWindow: 8192,
    costPerToken: {
      input: 0.0002 / 1000,  // Fireworks pricing
      output: 0.0006 / 1000,
    },
  },
};

// Model selection based on use case
export const modelSelection = {
  chat: {
    openai: openAIConfig.models.chat,
    anthropic: anthropicConfig.models.chat,
  },
  
  postGeneration: {
    openai: openAIConfig.models.creative,
    anthropic: anthropicConfig.models.creative,
  },
  
  quickResponse: {
    openai: openAIConfig.models.fast,
    anthropic: anthropicConfig.models.fast,
  },
  
  longForm: {
    openai: openAIConfig.models.creative,
    anthropic: anthropicConfig.models.default,
  },
};

// Get model for specific use case
export function getModelForUseCase(useCase, provider = null) {
  const targetProvider = provider || aiConfig.defaultProvider;
  
  if (!modelSelection[useCase]) {
    return getDefaultModel(targetProvider);
  }
  
  return modelSelection[useCase][targetProvider] || getDefaultModel(targetProvider);
}

// Get default model for provider
export function getDefaultModel(provider) {
  if (provider === 'openai') {
    return openAIConfig.models.default;
  } else if (provider === 'anthropic') {
    return anthropicConfig.models.default;
  }
  
  return openAIConfig.models.default;
}

// Estimate token count
export function estimateTokenCount(text) {
  const words = text.split(/\s+/).length;
  return Math.ceil(words * aiConfig.estimatedTokensPerWord);
}

// Check if response is within limits
export function isWithinTokenLimit(text, maxTokens = aiConfig.maxResponseLength) {
  const estimated = estimateTokenCount(text);
  return estimated <= maxTokens;
}

// Calculate approximate cost
export function estimateCost(provider, inputTokens, outputTokens) {
  const capabilities = providerCapabilities[provider];
  if (!capabilities) return 0;
  
  const inputCost = inputTokens * capabilities.costPerToken.input;
  const outputCost = outputTokens * capabilities.costPerToken.output;
  
  return inputCost + outputCost;
}

// Prompt templates
export const promptTemplates = {
  system: {
    default: 'You are DobbyAI, a nerdy AI companion.',
    concise: 'You are DobbyAI. Be concise and helpful.',
    creative: 'You are DobbyAI. Be creative and engaging.',
    technical: 'You are DobbyAI. Provide technical and detailed responses.',
  },
  
  user: {
    chat: (message) => message,
    summarize: (text) => `Please summarize the following text:\n\n${text}`,
    expand: (text) => `Please expand on the following:\n\n${text}`,
    explain: (topic) => `Please explain ${topic} in simple terms.`,
  },
};

// Safety and content filtering
export const contentSafety = {
  enableFilter: parseBoolean(process.env.ENABLE_CONTENT_FILTER, true),
  
  blockedTopics: [
    'violence',
    'illegal activities',
    'explicit content',
  ],
  
  warningPhrases: [
    'I cannot provide',
    'I\'m not able to',
    'I cannot assist with',
  ],
};

// Provider health tracking
export class ProviderHealth {
  constructor() {
    this.health = {
      openai: { errors: 0, successes: 0, lastError: null },
      anthropic: { errors: 0, successes: 0, lastError: null },
    };
  }
  
  recordSuccess(provider) {
    if (this.health[provider]) {
      this.health[provider].successes++;
    }
  }
  
  recordError(provider, error) {
    if (this.health[provider]) {
      this.health[provider].errors++;
      this.health[provider].lastError = {
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  getHealthScore(provider) {
    const health = this.health[provider];
    if (!health) return 0;
    
    const total = health.successes + health.errors;
    if (total === 0) return 1;
    
    return health.successes / total;
  }
  
  getPreferredProvider() {
    const openaiScore = this.getHealthScore('openai');
    const anthropicScore = this.getHealthScore('anthropic');
    
    if (openaiScore > anthropicScore) return 'openai';
    if (anthropicScore > openaiScore) return 'anthropic';
    
    return aiConfig.defaultProvider;
  }
  
  getStats() {
    return {
      openai: {
        ...this.health.openai,
        healthScore: this.getHealthScore('openai'),
      },
      anthropic: {
        ...this.health.anthropic,
        healthScore: this.getHealthScore('anthropic'),
      },
    };
  }
}

// Export singleton instance
export const providerHealth = new ProviderHealth();

// Export all configs
export default {
  openAI: openAIConfig,
  anthropic: anthropicConfig,
  general: aiConfig,
  capabilities: providerCapabilities,
  modelSelection,
  promptTemplates,
  contentSafety,
  providerHealth,
};
