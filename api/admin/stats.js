import { sql } from '@vercel/postgres';
import { getAnalytics } from '../../src/config/database.js';
import { logger } from '../../src/utils/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    logger.warn('Unauthorized admin API request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days);

    // Get analytics data
    const analytics = await getAnalytics(null, daysNum);

    // Get conversation stats
    const conversationStats = await sql`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT reddit_user) as unique_users,
        AVG(LENGTH(user_message)) as avg_message_length,
        AVG(LENGTH(ai_response)) as avg_response_length,
        SUM(tokens_used) as total_tokens
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
    `;

    // Get post stats
    const postStats = await sql`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts,
        SUM(upvotes) as total_upvotes,
        SUM(comments) as total_comments,
        AVG(upvotes) as avg_upvotes,
        post_type,
        COUNT(*) as count_by_type
      FROM posts
      WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
      GROUP BY post_type
    `;

    // Get top performing posts
    const topPosts = await sql`
      SELECT 
        id, title, reddit_post_id, upvotes, comments, post_type,
        posted_at
      FROM posts
      WHERE status = 'published'
        AND posted_at >= NOW() - INTERVAL '${daysNum} days'
      ORDER BY upvotes DESC
      LIMIT 10
    `;

    // Get most active users
    const activeUsers = await sql`
      SELECT 
        reddit_user,
        COUNT(*) as message_count,
        MAX(created_at) as last_interaction
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
      GROUP BY reddit_user
      ORDER BY message_count DESC
      LIMIT 10
    `;

    // Get AI provider usage
    const providerUsage = await sql`
      SELECT 
        ai_provider,
        COUNT(*) as usage_count,
        SUM(tokens_used) as total_tokens
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '${daysNum} days'
        AND ai_provider IS NOT NULL
      GROUP BY ai_provider
    `;

    // Get content cache stats
    const contentStats = await sql`
      SELECT 
        COUNT(*) as total_cached,
        COUNT(CASE WHEN used_for_post THEN 1 END) as used_content,
        COUNT(CASE WHEN NOT used_for_post THEN 1 END) as unused_content
      FROM content_cache
    `;

    logger.info(`Stats retrieved for last ${daysNum} days`);

    return res.status(200).json({
      success: true,
      period: `Last ${daysNum} days`,
      conversations: {
        total: conversationStats.rows[0]?.total_conversations || 0,
        uniqueUsers: conversationStats.rows[0]?.unique_users || 0,
        avgMessageLength: Math.round(conversationStats.rows[0]?.avg_message_length || 0),
        avgResponseLength: Math.round(conversationStats.rows[0]?.avg_response_length || 0),
        totalTokens: conversationStats.rows[0]?.total_tokens || 0
      },
      posts: {
        total: postStats.rows[0]?.total_posts || 0,
        published: postStats.rows[0]?.published_posts || 0,
        drafts: postStats.rows[0]?.draft_posts || 0,
        totalUpvotes: postStats.rows.reduce((sum, row) => sum + (row.total_upvotes || 0), 0),
        totalComments: postStats.rows.reduce((sum, row) => sum + (row.total_comments || 0), 0),
        avgUpvotes: Math.round(postStats.rows[0]?.avg_upvotes || 0),
        byType: postStats.rows.map(row => ({
          type: row.post_type,
          count: row.count_by_type
        }))
      },
      topPosts: topPosts.rows.map(post => ({
        id: post.id,
        title: post.title,
        redditId: post.reddit_post_id,
        upvotes: post.upvotes,
        comments: post.comments,
        type: post.post_type,
        postedAt: post.posted_at,
        url: post.reddit_post_id ? `https://reddit.com/comments/${post.reddit_post_id}` : null
      })),
      activeUsers: activeUsers.rows.map(user => ({
        username: user.reddit_user,
        messageCount: user.message_count,
        lastInteraction: user.last_interaction
      })),
      aiProviders: providerUsage.rows.map(provider => ({
        provider: provider.ai_provider,
        usageCount: provider.usage_count,
        totalTokens: provider.total_tokens
      })),
      content: {
        totalCached: contentStats.rows[0]?.total_cached || 0,
        used: contentStats.rows[0]?.used_content || 0,
        unused: contentStats.rows[0]?.unused_content || 0
      },
      analytics: analytics
    });

  } catch (error) {
    logger.error('Stats API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}