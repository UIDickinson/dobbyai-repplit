import { sql } from '@vercel/postgres';
import { logger } from '../utils/logger.js';

export class Analytics {
  constructor(data) {
    this.id = data.id;
    this.eventType = data.event_type;
    this.eventData = data.event_data || {};
    this.timestamp = data.timestamp;
  }

  // Log an event
  static async logEvent(eventType, eventData = {}) {
    try {
      const result = await sql`
        INSERT INTO analytics (event_type, event_data)
        VALUES (${eventType}, ${JSON.stringify(eventData)})
        RETURNING *
      `;
      
      return new Analytics(result.rows[0]);
    } catch (error) {
      logger.error('Error logging analytics event:', error);
      // Don't throw - analytics failures shouldn't break the app
      return null;
    }
  }

  // Get events by type
  static async getEventsByType(eventType, limit = 100) {
    try {
      const result = await sql`
        SELECT * FROM analytics
        WHERE event_type = ${eventType}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map(row => new Analytics(row));
    } catch (error) {
      logger.error('Error getting events by type:', error);
      return [];
    }
  }

  // Get events by date range
  static async getEventsByDateRange(startDate, endDate, eventType = null) {
    try {
      let query;
      if (eventType) {
        query = sql`
          SELECT * FROM analytics
          WHERE timestamp BETWEEN ${startDate} AND ${endDate}
            AND event_type = ${eventType}
          ORDER BY timestamp DESC
        `;
      } else {
        query = sql`
          SELECT * FROM analytics
          WHERE timestamp BETWEEN ${startDate} AND ${endDate}
          ORDER BY timestamp DESC
        `;
      }
      
      const result = await query;
      return result.rows.map(row => new Analytics(row));
    } catch (error) {
      logger.error('Error getting events by date range:', error);
      return [];
    }
  }

  // Get event counts
  static async getEventCounts(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          event_type,
          COUNT(*) as count,
          DATE(timestamp) as date
        FROM analytics
        WHERE timestamp >= ${cutoffDate.toISOString()}
        GROUP BY event_type, DATE(timestamp)
        ORDER BY date DESC, count DESC
      `;
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting event counts:', error);
      return [];
    }
  }

  // Get summary statistics
  static async getSummary(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        SELECT 
          event_type,
          COUNT(*) as total_count,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          MIN(timestamp) as first_event,
          MAX(timestamp) as last_event
        FROM analytics
        WHERE timestamp >= ${cutoffDate.toISOString()}
        GROUP BY event_type
        ORDER BY total_count DESC
      `;
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      return [];
    }
  }

  // Get hourly distribution
  static async getHourlyDistribution(eventType = null, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query;
      if (eventType) {
        query = sql`
          SELECT 
            EXTRACT(HOUR FROM timestamp) as hour,
            COUNT(*) as count
          FROM analytics
          WHERE timestamp >= ${cutoffDate.toISOString()}
            AND event_type = ${eventType}
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY hour
        `;
      } else {
        query = sql`
          SELECT 
            EXTRACT(HOUR FROM timestamp) as hour,
            COUNT(*) as count
          FROM analytics
          WHERE timestamp >= ${cutoffDate.toISOString()}
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY hour
        `;
      }
      
      const result = await query;
      return result.rows;
    } catch (error) {
      logger.error('Error getting hourly distribution:', error);
      return [];
    }
  }

  // Get daily trends
  static async getDailyTrends(eventType = null, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query;
      if (eventType) {
        query = sql`
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count
          FROM analytics
          WHERE timestamp >= ${cutoffDate.toISOString()}
            AND event_type = ${eventType}
          GROUP BY DATE(timestamp)
          ORDER BY date DESC
        `;
      } else {
        query = sql`
          SELECT 
            DATE(timestamp) as date,
            event_type,
            COUNT(*) as count
          FROM analytics
          WHERE timestamp >= ${cutoffDate.toISOString()}
          GROUP BY DATE(timestamp), event_type
          ORDER BY date DESC
        `;
      }
      
      const result = await query;
      return result.rows;
    } catch (error) {
      logger.error('Error getting daily trends:', error);
      return [];
    }
  }

  // Get total event count
  static async getTotalCount(eventType = null) {
    try {
      let query;
      if (eventType) {
        query = sql`
          SELECT COUNT(*) as count
          FROM analytics
          WHERE event_type = ${eventType}
        `;
      } else {
        query = sql`
          SELECT COUNT(*) as count
          FROM analytics
        `;
      }
      
      const result = await query;
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting total count:', error);
      return 0;
    }
  }

  // Delete old analytics data
  static async deleteOlderThan(days) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await sql`
        DELETE FROM analytics
        WHERE timestamp < ${cutoffDate.toISOString()}
        RETURNING id
      `;
      
      logger.info(`Deleted ${result.rows.length} old analytics records`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error deleting old analytics:', error);
      throw error;
    }
  }

  // Common event types
  static EventTypes = {
    DM_PROCESSED: 'dm_processed',
    DM_FAILED: 'dm_failed',
    CHAT_API_REQUEST: 'chat_api_request',
    AUTO_POST_CREATED: 'auto_post_created',
    AUTO_POST_FAILED: 'auto_post_failed',
    MANUAL_POST_CREATED: 'manual_post_created',
    CONTENT_FETCHED: 'content_fetched',
    CONTENT_FETCH_FAILED: 'content_fetch_failed',
    POST_ENGAGEMENT_UPDATED: 'post_engagement_updated',
    ERROR: 'error',
    WARNING: 'warning',
  };

  // Helper methods for common events
  static async logDMProcessed(data) {
    return this.logEvent(this.EventTypes.DM_PROCESSED, data);
  }

  static async logChatRequest(data) {
    return this.logEvent(this.EventTypes.CHAT_API_REQUEST, data);
  }

  static async logAutoPost(data) {
    return this.logEvent(this.EventTypes.AUTO_POST_CREATED, data);
  }

  static async logContentFetched(data) {
    return this.logEvent(this.EventTypes.CONTENT_FETCHED, data);
  }

  static async logError(error, context = {}) {
    return this.logEvent(this.EventTypes.ERROR, {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  // Format for API response
  toJSON() {
    return {
      id: this.id,
      eventType: this.eventType,
      eventData: this.eventData,
      timestamp: this.timestamp,
    };
  }
}

export default Analytics;