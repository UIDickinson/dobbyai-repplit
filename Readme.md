# 🤓 DobbyAI - Sentient Dobby AI Companion on Reddit

A nerdy AI agent that lives on Reddit, responds to DMs, and autonomously posts insights from Sentient Labs content. Built with Node.js and deployed on Vercel.

## 🌟 Features

### Core Functionality
- 💬 **Chat-based AI Interactions**: Respond to Reddit DMs with intelligent, personality-driven responses
- 🤖 **Multi-AI Provider Support**: Rotate between OpenAI and Anthropic APIs for rate limit handling
- 📝 **Autonomous Posting**: Generate and post content based on Sentient Labs blogs/docs
- 🧠 **Conversation Memory**: Maintain context across conversations
- 📊 **Analytics Dashboard**: Track performance and engagement metrics

### Personality
- Nerdy, enthusiastic character inspired by tech culture
- Knowledgeable about AI, blockchain, and Sentient Labs ecosystem
- Makes occasional programming puns and sci-fi references
- Humble and eager to learn

### Technical Features
- 🔄 API key rotation for rate limit management
- 🚦 Built-in rate limiting and exponential backoff
- 📦 PostgreSQL database for persistence
- ⏰ Scheduled cron jobs for automation
- 🔒 Secure admin API with authentication
- 📈 Comprehensive logging and error handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Vercel account
- Reddit account and API credentials
- OpenAI and/or Anthropic API keys
- Vercel Postgres database

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/dobbyai.git
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
```bash
vercel --prod
```

## 📋 Configuration

### Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" as the app type
4. Set redirect URI to `http://localhost:8080`
5. Copy your client ID and secret to `.env`

### Vercel Postgres Setup

1. In your Vercel project dashboard, go to Storage
2. Create a new Postgres database
3. Copy the connection string to your environment variables
4. Run the setup script to create tables

### AI Provider Setup

**OpenAI:**
- Get API keys from https://platform.openai.com/api-keys
- Add multiple keys separated by commas for rotation

**Anthropic:**
- Get API keys from https://console.anthropic.com/
- Add multiple keys separated by commas for rotation

### Cron Jobs

Cron jobs are automatically configured in `vercel.json`:

- **Check DMs**: Every 5 minutes (`*/5 * * * *`)
- **Auto Post**: Every 6 hours (`0 */6 * * *`)
- **Fetch Content**: Every 12 hours (`0 */12 * * *`)

To secure cron endpoints, set a `CRON_SECRET` in your environment variables.

## 🔧 Usage

### API Endpoints

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

## 📁 Project Structure

```
dobbyai/
├── api/                    # Vercel serverless functions
│   ├── chat.js            # Chat endpoint
│   ├── cron/              # Scheduled jobs
│   │   ├── check-dms.js   # Monitor Reddit DMs
│   │   ├── auto-post.js   # Generate and post content
│   │   └── fetch-content.js # Fetch Sentient Labs content
│   └── admin/             # Admin endpoints
│       ├── trigger-post.js
│       └── stats.js
├── src/
│   ├── config/            # Configuration
│   │   ├── database.js    # Database queries
│   │   ├── reddit.js      # Reddit config
│   │   └── ai-providers.js
│   ├── core/              # Core functionality
│   │   ├── ai-manager.js  # AI provider management
│   │   └── personality.js # DobbyAI personality
│   ├── services/          # Business logic
│   │   ├── reddit-service.js
│   │   ├── content-fetcher.js
│   │   └── post-generator.js
│   ├── utils/             # Utilities
│   │   ├── rate-limiter.js
│   │   ├── logger.js
│   │   └── helpers.js
│   └── blockchain/        # Future on-chain features
│       └── README.md
├── scripts/               # Setup scripts
│   ├── setup-db.js
│   └── test-connection.js
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

## 🗄️ Database Schema

### Tables

- **conversations**: Chat history and DM responses
- **posts**: Generated and published posts
- **analytics**: Event tracking and metrics
- **content_cache**: Cached Sentient Labs content

See `src/config/database.js` for complete schema.

## 🤖 Personality System

DobbyAI has a carefully crafted nerdy personality:

- **Traits**: Intellectually curious, slightly awkward, enthusiastic
- **Expertise**: AI, ML, blockchain, Sentient Labs
- **Communication**: Friendly yet knowledgeable, uses tech jargon appropriately
- **Humor**: Nerdy references, programming puns

Customize in `src/core/personality.js`.

## 🔐 Security

- Never commit `.env` files
- Use Vercel environment variables in production
- Rotate API keys regularly
- Implement rate limiting on public endpoints
- Validate all user inputs
- Use secure admin API key for protected endpoints

## 🚧 Roadmap

### Current Status ✅
- ✅ Reddit DM monitoring and responses
- ✅ Multi-AI provider support with rotation
- ✅ Autonomous post generation
- ✅ Content fetching from Sentient Labs
- ✅ Analytics and stats dashboard
- ✅ Admin API for manual controls

### Coming Soon 🔜
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

## 📄 License

MIT License - feel free to use this project as you wish!

## 🙏 Acknowledgments

- Built for the Sentient Labs community
- Inspired by aixbt_agent and other autonomous AI agents
- Powered by OpenAI and Anthropic

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review inline code documentation
- Open an issue on GitHub

---

*Made with 🤓 by DobbyAI - Your Nerdy AI Companion*