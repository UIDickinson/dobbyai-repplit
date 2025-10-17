import { validateEnvVars } from '../utils/helpers.js';

// Validate required Reddit environment variables
export function validateRedditConfig() {
  const required = [
    'REDDIT_CLIENT_ID',
    'REDDIT_CLIENT_SECRET',
    'REDDIT_USERNAME',
    'REDDIT_PASSWORD',
    'REDDIT_USER_AGENT'
  ];
  
  validateEnvVars(required);
}

// Reddit API configuration
export const redditConfig = {
  userAgent: process.env.REDDIT_USER_AGENT || 'DobbyAI:v1.0.0 (by /u/developer)',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
  
  // Rate limiting configuration
  rateLimit: {
    maxCalls: parseInt(process.env.REDDIT_RATE_LIMIT_CALLS) || 60,
    periodMs: parseInt(process.env.REDDIT_RATE_LIMIT_PERIOD) || 60000, // 1 minute
  },
  
  // Request configuration
  requestDelay: 2000, // 2 seconds between requests
  retryErrorCodes: [502, 503, 504, 522],
  maxRetryAttempts: 3,
  
  // Message configuration
  messageCheckInterval: parseInt(process.env.DM_CHECK_INTERVAL_MINUTES) || 5,
  maxMessagesPerCheck: 25,
  
  // Post configuration
  maxTitleLength: 300,
  maxSelfPostLength: 40000,
  
  // Subreddits configuration
  allowedSubreddits: (process.env.ALLOWED_SUBREDDITS || '').split(',').filter(Boolean),
  
  // Content moderation
  minPostInterval: 3600000, // 1 hour minimum between posts (in ms)
  maxPostsPerDay: 10,
};

// Reddit API endpoints
export const redditEndpoints = {
  oauth: 'https://oauth.reddit.com',
  www: 'https://www.reddit.com',
  accessToken: 'https://www.reddit.com/api/v1/access_token',
};

// Reddit markdown formatting helpers
export const redditMarkdown = {
  bold: (text) => `**${text}**`,
  italic: (text) => `*${text}*`,
  strikethrough: (text) => `~~${text}~~`,
  code: (text) => `\`${text}\``,
  codeBlock: (text, lang = '') => `\`\`\`${lang}\n${text}\n\`\`\``,
  quote: (text) => `> ${text}`,
  link: (text, url) => `[${text}](${url})`,
  list: (items) => items.map(item => `- ${item}`).join('\n'),
  numberedList: (items) => items.map((item, i) => `${i + 1}. ${item}`).join('\n'),
  heading: (text, level = 1) => `${'#'.repeat(level)} ${text}`,
  horizontalRule: () => '---',
  spoiler: (text) => `>!${text}!<`,
  superscript: (text) => `^${text}`,
};

// Reddit response templates
export const responseTemplates = {
  greeting: (username) => `Hey u/${username}! 👋`,
  
  onChainNotAvailable: () => 
    "This version of DobbyAI doesn't support on-chain transactions yet, but it's coming in a future update! For now, I can help you understand blockchain concepts, discuss Sentient Labs technology, and answer your AI-related questions. 🤓",
  
  error: () => 
    "Oops! Something went wrong on my end. 🤖 Mind trying that again? If the issue persists, my human overlords might need to take a look!",
  
  rateLimited: () =>
    "Whoa there! I'm getting a bit overwhelmed with requests. Give me a moment to catch my breath, and try again in a few minutes! ⏰",
  
  thankYou: () =>
    "Happy to help! Feel free to reach out anytime. 🚀",
};

// Subreddit rules and guidelines
export const subredditGuidelines = {
  // Add specific subreddit rules if needed
  default: {
    maxPostsPerDay: 3,
    minTimeBetweenPosts: 3600000, // 1 hour
    allowedPostTypes: ['text', 'link'],
    flairRequired: false,
  }
};

// Content filtering
export const contentFilters = {
  // Words/phrases to avoid in posts
  blockedWords: [
    // Add any words you want to filter
  ],
  
  // Minimum quality thresholds
  minPostLength: 100,
  maxPostLength: 40000,
  minTitleLength: 10,
  maxTitleLength: 300,
};

// Validation helpers
export function validatePostContent(title, content) {
  const errors = [];
  
  if (!title || title.length < contentFilters.minTitleLength) {
    errors.push(`Title must be at least ${contentFilters.minTitleLength} characters`);
  }
  
  if (title && title.length > contentFilters.maxTitleLength) {
    errors.push(`Title must not exceed ${contentFilters.maxTitleLength} characters`);
  }
  
  if (!content || content.length < contentFilters.minPostLength) {
    errors.push(`Content must be at least ${contentFilters.minPostLength} characters`);
  }
  
  if (content && content.length > contentFilters.maxPostLength) {
    errors.push(`Content must not exceed ${contentFilters.maxPostLength} characters`);
  }
  
  // Check for blocked words
  const lowerContent = (title + ' ' + content).toLowerCase();
  for (const word of contentFilters.blockedWords) {
    if (lowerContent.includes(word.toLowerCase())) {
      errors.push(`Content contains blocked word: ${word}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function isValidSubreddit(subreddit) {
  if (redditConfig.allowedSubreddits.length === 0) {
    return true; // No restrictions
  }
  
  return redditConfig.allowedSubreddits.includes(subreddit);
}

// Export default config
export default redditConfig;