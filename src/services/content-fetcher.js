import axios from 'axios';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { saveContent } from '../config/database.js';

class ContentFetcher {
  constructor() {
    this.rssParser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'DobbyAI-ContentFetcher/1.0'
      }
    });
    
    this.blogSelectors = {
      containers: [
        'article',
        '.post',
        '.blog-post',
        '.entry',
        '.content-item',
        '[class*="post"]',
        '[class*="article"]'
      ],
      title: [
        'h1',
        'h2',
        '.title',
        '.post-title',
        '.entry-title',
        '[class*="title"]'
      ],
      link: [
        'a[href*="/blog/"]',
        'a[href*="/post/"]',
        'a.post-link',
        'a.read-more',
        'h1 a',
        'h2 a'
      ],
      content: [
        '.excerpt',
        '.summary',
        '.content',
        '.post-content',
        '.entry-content',
        'p',
        '[class*="excerpt"]'
      ]
    };
  }

  async fetchSentientLabsContent() {
    const allContent = [];

    try {
      if (process.env.SENTIENT_LABS_RSS_URL) {
        logger.info('Fetching from RSS feed...');
        const rssContent = await this.fetchRSSFeed();
        allContent.push(...rssContent);
        logger.info(`Fetched ${rssContent.length} items from RSS`);
      } else {
        logger.info('No RSS feed configured, skipping RSS fetch');
      }

      if (process.env.SENTIENT_LABS_BLOG_URL) {
        logger.info('Fetching from blog...');
        const blogContent = await this.fetchBlogPosts();
        allContent.push(...blogContent);
        logger.info(`Fetched ${blogContent.length} items from blog`);
      } else {
        logger.info('No blog URL configured, skipping blog fetch');
      }

      if (allContent.length === 0) {
        logger.warn('No content sources configured! Please set SENTIENT_LABS_RSS_URL or SENTIENT_LABS_BLOG_URL');
        return [];
      }

      const uniqueContent = this.removeDuplicates(allContent);
      logger.info(`${uniqueContent.length} unique items after deduplication`);

      let savedCount = 0;
      for (const content of uniqueContent) {
        try {
          await saveContent(content);
          savedCount++;
          logger.info(`Saved content: ${content.title}`);
        } catch (error) {
          logger.error(`Error saving content "${content.title}":`, error.message);
        }
      }

      logger.info(`Successfully saved ${savedCount}/${uniqueContent.length} content items`);
      return uniqueContent;
    } catch (error) {
      logger.error('Error fetching Sentient Labs content:', error);
      return [];
    }
  }

  async fetchRSSFeed() {
    try {
      const feed = await this.rssParser.parseURL(process.env.SENTIENT_LABS_RSS_URL);
      
      return feed.items.slice(0, 10).map(item => ({
        sourceUrl: item.link,
        title: item.title,
        content: this.stripHTML(item.contentSnippet || item.content || ''),
        summary: item.contentSnippet?.substring(0, 300) || null,
        metadata: {
          publishedAt: item.pubDate,
          categories: item.categories || [],
          author: item.creator || 'Sentient Labs',
          source: 'rss'
        }
      }));
    } catch (error) {
      logger.error('Error fetching RSS feed:', error);
      return [];
    }
  }

async fetchBlogPosts() {
  try {
    const response = await axios.get(process.env.SENTIENT_LABS_BLOG_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'DobbyAI-ContentFetcher/1.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    const $ = cheerio.load(response.data);
    const posts = [];
    
    // Get links to individual posts
    const postLinks = [];
    $('a[href*="/posts/"]').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).find('h2').text().trim();
      if (href && title && !postLinks.some(p => p.url === href)) {
        postLinks.push({
          url: href.startsWith('http') ? href : `https://blog.sentient.xyz${href}`,
          title: title
        });
      }
    });

    logger.info(`Found ${postLinks.length} post links, fetching content...`);

    // Fetch first 5 individual posts
    for (let i = 0; i < Math.min(postLinks.length, 5); i++) {
      try {
        const post = postLinks[i];
        const content = await this.fetchArticleContent(post.url);
        
        if (content && content.length > 100) {
          posts.push({
            sourceUrl: post.url,
            title: post.title,
            content: content.substring(0, 2000),
            summary: content.substring(0, 300),
            metadata: {
              scrapedAt: new Date().toISOString(),
              source: 'blog'
            }
          });
          logger.info(`✓ Fetched: ${post.title.substring(0, 40)}...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      } catch (error) {
        logger.error(`Failed to fetch ${postLinks[i].url}:`, error.message);
      }
    }

    return posts;
  } catch (error) {
    logger.error('Error fetching blog posts:', error.message);
    return [];
  }
}

  async fetchArticleContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DobbyAI-ContentFetcher/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      $('script, style, nav, header, footer, aside, .ads, .advertisement').remove();
      
      const contentSelectors = [
        'article',
        'main',
        '.content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content'
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const $content = $(selector);
        if ($content.length) {
          content = $content.text().trim();
          break;
        }
      }

      if (!content) {
        content = $('body').text().trim();
      }

      return this.cleanText(content);
    } catch (error) {
      logger.error(`Error fetching article from ${url}:`, error.message);
      return null;
    }
  }

  configureSelectors(customSelectors) {
    this.blogSelectors = {
      ...this.blogSelectors,
      ...customSelectors
    };
    logger.info('Updated blog selectors with custom configuration');
  }

  async testBlogScraping(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DobbyAI-ContentFetcher/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      logger.info('Testing blog selectors...');
      
      for (const selector of this.blogSelectors.containers) {
        const count = $(selector).length;
        if (count > 0) {
          logger.info(`✓ Container "${selector}": Found ${count} elements`);
        }
      }

      for (const selector of this.blogSelectors.title) {
        const count = $(selector).length;
        if (count > 0) {
          logger.info(`✓ Title "${selector}": Found ${count} elements`);
          logger.info(`  Example: ${$(selector).first().text().trim().substring(0, 50)}...`);
        }
      }

      for (const selector of this.blogSelectors.link) {
        const count = $(selector).length;
        if (count > 0) {
          logger.info(`✓ Link "${selector}": Found ${count} elements`);
          logger.info(`  Example: ${$(selector).first().attr('href')}`);
        }
      }

      return true;
    } catch (error) {
      logger.error('Blog scraping test failed:', error.message);
      return false;
    }
  }

  stripHTML(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  removeDuplicates(contentArray) {
    const seen = new Set();
    return contentArray.filter(item => {
      if (seen.has(item.sourceUrl)) {
        return false;
      }
      seen.add(item.sourceUrl);
      return true;
    });
  }

  async summarizeContent(content, maxLength = 300) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    let summary = '';
    
    for (const sentence of sentences) {
      if ((summary + sentence).length > maxLength) break;
      summary += sentence;
    }
    
    return summary.trim() || content.substring(0, maxLength) + '...';
  }

  extractKeyTopics(content) {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = {};

    words.forEach(word => {
      if (word.length > 3 && !commonWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

export const contentFetcher = new ContentFetcher();