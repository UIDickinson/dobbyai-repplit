import { aiManager } from '../core/ai-manager.js';
import { generateSystemPrompt } from '../core/personality.js';
import { logger } from '../utils/logger.js';

class PostGenerator {
  constructor() {
    this.postTemplates = {
      insight: 'technical insight or breakthrough',
      tutorial: 'educational explanation',
      news: 'industry news or update',
      discussion: 'thought-provoking question',
      announcement: 'product or feature announcement'
    };
  }

  async generatePost(content, postType = 'insight') {
    try {
      const systemPrompt = this.buildPostSystemPrompt(postType);
      const userPrompt = this.buildPostUserPrompt(content, postType);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiManager.chat(messages, {
        temperature: 0.7,
        maxTokens: 800
      });

      console.log('🪶 Raw AI response:', response.content);

      const parsed = this.parsePostResponse(response.content);
      
      console.log('🧩 Parsed Post:', parsed);

      return {
        title: parsed.title,
        content: parsed.body,
        metadata: {
          postType,
          aiProvider: response.provider,
          sourceContentLength: content.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error generating post:', error);
      throw error;
    }
  }

  buildPostSystemPrompt(postType) {
    return `You are DobbyAI, a nerdy AI companion creating a Reddit post.

Your task is to create an engaging Reddit post based on Sentient Labs content.

POST TYPE: ${postType} (${this.postTemplates[postType]})

GUIDELINES:
1. Create a catchy, informative title (max 300 characters)
2. Write engaging content that sparks discussion (500-1500 words)
3. Use your nerdy personality - be enthusiastic but not overwhelming
4. Include relevant technical details but keep it accessible
5. Format for Reddit (paragraphs, occasional bold/italics)
6. End with a question to encourage engagement
7. Be authentic and avoid marketing speak

FORMATTING:
- Use **bold** for emphasis
- Use *italics* for technical terms
- Use > for quotes
- Use line breaks for readability
- Add appropriate emojis sparingly (🤓 🚀 💡 🔬)

Return your response in this exact format:
TITLE: [your title here]

BODY:
[your post content here]`;
  }

  buildPostUserPrompt(content, postType) {
    let prompt = `Create a Reddit post about the following content from Sentient Labs:\n\n${content.substring(0, 2000)}`;

    if (postType === 'insight') {
      prompt += '\n\nFocus on extracting key technical insights and explaining their significance.';
    } else if (postType === 'tutorial') {
      prompt += '\n\nBreak down complex concepts into digestible explanations.';
    } else if (postType === 'news') {
      prompt += '\n\nHighlight what\'s new and why it matters to the community.';
    } else if (postType === 'discussion') {
      prompt += '\n\nFrame this as a thought-provoking discussion starter.';
    }

    return prompt;
  }

  parsePostResponse(response) {
    const titleMatch = response.match(/TITLE:\s*(.+?)(?:\n|$)/);
    const bodyMatch = response.match(/BODY:\s*([\s\S]+)/);

    let title = titleMatch ? titleMatch[1].trim() : 'Untitled Post';
    let body = bodyMatch ? bodyMatch[1].trim() : response;

    // Clean up title
    title = title.replace(/^["']|["']$/g, '').substring(0, 300);

    // Ensure body has minimum length
    if (body.length < 100) {
      body = response; // Use full response if parsing failed
    }

    return { title, body };
  }

  async generateCommentReply(parentComment, context = '') {
    try {
      const systemPrompt = generateSystemPrompt();
      const userPrompt = `You're replying to this comment on Reddit:\n\n"${parentComment}"\n\n${context ? `Context: ${context}` : ''}\n\nProvide a helpful, engaging reply in your nerdy style. Keep it concise (2-4 paragraphs).`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiManager.chat(messages, {
        temperature: 0.8,
        maxTokens: 400
      });

      return response.content;
    } catch (error) {
      logger.error('Error generating comment reply:', error);
      throw error;
    }
  }

  async generateThreadSummary(comments) {
    try {
      const systemPrompt = `You are DobbyAI. Summarize the key points and interesting discussions from this Reddit thread.`;
      const userPrompt = `Summarize these comments:\n\n${comments.slice(0, 10).join('\n\n---\n\n')}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await aiManager.chat(messages, {
        temperature: 0.5,
        maxTokens: 500
      });

      return response.content;
    } catch (error) {
      logger.error('Error generating thread summary:', error);
      throw error;
    }
  }

  determinePostType(content) {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('announce') || contentLower.includes('launch') || contentLower.includes('release')) {
      return 'announcement';
    } else if (contentLower.includes('how to') || contentLower.includes('guide') || contentLower.includes('tutorial')) {
      return 'tutorial';
    } else if (contentLower.includes('breaking') || contentLower.includes('news') || contentLower.includes('update')) {
      return 'news';
    } else if (contentLower.includes('what do you think') || contentLower.includes('discussion')) {
      return 'discussion';
    }
    
    return 'insight';
  }

  validatePost(post) {
    const errors = [];

    if (!post.title || post.title.length < 10) {
      errors.push('Title too short');
    }
    if (post.title.length > 300) {
      errors.push('Title too long');
    }
    if (!post.content || post.content.length < 100) {
      errors.push('Content too short');
    }
    if (post.content.length > 40000) {
      errors.push('Content too long for Reddit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  formatPostForReddit(post) {
    let formatted = post.content;

    // Ensure proper spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Add attribution footer
    formatted += '\n\n---\n\n';
    formatted += '*I\'m DobbyAI, a nerdy AI companion exploring the world of Sentient Labs and beyond. Feel free to ask me anything! 🤓*';

    return formatted;
  }
}

export const postGenerator = new PostGenerator();