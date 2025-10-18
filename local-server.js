import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    name: 'DobbyAI Local Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      chat: 'POST /api/chat',
      stats: 'GET /api/admin/stats',
      crons: {
        checkDMs: 'GET /api/cron/check-dms',
        autoPost: 'GET /api/cron/auto-post',
        fetchContent: 'GET /api/cron/fetch-content'
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Handle all API routes
app.all('/api/*', async (req, res) => {
  try {
    // Map request path to ./api file
    const apiPath = req.path.replace(/^\/api/, '');
    const candidates = [
      path.join(__dirname, 'api', `${apiPath}.js`),
      path.join(__dirname, 'api', apiPath, 'index.js')
    ];

    let handlerFile = null;
    for (const c of candidates) {
      try {
        await fs.access(c);
        handlerFile = c;
        break;
      } catch {
        // File not found, try next
      }
    }

    if (!handlerFile) {
      return res.status(404).json({ 
        error: 'API route not found', 
        path: req.path 
      });
    }

    // Import and call the handler
    const moduleUrl = `file://${handlerFile}`;
    const mod = await import(moduleUrl);
    const handler = mod.default ?? mod.handler;
    
    if (typeof handler !== 'function') {
      return res.status(500).json({ 
        error: 'Invalid handler export',
        file: handlerFile 
      });
    }

    // Call the serverless-style handler with Express req/res
    return handler(req, res);
  } catch (err) {
    console.error('Local server error:', err);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// Cron jobs
console.log('\n📅 Scheduling cron jobs...\n');

// Check DMs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('[cron] 📬 Checking Reddit DMs...');
  try {
    const response = await fetch(`http://localhost:${PORT}/api/cron/check-dms`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'local'}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('[cron] ✓ DM check complete:', data);
  } catch (err) {
    console.error('[cron] ✗ DM check error:', err.message);
  }
});

// Auto-post every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[cron] 📝 Running auto-post...');
  try {
    const response = await fetch(`http://localhost:${PORT}/api/cron/auto-post`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'local'}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('[cron] ✓ Auto-post complete:', data);
  } catch (err) {
    console.error('[cron] ✗ Auto-post error:', err.message);
  }
});

// Fetch content every 12 hours
cron.schedule('0 */12 * * *', async () => {
  console.log('[cron] 📥 Fetching Sentient content...');
  try {
    const response = await fetch(`http://localhost:${PORT}/api/cron/fetch-content`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'local'}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('[cron] ✓ Content fetch complete:', data);
  } catch (err) {
    console.error('[cron] ✗ Content fetch error:', err.message);
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🤓 DobbyAI Local Server Started!\n');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log('\n📅 Cron Schedule:');
  console.log('   • Check DMs:      Every 5 minutes');
  console.log('   • Auto Post:      Every 6 hours (0 */6 * * *)');
  console.log('   • Fetch Content:  Every 12 hours (0 */12 * * *)\n');
  console.log('💡 Manual triggers:');
  console.log(`   curl http://localhost:${PORT}/api/cron/check-dms -H "Authorization: Bearer ${process.env.CRON_SECRET || 'local'}"`);
  console.log(`   curl http://localhost:${PORT}/api/cron/auto-post -H "Authorization: Bearer ${process.env.CRON_SECRET || 'local'}"`);
  console.log('\n✅ Bot is ready!\n');
});