import 'dotenv/config';
import { aiManager } from '../src/core/ai-manager.js';
import { logger } from '../src/utils/logger.js';

async function testAIProviders() {
  console.log('\n🤖 Testing AI Providers\n');
  console.log('═'.repeat(70), '\n');

  const testMessage = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say "Hello from [Provider Name]" in one sentence.' }
  ];

  // Test OpenAI
  if (process.env.OPENAI_API_KEYS) {
    console.log('🔵 Testing OpenAI...');
    try {
      const response = await aiManager.chat(testMessage, {
        provider: 'openai',
        maxTokens: 50
      });
      console.log('✅ OpenAI Response:', response.content);
      console.log(`   Model: ${response.model}`);
      console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}\n`);
    } catch (error) {
      console.error('❌ OpenAI Failed:', error.message, '\n');
    }
  } else {
    console.log('⚠️  OpenAI API key not configured\n');
  }

  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEYS) {
    console.log('🟣 Testing Anthropic (Claude)...');
    try {
      const response = await aiManager.chat(testMessage, {
        provider: 'anthropic',
        maxTokens: 50
      });
      console.log('✅ Anthropic Response:', response.content);
      console.log(`   Model: ${response.model}`);
      console.log(`   Tokens: ${response.usage?.input_tokens + response.usage?.output_tokens || 'N/A'}\n`);
    } catch (error) {
      console.error('❌ Anthropic Failed:', error.message, '\n');
    }
  } else {
    console.log('⚠️  Anthropic API key not configured\n');
  }

  // Test Sentient
  if (process.env.SENTIENT_API_KEYS) {
    console.log('🟢 Testing Sentient AI (via Fireworks)...');
    try {
      const response = await aiManager.chat(testMessage, {
        provider: 'sentient',
        maxTokens: 50
      });
      console.log('✅ Sentient Response:', response.content);
      console.log(`   Model: ${response.model}`);
      console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}\n`);
    } catch (error) {
      console.error('❌ Sentient Failed:', error.message, '\n');
    }
  } else {
    console.log('⚠️  Sentient API key not configured\n');
  }

  // Test default provider
  console.log('═'.repeat(70));
  console.log(`\n🎯 Testing Default Provider (${process.env.DEFAULT_AI_PROVIDER || 'sentient'})...\n`);
  try {
    const response = await aiManager.chat([
      { role: 'system', content: 'You are DobbyAI, a nerdy AI companion.' },
      { role: 'user', content: 'Introduce yourself in one sentence.' }
    ], { maxTokens: 100 });
    
    console.log('✅ Default Provider Response:', response.content);
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Model: ${response.model}\n`);
  } catch (error) {
    console.error('❌ Default Provider Failed:', error.message, '\n');
  }

  console.log('═'.repeat(70));
  console.log('\n✅ AI Provider Test Complete!\n');
}

testAIProviders().catch(error => {
  console.error('\n❌ Test Failed:', error);
  process.exit(1);
});