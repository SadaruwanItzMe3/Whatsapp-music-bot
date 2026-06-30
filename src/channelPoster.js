const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./utils');

class ChannelPoster {
    constructor(sock) {
        this.sock = sock;
        this.config = loadConfig();
    }

    /**
     * Post audio + caption to a WhatsApp channel (newsletter)
     */
    async createMusicPost(videoInfo, audioPath, postType = 'music') {
        const channelJid = this.getChannelJid(postType);
        if (!channelJid) throw new Error(`No channel JID configured for type: ${postType}`);

        const template = this.config.templates?.[postType] || this.config.templates?.music;
        const caption = this.buildCaption(videoInfo, template, postType);

        // Read audio file
        const audioBuffer = fs.readFileSync(audioPath);

        console.log(`📤 Posting to channel: ${channelJid}`);

        // Send audio as voice message (ptt = push-to-talk / voice note)
        await this.sock.sendMessage(channelJid, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            caption,
            fileName: path.basename(audioPath)
        });

        console.log(`✅ Posted: "${videoInfo.title}" → ${channelJid}`);
    }

    /**
     * Post text-only message to a channel
     */
    async createTextPost(channelType, title, content) {
        const channelJid = this.getChannelJid(channelType);
        if (!channelJid) throw new Error(`No channel JID configured for type: ${channelType}`);

        const text = `*${title}*\n\n${content}`;

        await this.sock.sendMessage(channelJid, { text });
        console.log(`✅ Text post sent to: ${channelJid}`);
    }

    /**
     * Build a formatted caption from video info + template
     */
    buildCaption(videoInfo, template, postType) {
        const title = template?.title || '🎵 MUSIC 🎵';
        const footer = template?.footer || 'Music Bot';
        const hashtags = template?.hashtags || '#Music';
        const duration = this.formatDuration(videoInfo.duration);

        return (
            `${title}\n\n` +
            `🎵 *${videoInfo.title}*\n` +
            `👤 ${videoInfo.author}\n` +
            `⏱ ${duration}\n\n` +
            `${hashtags}\n\n` +
            `— ${footer}`
        );
    }

    /**
     * Get the channel JID for a given post type
     */
    getChannelJid(postType) {
        return (
            this.config.channels?.[postType] ||
            this.config.channels?.music ||
            process.env.CHANNEL_JID ||
            null
        );
    }

    /**
     * Format seconds as M:SS
     */
    formatDuration(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

module.exports = ChannelPoster;
