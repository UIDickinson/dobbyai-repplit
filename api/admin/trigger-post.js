import { redditService } from '../../src/services/reddit-service.js';
import { postGenerator } from '../../src/services/post-generator.js';
import { savePost, updatePost, logAnalytics } from '../../src/config/database.js';
import { logger } from '../../src/utils/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    logger.warn('Unauthorized admin API request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { content, title, postType = 'insight', subreddit = null } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    logger.info('Manually triggered post generation');

    let generatedPost;

    // If title is provided, use it; otherwise generate
    if (title) {
      generatedPost = {
        title: title,
        content: content,
        metadata: {
          manuallyTriggered: true,
          postType: postType
        }
      };
    } else {
      generatedPost = await postGenerator.generatePost(content, postType);
      generatedPost.metadata.manuallyTriggered = true;
    }

    // Validate post
    const validation = postGenerator.validatePost(generatedPost);
    if (!validation.valid) {
      logger.error('Post validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Post validation failed',
        details: validation.errors
      });
    }

    // Format for Reddit
    const formattedContent = postGenerator.formatPostForReddit(generatedPost);

    // Save to database
    const savedPost = await savePost({
      title: generatedPost.title,
      content: formattedContent,
      subreddit: subreddit,
      postType: postType,
      status: 'pending',
      metadata: generatedPost.metadata
    });

    // Post to Reddit
    let submission;
    if (subreddit) {
      submission = await redditService.submitPost(
        subreddit,
        generatedPost.title,
        formattedContent
      );
    } else {
      submission = await redditService.submitPostToProfile(
        generatedPost.title,
        formattedContent
      );
    }

    // Update post with Reddit ID
    await updatePost(savedPost.id, {
      redditPostId: submission.id,
      status: 'published',
      postedAt: new Date().toISOString()
    });

    // Log analytics
    await logAnalytics('manual_post_created', {
      postId: savedPost.id,
      redditPostId: submission.id,
      postType: postType,
      subreddit: subreddit || 'profile'
    });

    logger.info(`Manually triggered post published: ${submission.id}`);

    return res.status(200).json({
      success: true,
      post: {
        id: savedPost.id,
        redditId: submission.id,
        title: generatedPost.title,
        url: `https://reddit.com${submission.permalink}`,
        postType: postType,
        subreddit: subreddit || 'profile'
      }
    });

  } catch (error) {
    logger.error('Manual post trigger error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}