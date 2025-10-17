import 'dotenv/config';
import { contentFetcher } from '../src/services/content-fetcher.js';
import sentientBlogSelectors from '../src/config/sentient-blog-selectors.js';
import { logger } from '../src/utils/logger.js';
import { sql } from '@vercel/postgres';

async function initializeContent() {
  console.log('\n🚀 DobbyAI - Content Initialization\n');
  console.log('═'.repeat(70), '\n');

  // Check database connection
  console.log('1️⃣  Checking database connection...');
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\nRun: npm run setup\n');
    process.exit(1);
  }

  // Check if tables exist
  console.log('2️⃣  Checking database tables...');
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableNames = tables.rows.map(r => r.table_name);
    const required = ['conversations', 'posts', 'analytics', 'content_cache'];
    const missing = required.filter(t => !tableNames.includes(t));
    
    if (missing.length > 0) {
      console.error(`❌ Missing tables: ${missing.join(', ')}`);
      console.log('\nRun: npm run setup\n');
      process.exit(1);
    }
    
    console.log('✅ All required tables exist\n');
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
    process.exit(1);
  }

  // Check content cache
  console.log('3️⃣  Checking existing content...');
  try {
    const existing = await sql`SELECT COUNT(*) as count FROM content_cache`;
    const count = parseInt(existing.rows[0].count);
    
    if (count > 0) {
      console.log(`✅ Found ${count} cached articles\n`);
      
      const unused = await sql`
        SELECT COUNT(*) as count 
        FROM content_cache 
        WHERE used_for_post = FALSE
      `;
      const unusedCount = parseInt(unused.rows[0].count);
      
      console.log(`   📦 ${unusedCount} articles available for posts`);
      console.log(`   ✓ ${count - unusedCount} articles already used\n`);
      
      if (unusedCount > 0) {
        console.log('💡 You can skip fetching and create a post directly!\n');
      }
    } else {
      console.log('⚠️  No content cached yet\n');
    }
  } catch (error) {
    console.error('❌ Content check failed:', error.message);
  }

  // Fetch new content
  console.log('4️⃣  Fetching content from Sentient blog...');
  console.log('─'.repeat(70), '\n');
  
  try {
    // Configure selectors
    contentFetcher.configureSelectors(sentientBlogSelectors);
    
    // Fetch content
    const startTime = Date.now();
    const content = await contentFetcher.fetchSentientLabsContent();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (content.length === 0) {
      console.error('❌ No content fetched!\n');
      console.log('Possible issues:');
      console.log('  • Blog URL incorrect');
      console.log('  • Network connection issue');
      console.log('  • Blog structure changed\n');
      process.exit(1);
    }
    
    console.log(`✅ Fetched ${content.length} articles in ${duration}s\n`);
    
    // Show fetched articles
    console.log('📚 Fetched Articles:\n');
    content.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`);
      console.log(`   🔗 ${item.sourceUrl}`);
      console.log(`   🏷️  ${item.metadata.source}\n`);
    });
    
  } catch (error) {
    console.error('❌ Content fetch failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  // Verify content was saved
  console.log('5️⃣  Verifying content in database...');
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM content_cache 
      WHERE used_for_post = FALSE
    `;
    const available = parseInt(result.rows[0].count);
    
    if (available > 0) {
      console.log(`✅ ${available} articles ready for posting!\n`);
    } else {
      console.error('❌ No articles available in database\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  }

  // Summary
  console.log('═'.repeat(70));
  console.log('\n✅ Content Initialization Complete!\n');
  console.log('Next steps:');
  console.log('  1. Start the bot: npm start');
  console.log('  2. Or create a post now: curl http://localhost:3000/api/cron/auto-post');
  console.log('  3. Or wait for auto-post (runs every 6 hours)\n');
}

initializeContent().catch(error => {
  console.error('\n❌ Initialization failed:', error);
  process.exit(1);
});