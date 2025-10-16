import 'dotenv/config';
import { initializeDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function setup() {
  try {
    logger.info('Starting database setup...');
    
    await initializeDatabase();
    
    logger.info('✓ Database setup complete!');
    logger.info('All tables and indexes have been created.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

setup();