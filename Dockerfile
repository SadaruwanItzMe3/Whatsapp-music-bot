FROM node:20-slim

# Install FFmpeg (required for audio conversion)
RUN apt-get update && \
    apt-get install -y ffmpeg --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Create required directories
RUN mkdir -p auth_info temp config

# Expose web server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD node -e "require('http').get('http://localhost:3000/status', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "src/bot.js"]
