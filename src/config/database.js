import { sql } from '@vercel/postgres';
import { logger } from '../utils/logger.js';

export async function initializeDatabase() {
  try {
    // Create conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        reddit_user VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) UNIQUE NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        ai_provider VARCHAR(50),
        tokens_used INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `;

    // Create posts table
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        reddit_post_id VARCHAR(255) UNIQUE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        subreddit VARCHAR(255),
        post_type VARCHAR(50) DEFAULT 'autonomous',
        source_url TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        posted_at TIMESTAMP,
        upvotes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `;

    // Create analytics table
    await sql`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create content_cache table for Sentient Labs content
    await sql`
      CREATE TABLE IF NOT EXISTS content_cache (
        id SERIAL PRIMARY KEY,
        source_url TEXT UNIQUE NOT NULL,
        title VARCHAR(500),
        content TEXT,
        summary TEXT,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_for_post BOOLEAN DEFAULT FALSE,
        metadata JSONB
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_user 
      ON conversations(reddit_user)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_created 
      ON conversations(created_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_posts_status 
      ON posts(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_analytics_event 
      ON analytics(event_type, timestamp)
    `;

    logger.info('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

export async function saveConversation(data) {
  try {
    const result = await sql`
      INSERT INTO conversations (
        reddit_user, message_id, user_message, ai_response, 
        ai_provider, tokens_used, metadata
      )
      VALUES (
        ${data.redditUser}, ${data.messageId}, ${data.userMessage},
        ${data.aiResponse}, ${data.aiProvider}, ${data.tokensUsed},
        ${JSON.stringify(data.metadata || {})}
      )
      RETURNING id
    `;
    return result.rows[0];
  } catch (error) {
    logger.error('Error saving conversation:', error);
    throw error;
  }
}

export async function getConversationHistory(redditUser, limit = 10) {
  try {
    const result = await sql`
      SELECT user_message, ai_response, created_at
      FROM conversations
      WHERE reddit_user = ${redditUser}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result.rows.reverse(); // Return chronological order
  } catch (error) {
    logger.error('Error fetching conversation history:', error);
    return [];
  }
}

export async function savePost(data) {
  try {
    const result = await sql`
      INSERT INTO posts (
        title, content, subreddit, post_type, source_url,
        status, scheduled_at, metadata
      )
      VALUES (
        ${data.title}, ${data.content}, ${data.subreddit || null},
        ${data.postType || 'autonomous'}, ${data.sourceUrl || null},
        ${data.status || 'draft'}, ${data.scheduledAt || null},
        ${JSON.stringify(data.metadata || {})}
      )
      RETURNING id
    `;
    return result.rows[0];
  } catch (error) {
    logger.error('Error saving post:', error);
    throw error;
  }
}

export async function updatePost(postId, updates) {
  try {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.redditPostId) {
      setClauses.push(`reddit_post_id = $${paramCount++}`);
      values.push(updates.redditPostId);
    }
    if (updates.status) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.postedAt) {
      setClauses.push(`posted_at = $${paramCount++}`);
      values.push(updates.postedAt);
    }
    if (updates.upvotes !== undefined) {
      setClauses.push(`upvotes = $${paramCount++}`);
      values.push(updates.upvotes);
    }
    if (updates.comments !== undefined) {
      setClauses.push(`comments = $${paramCount++}`);
      values.push(updates.comments);
    }

    values.push(postId);
    
    const query = `
      UPDATE posts 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await sql.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating post:', error);
    throw error;
  }
}

export async function logAnalytics(eventType, eventData) {
  try {
    await sql`
      INSERT INTO analytics (event_type, event_data)
      VALUES (${eventType}, ${JSON.stringify(eventData)})
    `;
  } catch (error) {
    logger.error('Error logging analytics:', error);
  }
}

export async function getAnalytics(eventType = null, days = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = sql`
      SELECT event_type, COUNT(*) as count, 
             DATE(timestamp) as date
      FROM analytics
      WHERE timestamp >= ${cutoffDate.toISOString()}
    `;

    if (eventType) {
      query = sql`
        ${query}
        AND event_type = ${eventType}
      `;
    }

    query = sql`
      ${query}
      GROUP BY event_type, DATE(timestamp)
      ORDER BY date DESC
    `;

    const result = await query;
    return result.rows;
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    return [];
  }
}

export async function saveContent(data) {
  try {
    const result = await sql`
      INSERT INTO content_cache (
        source_url, title, content, summary, metadata
      )
      VALUES (
        ${data.sourceUrl}, ${data.title}, ${data.content},
        ${data.summary || null}, ${JSON.stringify(data.metadata || {})}
      )
      ON CONFLICT (source_url) 
      DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        summary = EXCLUDED.summary,
        fetched_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    return result.rows[0];
  } catch (error) {
    logger.error('Error saving content:', error);
    throw error;
  }
}

export async function getUnusedContent(limit = 5) {
  try {
    const result = await sql`
      SELECT * FROM content_cache
      WHERE used_for_post = FALSE
      ORDER BY fetched_at DESC
      LIMIT ${limit}
    `;
    return result.rows;
  } catch (error) {
    logger.error('Error fetching unused content:', error);
    return [];
  }
}

export async function markContentAsUsed(contentId) {
  try {
    await sql`
      UPDATE content_cache
      SET used_for_post = TRUE
      WHERE id = ${contentId}
    `;
  } catch (error) {
    logger.error('Error marking content as used:', error);
  }
}