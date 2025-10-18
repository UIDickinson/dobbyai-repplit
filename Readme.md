# DobbyAI - Sentient Dobby AI Companion on Reddit

An AI agent that lives on Reddit, responds to DMs, and autonomously posts insights from Sentient Labs content.

## Features

- Chat-based AI Interactions: Respond to Reddit DMs with intelligent, personality-driven responses
- Multi-AI Provider Support: Rotate between OpenAI and Anthropic APIs for rate limit handling
- Autonomous Posting: Generate and post content based on Sentient Labs blogs/docs
- Conversation Memory: Maintain context across conversations
- Analytics Dashboard: Track performance and engagement metric


### Technical Features
- API key rotation for rate limit management
- Built-in rate limiting and exponential backoff
- PostgreSQL database for persistence
- Scheduled cron jobs for automation
- Secure admin API with authentication
- Comprehensive logging and error handling

- Node.js 18+ 
- Reddit account and API credentials
- Sentient API keys
- Database
- cloud server account for deployment

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/UIDickinson/dobbyai-reddit.git
cd dobbyai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Initialize database**
```bash
npm run setup
```

5. **Test connections**
```bash
npm run test
```

6. **Deploy to Vercel**

## Configuration

### Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" as the app type
4. Set redirect URI to `http://localhost:8080`
5. Copy your client ID and secret to `.env`

### Cron Jobs

Cron jobs are automatically configured in `vercel.json`:

- **Check DMs**: Every 5 minutes (`*/5 * * * *`)
- **Auto Post**: Every 6 hours (`0 */6 * * *`)
- **Fetch Content**: Every 12 hours (`0 */12 * * *`)

To secure cron endpoints, set a `CRON_SECRET` in your environment variables.

## 🔧 Usage

#### Chat API
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "What is Sentient Labs?",
  "userId": "username",
  "includeHistory": true
}
```

#### Manual Post Trigger (Admin)
```bash
POST /api/admin/trigger-post
X-API-Key: your_admin_key
Content-Type: application/json

{
  "content": "Content to post about...",
  "postType": "insight",
  "subreddit": null
}
```

#### Get Stats (Admin)
```bash
GET /api/admin/stats?days=7
X-API-Key: your_admin_key
```

### Local Development

```bash
# Start Vercel dev server
npm run dev

# The server will be available at http://localhost:3000
```

## 🚧 Roadmap

### Current Status ✅
- ✅ Reddit DM monitoring and responses
- ✅ Multi-AI provider support with rotation
- ✅ Autonomous post generation
- ✅ Content fetching from Sentient Labs
- ✅ Analytics and stats dashboard
- ✅ Admin API for manual controls

### Upgrade yours 🔜
- 🔜 On-chain interactions (blockchain module)
- 🔜 Subreddit monitoring and participation
- 🔜 Comment thread responses
- 🔜 Enhanced content summarization
- 🔜 User preference learning
- 🔜 Webhook support for real-time notifications

## 🐛 Troubleshooting

### Database Connection Fails
- Verify `POSTGRES_URL` is correct
- Check if database exists in Vercel dashboard
- Run setup script: `npm run setup`

### Reddit API Errors
- Verify credentials in `.env`
- Check if account is shadowbanned
- Ensure User-Agent is properly formatted
- Respect Reddit's rate limits (60 req/min)

### AI Provider Errors
- Check API key validity
- Verify sufficient credits
- Monitor rate limit status
- Check logs for specific error messages

### Cron Jobs Not Running
- Verify `CRON_SECRET` is set
- Check Vercel cron logs in dashboard
- Ensure functions don't timeout (60s limit)

## 📝 Logging

Logs are output to console and available in Vercel dashboard:

```javascript
// Log levels: error, warn, info, debug
logger.info('Message', { additional: 'data' });
```

Set `LOG_LEVEL` in environment variables.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request