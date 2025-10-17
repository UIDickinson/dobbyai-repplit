import 'dotenv/config';
import { sql } from '@vercel/postgres';
import { redditService } from '../src/services/reddit-service.js';
import { aiManager } from '../src/core/ai-manager.js';
import { contentFetcher } from '../src/services/content-fetcher.js';
import sentientBlogSelectors from '../src/config/sentient-blog-selectors.js';
import { postGenerator } from '../src/services/post-generator.js';
import { logger } from '../src/utils/logger.js';

async function testAllFunctions() {
  console.log('\n🧪 DobbyAI - Complete Function Test Suite\n');
  console.log('═'.repeat(70), '\n');

  const results = {
    database: false,
    reddit: false,
    ai: false,
    contentFetch: false,
    postGeneration: false
  };

  // Test 1: Database Connection
  console.log('1️⃣  Testing Database Connection...');
  console.log('─'.repeat(70));
  try {
    const result = await sql`SELECT NOW()`;
    console.log(`✅ Database connected: ${result.rows[0].now}`);
    results.database = true;
  } catch (error) {
    console.error('❌ Database failed:', error.message);
  }
  console.log('');

  // Test 2: Reddit Connection
  console.log('2️⃣  Testing Reddit Connection...');
  console.log('─'.repeat(70));
  try {
    const success = await redditService.testConnection();
    if (success) {
      console.log(`✅ Reddit connected as u/${process.env.REDDIT_USERNAME}`);
      results.reddit = true;
    } else {
      console.error('❌ Reddit connection failed');
    }
  } catch (error) {
    console.error('❌ Reddit failed:', error.message);
  }
  console.log('');

  // Test 3: AI Providers
  console.log('3️⃣  Testing AI Providers...');
  console.log('─'.repeat(70));
  
  const providers = [];
  if (process.env.OPENAI_API_KEYS) providers.push('openai');
  if (process.env.ANTHROPIC_API_KEYS) providers.push('anthropic');
  if (process.env.SENTIENT_API_KEYS) providers.push('sentient');

  if (providers.length === 0) {
    console.error('❌ No AI providers configured');
  } else {
    let aiWorking = false;
    for (const provider of providers) {
      try {
        const response = await aiManager.chat([
          { role: 'user', content: 'Say hello' }
        ], { provider, maxTokens: 20 });
        console.log(`✅ ${provider.toUpperCase()} working - Response: "${response.content.substring(0, 50)}..."`);
        aiWorking = true;
      } catch (error) {
        console.error(`❌ ${provider.toUpperCase()} failed:`, error.message);
      }
    }
    results.ai = aiWorking;
  }
  console.log('');

  // Test 4: Content Fetching
  console.log('4️⃣  Testing Content Fetching (Sentient Blog)...');
  console.log('─'.repeat(70));
  try {
    contentFetcher.configureSelectors(sentientBlogSelectors);
    const content = await contentFetcher.fetchSentientLabsContent();
    
    if (content.length > 0) {
      console.log(`✅ Fetched ${content.length} articles from Sentient blog`);
      console.log(`   First article: "${content[0].title.substring(0, 50)}..."`);
      results.contentFetch = true;
    } else {
      console.error('❌ No content fetched (check blog URL and selectors)');
    }
  } catch (error) {
    console.error('❌ Content fetch failed:', error.message);
  }
  console.log('');

  // Test 5: Post Generation
  console.log('5️⃣  Testing Post Generation...');
  console.log('─'.repeat(70));
  try {
    const sampleContent = `
      Sentient AI is building the future of decentralized artificial intelligence.
      Our mission is to create open, accessible AI that benefits everyone.
      We're focused on model fingerprinting, monetization, and open-source innovation.
    `;
    
    const post = await postGenerator.generatePost(sampleContent, 'insight');
    
    if (post && post.title && post.content) {
      console.log(`✅ Post generated successfully`);
      console.log(`   Title: "${post.title.substring(0, 60)}..."`);
      console.log(`   Content length: ${post.content.length} characters`);
      results.postGeneration = true;
    } else {
      console.error('❌ Post generation returned invalid data');
    }
  } catch (error) {
    console.error('❌ Post generation failed:', error.message);
  }
  console.log('');

  // Summary
  console.log('═'.repeat(70));
  console.log('\n📊 Test Results Summary:\n');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(v => v).length;
  
  console.log(`Database:         ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Reddit:           ${results.reddit ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI Providers:     ${results.ai ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Content Fetch:    ${results.contentFetch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Post Generation:  ${results.postGeneration ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log(`\n${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Ready for deployment.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Fix the issues before deploying.\n');
    process.exit(1);
  }
}

testAllFunctions().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});