import { sql } from '@vercel/postgres';
import { logger } from '../utils/logger.js';

export class Conversation {
  constructor(data) {
    this.id = data.id;
    this.redditUser = data.reddit_user;
    this.messageId = data.message_id;
    this.userMessage = data.user_message;
    this.aiResponse = data.ai_response;
    this.aiProvider = data.ai_provider;
    this.tokensUsed = data.tokens_used;
    this.createdAt = data.created_at;
    this.metadata = data.metadata || {};
  }

  // Create a new conversation
  static async create(data) {
    try {
      const result = await sql`
        INSERT INTO conversations (
          reddit_user, message_id, user_message, ai_response,
          ai_provider, tokens_used, metadata
        )
        VALUES (
          ${data.redditUser}, ${data.messageId}, ${data.userMessage},
          ${data.aiResponse}, ${data.aiProvider || null}, ${data.tokensUsed || 0},
          ${JSON.stringify(data.metadata || {})}
        )
        RETURNING *
      `;
      
      logger.info(`Conversation created for u/${data.redditUser}`);
      return new Conversation(result.rows[0]);
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Find conversation by ID
  static async findById(id) {
    try {
      const result = await sql`
        SELECT * FROM conversations
        WHERE id = ${id}
      `;
      
      return result.rows.length > 0 ? new Conversation(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding conversation:', error);
      throw error;
    }
  }

  // Find by message ID
  static async findByMessageId(messageId) {
    try {
      const result = await sql`
        SELECT * FROM conversations
        WHERE message_id = ${messageId}
      `;
      
      return result.rows.length > 0 ? new Conversation(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding conversation by message ID:', error);
      throw error;
    }
  }

  // Get conversation history for a user
  static async getHistoryByUser(redditUser, limit = 10) {
    try {
      const result = await sql`
        SELECT * FROM conversations
        WHERE reddit_user = ${redditUser}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Conversation(row)).reverse();
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Get recent conversations
  static async getRecent(limit = 50) {
    try {
      const result = await sql`
        SELECT * FROM conversations
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Conversation(row));
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      return [];
    }
  }

  // Get conversations by date range
  static async getByDateRange(startDate, endDate) {
    try {
      const result = await sql`
        SELECT * FROM conversations
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        ORDER BY created_at DESC
      `;
      
      return result.rows.map(row => new Conversation(row));
    } catch (error) {
      logger.error('Error getting conversations by date range:', error);
      return [];
    }
  }

  // Get most active users
  static async getMostActiveUsers(limit = 10, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          reddit_user,
          COUNT(*) as message_count,
          AVG(LENGTH(user_message)) as avg_message_length,
          MAX(created_at) as last_interaction,
          SUM(tokens_used) as total_tokens
        FROM conversations
        WHERE created_at >= ${cutoffDate.toISOString()}
        GROUP BY reddit_user
        ORDER BY message_count DESC
        LIMIT ${limit}
      `;
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting active users:', error);
      return [];
    }
  }

  // Get total conversation count
  static async getTotalCount() {
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM conversations
      `;
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting total count:', error);
      return 0;
    }
  }

  // Get statistics
  static async getStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(DISTINCT reddit_user) as unique_users,
          AVG(LENGTH(user_message)) as avg_message_length,
          AVG(LENGTH(ai_response)) as avg_response_length,
          SUM(tokens_used) as total_tokens,
          AVG(tokens_used) as avg_tokens_per_conversation
        FROM conversations
        WHERE created_at >= ${cutoffDate.toISOString()}
      `;
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting conversation stats:', error);
      return null;
    }
  }

  // Get provider usage stats
  static async getProviderStats(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          ai_provider,
          COUNT(*) as usage_count,
          SUM(tokens_used) as total_tokens,
          AVG(tokens_used) as avg_tokens
        FROM conversations
        WHERE created_at >= ${cutoffDate.toISOString()}
          AND ai_provider IS NOT NULL
        GROUP BY ai_provider
      `;
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting provider stats:', error);
      return [];
    }
  }

  // Search conversations
  static async search(query, limit = 20) {
    try {
      const searchTerm = `%${query}%`;
      const result = await sql`
        SELECT * FROM conversations
        WHERE user_message ILIKE ${searchTerm}
           OR ai_response ILIKE ${searchTerm}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Conversation(row));
    } catch (error) {
      logger.error('Error searching conversations:', error);
      return [];
    }
  }

  // Delete old conversations (for cleanup)
  static async deleteOlderThan(days) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        DELETE FROM conversations
        WHERE created_at < ${cutoffDate.toISOString()}
        RETURNING id
      `;
      
      logger.info(`Deleted ${result.rows.length} old conversations`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error deleting old conversations:', error);
      throw error;
    }
  }

  // Update metadata
  async updateMetadata(newMetadata) {
    try {
      const merged = { ...this.metadata, ...newMetadata };
      
      const result = await sql`
        UPDATE conversations
        SET metadata = ${JSON.stringify(merged)}
        WHERE id = ${this.id}
        RETURNING *
      `;
      
      if (result.rows.length > 0) {
        this.metadata = merged;
        logger.info(`Updated metadata for conversation ${this.id}`);
      }
      
      return this;
    } catch (error) {
      logger.error('Error updating conversation metadata:', error);
      throw error;
    }
  }

  // Format for display
  toJSON() {
    return {
      id: this.id,
      redditUser: this.redditUser,
      messageId: this.messageId,
      userMessage: this.userMessage,
      aiResponse: this.aiResponse,
      aiProvider: this.aiProvider,
      tokensUsed: this.tokensUsed,
      createdAt: this.createdAt,
      metadata: this.metadata,
    };
  }

  // Get summary
  getSummary() {
    return {
      id: this.id,
      user: this.redditUser,
      messagePreview: this.userMessage.substring(0, 50) + '...',
      responsePreview: this.aiResponse.substring(0, 50) + '...',
      provider: this.aiProvider,
      tokens: this.tokensUsed,
      createdAt: this.createdAt,
    };
  }
}

export default Conversation;