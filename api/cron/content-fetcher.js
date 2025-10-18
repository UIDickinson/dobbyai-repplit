import { contentFetcher } from '../../src/services/content-fetcher.js';
import sentientBlogSelectors from '../../src/config/sentient-blog-selectors.js';
import { getUnusedContent, markContentAsUsed, savePost, updatePost, logAnalytics } from '../../src/config/database.js';
import { logger } from '../../src/utils/logger.js';
import { parseBoolean } from '../../src/utils/helpers.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Verify cron request
  const authHeader = req.headers.authorization;
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.warn('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info('Starting content fetch from Sentient Labs...');

    // 🆕 Configure custom selectors for Sentient blog
    contentFetcher.configureSelectors(sentientBlogSelectors);

    // Fetch content
    const fetchedContent = await contentFetcher.fetchSentientLabsContent();

    if (fetchedContent.length === 0) {
      logger.warn('No content fetched from Sentient Labs');
      return res.status(200).json({
        success: true,
        fetched: 0,
        message: 'No new content found'
      });
    }

    // Log analytics
    await logAnalytics('content_fetched', {
      count: fetchedContent.length,
      sources: fetchedContent.map(c => c.sourceUrl),
      timestamp: new Date().toISOString()
    });

    logger.info(`Successfully fetched ${fetchedContent.length} pieces of content`);

    return res.status(200).json({
      success: true,
      fetched: fetchedContent.length,
      content: fetchedContent.map(c => ({
        title: c.title,
        url: c.sourceUrl
      }))
    });

  } catch (error) {
    logger.error('Content fetch cron error:', error);
    
    await logAnalytics('content_fetch_failed', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}