import 'dotenv/config';
import { contentFetcher } from '../src/services/content-fetcher.js';
import sentientBlogSelectors from '../src/config/sentient-blog-selectors.js';

async function test() {
  console.log('🧪 Testing Sentient Blog Integration\n');
  console.log('Blog URL:', process.env.SENTIENT_LABS_BLOG_URL);
  console.log('RSS URL:', process.env.SENTIENT_LABS_RSS_URL);
  console.log('─'.repeat(60), '\n');

  // Configure custom selectors
  contentFetcher.configureSelectors(sentientBlogSelectors);

  // Test blog scraping
  if (process.env.SENTIENT_LABS_BLOG_URL) {
    console.log('📄 Testing blog scraping...\n');
    await contentFetcher.testBlogScraping(process.env.SENTIENT_LABS_BLOG_URL);
    console.log('\n');
  }

  // Fetch actual content
  console.log('📥 Fetching content...\n');
  const content = await contentFetcher.fetchSentientLabsContent();

  console.log(`✅ Successfully fetched ${content.length} articles\n`);
  console.log('─'.repeat(60), '\n');

  // Display results
  content.forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   🔗 ${item.sourceUrl}`);
    console.log(`   📝 ${item.summary?.substring(0, 100)}...`);
    console.log(`   🏷️  Source: ${item.metadata.source}`);
    console.log('');
  });

  if (content.length === 0) {
    console.log('⚠️  No content found. Check your configuration.\n');
  } else {
    console.log('✅ Test successful! Ready to deploy.\n');
  }
}

test().catch(console.error);
