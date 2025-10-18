import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron';
import fetch from 'node-fetch'; // or use global fetch if available

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('DobbyAI local server running'));

app.all('/api/*', async (req, res) => {
  try {
    // map request path to ./api file
    const apiPath = req.path.replace(/^\/api/, '');
    const candidates = [
      path.join(__dirname, 'api', `${apiPath}.js`),
      path.join(__dirname, 'api', apiPath, 'index.js')
    ].map(p => p.replace(/\/+/, '/'));

    let handlerFile = null;
    for (const c of candidates) {
      try {
        await fs.access(c);
        handlerFile = c;
        break;
      } catch {
        // not found
      }
    }

    if (!handlerFile) {
      return res.status(404).json({ error: 'API route not found', path: req.path });
    }

    const moduleUrl = `file://${handlerFile}`;
    const mod = await import(moduleUrl);
    const handler = mod.default ?? mod.handler;
    if (typeof handler !== 'function') {
      return res.status(500).json({ error: 'Invalid handler export in ' + handlerFile });
    }

    // Call the serverless-style handler with Express req/res
    return handler(req, res);
  } catch (err) {
    console.error('Local server error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Cron jobs
cron.schedule('*/5 * * * *', async () => {
  console.log('[cron] Check DMs');
  await fetch(`http://localhost:${PORT}/api/cron/check-dms`, {
    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
  }).catch(err => console.error('[cron] check-dms error:', err.message));
});

cron.schedule('0 */6 * * *', async () => {
  console.log('[cron] Auto Post');
  await fetch(`http://localhost:${PORT}/api/cron/auto-post`, {
    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
  }).catch(err => console.error('[cron] auto-post error:', err.message));
});

cron.schedule('0 */12 * * *', async () => {
  console.log('[cron] Fetch Content');
  await fetch(`http://localhost:${PORT}/api/cron/fetch-content`, {
    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
  }).catch(err => console.error('[cron] fetch-content error:', err.message));
});

app.listen(PORT, () => {
  console.log(`Local DobbyAI server listening on http://localhost:${PORT}`);
});