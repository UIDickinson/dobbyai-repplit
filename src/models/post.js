import { sql } from '@vercel/postgres';
import { logger } from '../utils/logger.js';

export class Post {
  constructor(data) {
    this.id = data.id;
    this.redditPostId = data.reddit_post_id;
    this.title = data.title;
    this.content = data.content;
    this.subreddit = data.subreddit;
    this.postType = data.post_type;
    this.sourceUrl = data.source_url;
    this.status = data.status;
    this.scheduledAt = data.scheduled_at;
    this.postedAt = data.posted_at;
    this.upvotes = data.upvotes || 0;
    this.comments = data.comments || 0;
    this.createdAt = data.created_at;
    this.metadata = data.metadata || {};
  }

  // Create a new post
  static async create(data) {
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
        RETURNING *
      `;
      
      logger.info(`Post created: ${data.title}`);
      return new Post(result.rows[0]);
    } catch (error) {
      logger.error('Error creating post:', error);
      throw error;
    }
  }

  // Find post by ID
  static async findById(id) {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE id = ${id}
      `;
      
      return result.rows.length > 0 ? new Post(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding post:', error);
      throw error;
    }
  }

  // Find by Reddit post ID
  static async findByRedditId(redditPostId) {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE reddit_post_id = ${redditPostId}
      `;
      
      return result.rows.length > 0 ? new Post(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding post by Reddit ID:', error);
      throw error;
    }
  }

  // Get all posts with filters
  static async getAll(filters = {}) {
    try {
      let query = sql`SELECT * FROM posts WHERE 1=1`;
      
      if (filters.status) {
        query = sql`${query} AND status = ${filters.status}`;
      }
      
      if (filters.postType) {
        query = sql`${query} AND post_type = ${filters.postType}`;
      }
      
      if (filters.subreddit) {
        query = sql`${query} AND subreddit = ${filters.subreddit}`;
      }
      
      query = sql`${query} ORDER BY created_at DESC`;
      
      if (filters.limit) {
        query = sql`${query} LIMIT ${filters.limit}`;
      }
      
      const result = await query;
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting posts:', error);
      return [];
    }
  }

  // Get published posts
  static async getPublished(limit = 50) {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE status = 'published'
        ORDER BY posted_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting published posts:', error);
      return [];
    }
  }

  // Get draft posts
  static async getDrafts(limit = 50) {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE status = 'draft'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting draft posts:', error);
      return [];
    }
  }

  // Get scheduled posts
  static async getScheduled() {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE status = 'scheduled'
          AND scheduled_at IS NOT NULL
        ORDER BY scheduled_at ASC
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting scheduled posts:', error);
      return [];
    }
  }

  // Get posts ready to publish
  static async getReadyToPublish() {
    try {
      const now = new Date().toISOString();
      const result = await sql`
        SELECT * FROM posts
        WHERE status = 'scheduled'
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= ${now}
        ORDER BY scheduled_at ASC
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting posts ready to publish:', error);
      return [];
    }
  }

  // Get top performing posts
  static async getTopPerforming(limit = 10, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT * FROM posts
        WHERE status = 'published'
          AND posted_at >= ${cutoffDate.toISOString()}
        ORDER BY (upvotes + comments * 2) DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting top performing posts:', error);
      return [];
    }
  }

  // Get posts by type
  static async getByType(postType, limit = 50) {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE post_type = ${postType}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting posts by type:', error);
      return [];
    }
  }

  // Get posts by date range
  static async getByDateRange(startDate, endDate) {
    try {
      const result = await sql`
        SELECT * FROM posts
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        ORDER BY created_at DESC
      `;
      
      return result.rows.map(row => new Post(row));
    } catch (error) {
      logger.error('Error getting posts by date range:', error);
      return [];
    }
  }

  // Get statistics
  static async getStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          COUNT(*) as total_posts,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
          SUM(upvotes) as total_upvotes,
          SUM(comments) as total_comments,
          AVG(upvotes) as avg_upvotes,
          AVG(comments) as avg_comments
        FROM posts
        WHERE created_at >= ${cutoffDate.toISOString()}
      `;
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting post stats:', error);
      return null;
    }
  }

  // Get post type distribution
  static async getTypeDistribution(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          post_type,
          COUNT(*) as count,
          AVG(upvotes) as avg_upvotes,
          AVG(comments) as avg_comments
        FROM posts
        WHERE created_at >= ${cutoffDate.toISOString()}
        GROUP BY post_type
        ORDER BY count DESC
      `;
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting type distribution:', error);
      return [];
    }
  }

  // Update post
  async update(updates) {
    try {
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      if (updates.redditPostId !== undefined) {
        setClauses.push(`reddit_post_id = $${paramCount++}`);
        values.push(updates.redditPostId);
      }
      if (updates.title !== undefined) {
        setClauses.push(`title = $${paramCount++}`);
        values.push(updates.title);
      }
      if (updates.content !== undefined) {
        setClauses.push(`content = $${paramCount++}`);
        values.push(updates.content);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }
      if (updates.scheduledAt !== undefined) {
        setClauses.push(`scheduled_at = $${paramCount++}`);
        values.push(updates.scheduledAt);
      }
      if (updates.postedAt !== undefined) {
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

      if (setClauses.length === 0) {
        return this;
      }

      values.push(this.id);
      
      const query = `
        UPDATE posts 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await sql.query(query, values);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        logger.info(`Post ${this.id} updated`);
      }
      
      return this;
    } catch (error) {
      logger.error('Error updating post:', error);
      throw error;
    }
  }

  // Update engagement metrics
  async updateEngagement(upvotes, comments) {
    try {
      const result = await sql`
        UPDATE posts
        SET upvotes = ${upvotes},
            comments = ${comments}
        WHERE id = ${this.id}
        RETURNING *
      `;
      
      if (result.rows.length > 0) {
        this.upvotes = upvotes;
        this.comments = comments;
        logger.info(`Updated engagement for post ${this.id}: ${upvotes} upvotes, ${comments} comments`);
      }
      
      return this;
    } catch (error) {
      logger.error('Error updating engagement:', error);
      throw error;
    }
  }

  // Mark as published
  async markAsPublished(redditPostId) {
    try {
      const result = await sql`
        UPDATE posts
        SET status = 'published',
            reddit_post_id = ${redditPostId},
            posted_at = CURRENT_TIMESTAMP
        WHERE id = ${this.id}
        RETURNING *
      `;
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        logger.info(`Post ${this.id} marked as published: ${redditPostId}`);
      }
      
      return this;
    } catch (error) {
      logger.error('Error marking post as published:', error);
      throw error;
    }
  }

  // Mark as failed
  async markAsFailed(errorMessage) {
    try {
      const metadata = { ...this.metadata, error: errorMessage, failedAt: new Date().toISOString() };
      
      const result = await sql`
        UPDATE posts
        SET status = 'failed',
            metadata = ${JSON.stringify(metadata)}
        WHERE id = ${this.id}
        RETURNING *
      `;
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        logger.info(`Post ${this.id} marked as failed`);
      }
      
      return this;
    } catch (error) {
      logger.error('Error marking post as failed:', error);
      throw error;
    }
  }

  // Delete post
  async delete() {
    try {
      await sql`
        DELETE FROM posts
        WHERE id = ${this.id}
      `;
      
      logger.info(`Post ${this.id} deleted`);
      return true;
    } catch (error) {
      logger.error('Error deleting post:', error);
      throw error;
    }
  }

  // Delete old posts (cleanup)
  static async deleteOlderThan(days, status = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query;
      if (status) {
        query = sql`
          DELETE FROM posts
          WHERE created_at < ${cutoffDate.toISOString()}
            AND status = ${status}
          RETURNING id
        `;
      } else {
        query = sql`
          DELETE FROM posts
          WHERE created_at < ${cutoffDate.toISOString()}
          RETURNING id
        `;
      }

      const result = await query;
      logger.info(`Deleted ${result.rows.length} old posts`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error deleting old posts:', error);
      throw error;
    }
  }

  // Get Reddit URL
  getRedditUrl() {
    if (!this.redditPostId) return null;
    return `https://reddit.com/comments/${this.redditPostId}`;
  }

  // Calculate engagement score
  getEngagementScore() {
    return this.upvotes + (this.comments * 2);
  }

  // Get performance metrics
  getPerformance() {
    const engagementScore = this.getEngagementScore();
    const hoursOld = this.postedAt 
      ? (Date.now() - new Date(this.postedAt).getTime()) / (1000 * 60 * 60)
      : 0;
    
    return {
      upvotes: this.upvotes,
      comments: this.comments,
      engagementScore,
      hoursOld: Math.round(hoursOld),
      engagementPerHour: hoursOld > 0 ? engagementScore / hoursOld : 0,
    };
  }

  // Format for API response
  toJSON() {
    return {
      id: this.id,
      redditPostId: this.redditPostId,
      title: this.title,
      content: this.content,
      subreddit: this.subreddit,
      postType: this.postType,
      sourceUrl: this.sourceUrl,
      status: this.status,
      scheduledAt: this.scheduledAt,
      postedAt: this.postedAt,
      upvotes: this.upvotes,
      comments: this.comments,
      createdAt: this.createdAt,
      metadata: this.metadata,
      redditUrl: this.getRedditUrl(),
      performance: this.status === 'published' ? this.getPerformance() : null,
    };
  }

  // Get summary
  getSummary() {
    return {
      id: this.id,
      title: this.title,
      titlePreview: this.title.substring(0, 50) + (this.title.length > 50 ? '...' : ''),
      postType: this.postType,
      status: this.status,
      upvotes: this.upvotes,
      comments: this.comments,
      postedAt: this.postedAt,
      redditUrl: this.getRedditUrl(),
    };
  }
}

export default Post;