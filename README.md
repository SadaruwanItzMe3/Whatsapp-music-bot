# 🎵 WhatsApp Music Bot v2.0

A WhatsApp bot that downloads YouTube audio and posts it as voice messages to your WhatsApp channels.

---

## ✅ What's Updated (v2.0)

| Change | Details |
|---|---|
| `ytdl-core` → `@distube/ytdl-core` | Old ytdl-core is broken vs YouTube's current API |
| `fetchLatestBaileysVersion` removed | This call hangs in many environments; replaced with hardcoded stable version |
| Better reconnect logic | Exponential backoff, max attempts, auto-clear on logout |
| Replies quote the original message | UX improvement |
| `youtu.be` short URL support | Fixed `generateAudioFilename` crash on short URLs |
| Silent Baileys logger | No more log spam |
| Web QR page rebuilt | Pure HTML + polling, no socket.io needed |
| Dockerfile included | Ready to deploy anywhere |

---

## 📋 Requirements

- Node.js **v18+**
- **FFmpeg** installed and in PATH
- A WhatsApp account (will be linked via QR)
- Your WhatsApp **channel JID** (e.g. `120363XXXXXXXXXXXXXXXXX@newsletter`)

---

## 🚀 Local Setup

```bash
# 1. Clone & install
git clone <your-repo-url>
cd whatsapp-music-bot
npm install

# 2. Configure
cp .env.example .env
# Edit .env — set CHANNEL_JID to your channel ID

# 3. Edit config/config.json
# Replace 120363XXXXXXXXXXXXXXXXX@newsletter with your real channel JID

# 4. Start
npm start
```

Scan the QR code printed in the terminal (or open http://localhost:3000).

---

## 🔍 How to Find Your Channel JID

1. Open WhatsApp on your phone
2. Go to your channel
3. Tap ⋮ → **Invite to channel** → **Copy link**
4. The link looks like: `https://whatsapp.com/channel/0029Vaxxxxxxxxxxxxxxxxxx`
5. Run this in Node to convert it:

```js
// The JID format is: 120363XXXXXXXXXXXXXXXXX@newsletter
// Use your channel link to find it after first bot connection:
// The bot will log the JID when it receives a message from the channel.
```

---

## ⚙️ Commands

| Command | Description |
|---|---|
| `.csong <url>` | Download YouTube audio → post to music channel |
| `.slowreverb <url>` | Post to slowed & reverb channel |
| `.official <url>` | Post to official releases channel |
| `.cpost <type> <msg>` | Text-only post to a channel |
| `.help` | Show all commands |

---

## 🐳 Deploy with Docker

```bash
# Build
docker build -t whatsapp-music-bot .

# Run (with persistent auth)
docker run -d \
  --name wa-music-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/auth_info:/app/auth_info \
  -e CHANNEL_JID=120363XXXXXXXXXXXXXXXXX@newsletter \
  -e PREFIX=. \
  whatsapp-music-bot

# View QR code to scan
open http://localhost:3000
```

---

## ☁️ Deploy on Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables:
   - `CHANNEL_JID` = your channel JID
   - `NODE_ENV` = production
4. Railway auto-detects the Dockerfile and deploys
5. Open the Railway URL → scan QR code

> ⚠️ **Important for Railway/cloud:** Auth session (`auth_info/`) is lost on redeploy. Use a persistent volume or re-scan QR each deploy.

---

## ☁️ Deploy on Render

1. Push to GitHub
2. [render.com](https://render.com) → New → Web Service → Connect repo
3. Runtime: **Docker**
4. Add env vars: `CHANNEL_JID`, `NODE_ENV=production`
5. Add a **Disk** (mount at `/app/auth_info`, 1GB) to persist session

---

## 🖥️ Deploy on Linux VPS (recommended for stability)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt-get install -y ffmpeg

# Clone & setup
git clone <your-repo> /opt/wa-music-bot
cd /opt/wa-music-bot
npm install
cp .env.example .env
nano .env   # Set CHANNEL_JID

# Run with PM2 (keeps alive after disconnect)
sudo npm install -g pm2
pm2 start src/bot.js --name wa-music-bot
pm2 save
pm2 startup   # Auto-start on reboot

# View logs
pm2 logs wa-music-bot
```

---

## 🛠 Troubleshooting

| Error | Fix |
|---|---|
| `ffmpeg: command not found` | Install FFmpeg: `sudo apt install ffmpeg` |
| `Video too long` | Raise `MAX_AUDIO_DURATION` in `.env` |
| QR code keeps regenerating | Delete `auth_info/` folder and re-scan |
| `Invalid YouTube URL` | Check the URL format — must be `youtube.com/watch?v=` or `youtu.be/` |
| Bot disconnects often | Switch to a VPS instead of free cloud tier |
