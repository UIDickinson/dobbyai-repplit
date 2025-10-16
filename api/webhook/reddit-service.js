import snoowrap from 'snoowrap';
import Bottleneck from 'bottleneck';
import { logger } from '../utils/logger.js';

class RedditService {
  constructor() {
    this.client = null;
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 2000, // Reddit API: 60 requests per minute
      reservoir: 60,
      reservoirRefreshAmount: 60,
      reservoirRefreshInterval: 60 * 1000
    });
    this.initialize();
  }

  initialize() {
    try {
      this.client = new snoowrap({
        userAgent: process.env.REDDIT_USER_AGENT,
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD
      });

      // Configure snoowrap
      this.client.config({
        requestDelay: 2000,
        warnings: false,
        continueAfterRatelimitError: true,
        retryErrorCodes: [502, 503, 504, 522],
        maxRetryAttempts: 3
      });

      logger.info('Reddit client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Reddit client:', error);
      throw error;
    }
  }

  async checkUnreadMessages() {
    return this.limiter.schedule(async () => {
      try {
        const messages = await this.client.getUnreadMessages({ limit: 25 });
        logger.info(`Found ${messages.length} unread messages`);
        return messages;
      } catch (error) {
        logger.error('Error checking unread messages:', error);
        throw error;
      }
    });
  }

  async replyToMessage(message, responseText) {
    return this.limiter.schedule(async () => {
      try {
        await message.reply(responseText);
        await message.markAsRead();
        logger.info(`Replied to message from u/${message.author.name}`);
        return true;
      } catch (error) {
        logger.error('Error replying to message:', error);
        throw error;
      }
    });
  }

  async submitPost(subreddit, title, content) {
    return this.limiter.schedule(async () => {
      try {
        const submission = await this.client
          .getSubreddit(subreddit)
          .submitSelfpost({
            title: title,
            text: content
          });
        
        logger.info(`Posted to r/${subreddit}: ${submission.id}`);
        return submission;
      } catch (error) {
        logger.error('Error submitting post:', error);
        throw error;
      }
    });
  }

  async submitPostToProfile(title, content) {
    return this.limiter.schedule(async () => {
      try {
        const username = process.env.REDDIT_USERNAME;
        const submission = await this.client
          .getSubreddit(`u_${username}`)
          .submitSelfpost({
            title: title,
            text: content
          });
        
        logger.info(`Posted to profile: ${submission.id}`);
        return submission;
      } catch (error) {
        logger.error('Error posting to profile:', error);
        throw error;
      }
    });
  }

  async getPostStats(postId) {
    return this.limiter.schedule(async () => {
      try {
        const submission = await this.client.getSubmission(postId);
        await submission.fetch();
        
        return {
          upvotes: submission.ups,
          downvotes: submission.downs,
          score: submission.score,
          comments: submission.num_comments,
          upvoteRatio: submission.upvote_ratio
        };
      } catch (error) {
        logger.error('Error getting post stats:', error);
        return null;
      }
    });
  }

  async editPost(postId, newContent) {
    return this.limiter.schedule(async () => {
      try {
        const submission = await this.client.getSubmission(postId);
        await submission.edit(newContent);
        logger.info(`Edited post: ${postId}`);
        return true;
      } catch (error) {
        logger.error('Error editing post:', error);
        throw error;
      }
    });
  }

  async deletePost(postId) {
    return this.limiter.schedule(async () => {
      try {
        const submission = await this.client.getSubmission(postId);
        await submission.delete();
        logger.info(`Deleted post: ${postId}`);
        return true;
      } catch (error) {
        logger.error('Error deleting post:', error);
        throw error;
      }
    });
  }

  async getUserInfo(username) {
    return this.limiter.schedule(async () => {
      try {
        const user = await this.client.getUser(username);
        await user.fetch();
        
        return {
          name: user.name,
          createdAt: new Date(user.created_utc * 1000),
          linkKarma: user.link_karma,
          commentKarma: user.comment_karma,
          isVerified: user.verified
        };
      } catch (error) {
        logger.error('Error getting user info:', error);
        return null;
      }
    });
  }

  formatMessageForResponse(message) {
    return {
      id: message.id,
      author: message.author.name,
      body: message.body,
      subject: message.subject,
      createdAt: new Date(message.created_utc * 1000),
      wasComment: message.was_comment
    };
  }

  async testConnection() {
    try {
      const me = await this.client.getMe();
      logger.info(`Connected as u/${me.name}`);
      return true;
    } catch (error) {
      logger.error('Reddit connection test failed:', error);
      return false;
    }
  }
}

export const redditService = new RedditService();