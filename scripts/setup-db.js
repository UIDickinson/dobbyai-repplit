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
    // Detailed diagnostics for Neon/PG errors
    console.error('Database initialization error (full):', error);
    console.error('Error name:', error?.name);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error detail:', error?.detail ?? 'N/A');
    console.error('Error hint:', error?.hint ?? 'N/A');
    console.error('Error position:', error?.position ?? 'N/A');
    console.error('Error stack:', error?.stack);
    process.exit(1);
  }
}

setup();