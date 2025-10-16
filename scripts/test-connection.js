import 'dotenv/config';
import { redditService } from '../src/services/reddit-service.js';
import { aiManager } from '../src/core/ai-manager.js';
import { sql } from '@vercel/postgres';
import { logger } from '../src/utils/logger.js';
import { validateEnvVars } from '../src/utils/helpers.js';

async function testConnections() {
  logger.info('Testing DobbyAI connections...\n');

  // Test required environment variables
  logger.info('1. Checking environment variables...');
  try {
    validateEnvVars([
      'POSTGRES_URL',
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
      'REDDIT_USERNAME',
      'REDDIT_PASSWORD'
    ]);
    logger.info('✓ Required environment variables are set\n');
  } catch (error) {
    logger.error('✗ Missing environment variables:', error.message);
    return;
  }

  // Test database connection
  logger.info('2. Testing database connection...');
  try {
    const result = await sql`SELECT NOW()`;
    logger.info(`✓ Database connected: ${result.rows[0].now}\n`);
  } catch (error) {
    logger.error('✗ Database connection failed:', error.message);
    logger.error('Make sure POSTGRES_URL is set correctly\n');
  }

  // Test Reddit connection
  logger.info('3. Testing Reddit connection...');
  try {
    const success = await redditService.testConnection();
    if (success) {
      logger.info(`✓ Reddit connected as u/${process.env.REDDIT_USERNAME}\n`);
    } else {
      logger.error('✗ Reddit connection failed\n');
    }
  } catch (error) {
    logger.error('✗ Reddit connection failed:', error.message);
    logger.error('Check your Reddit API credentials\n');
  }

  // Test AI providers
  logger.info('4. Testing AI providers...');
  
  // Test OpenAI
  if (process.env.OPENAI_API_KEYS) {
    try {
      const response = await aiManager.chat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello" in one word.' }
      ], { provider: 'openai', maxTokens: 10 });
      logger.info(`✓ OpenAI connected (${response.provider}/${response.model})`);
    } catch (error) {
      logger.error('✗ OpenAI connection failed:', error.message);
    }
  } else {
    logger.warn('⚠ OpenAI API keys not configured');
  }

  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEYS) {
    try {
      const response = await aiManager.chat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello" in one word.' }
      ], { provider: 'anthropic', maxTokens: 10 });
      logger.info(`✓ Anthropic connected (${response.provider}/${response.model})`);
    } catch (error) {
      logger.error('✗ Anthropic connection failed:', error.message);
    }
  } else {
    logger.warn('⚠ Anthropic API keys not configured');
  }

  logger.info('\n✓ Connection test complete!');
  logger.info('You can now deploy to Vercel or run locally with "npm run dev"\n');
}

testConnections().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});