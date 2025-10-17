import { sql } from '@vercel/postgres';
import { logger } from '../utils/logger.js';

export async function savePost(post) {
  try {
    const r = await sql`INSERT INTO posts (title, content, subreddit, post_type, status, metadata, created_at)
                        VALUES (${post.title}, ${post.content}, ${post.subreddit}, ${post.postType}, ${post.status}, ${post.metadata ?? {}} , now())
                        RETURNING *;`;
    logger.info('savePost: saved post id=' + r?.rows?.[0]?.id);
    return r.rows?.[0];
  } catch (err) {
    logger.error('savePost failed', err);
    throw err; // don't swallow errors
  }
}