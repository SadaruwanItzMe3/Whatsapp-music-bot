const { getConfig } = require('./utils');

class ChannelPoster {
    constructor(sock) {
        this.sock = sock;
        this.channels = getConfig('channels', {});
        this.templates = getConfig('templates', {});
    }

    /**
     * Create a formatted music post for channels
     */
    async createMusicPost(videoInfo, audioPath, postType = 'music') {
        try {
            const template = this.templates[postType] || this.templates.music;
            const channelJid = this.channels[postType] || this.channels.music;

            if (!channelJid) {
                throw new Error('No channel JID configured for post type: ' + postType);
            }

            console.log(`🎵 Creating ${postType} post for: ${videoInfo.title}`);

            // First send the audio as voice message
            await this.sendVoiceMessage(channelJid, audioPath);

            // Wait a bit before sending text
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create formatted message and send
            const formattedMessage = this.formatMusicMessage(videoInfo, template, postType);
            await this.sendFormattedMessage(channelJid, formattedMessage);

            console.log(`✅ ${postType} post sent to channel: ${channelJid}`);
            return true;

        } catch (error) {
            console.error('Error creating music post:', error);
            throw error;
        }
    }

    /**
     * Format the music message based on template and type
     */
    formatMusicMessage(videoInfo, template, postType) {
        const duration = this.formatDuration(videoInfo.duration);
        
        let message = `*${template.title}*\n\n`;
        
        // Title section (like in your screenshot)
        message += `*${this.escapeMarkdown(videoInfo.title)}*\n\n`;
        
        // Different content based on post type
        if (postType === 'slowReverb') {
            message += `🌊 *Slowed and reverb vibes*\n`;
            message += `🎧 *Use headphones for better experience*\n`;
            message += `⏱ *Duration*: ${duration}\n\n`;
            message += `☁️ *For a moment of peace...*\n`;
            message += `✨ *Better vibes*\n\n`;
        } else if (postType === 'official') {
            message += `🎶 *Official Music Release*\n`;
            message += `🎧 *Use headphones*\n`;
            message += `⏱ *Duration*: ${duration}\n\n`;
            message += `🔥 *Fresh drop*\n`;
            message += `🎵 *Official version*\n\n`;
        } else {
            // Default music template
            message += `🎧 *Use headphones for best experience*\n`;
            message += `⏱ *Duration*: ${duration}\n\n`;
            message += `🎵 *Music vibes*\n`;
            message += `✨ *Enjoy the rhythm*\n\n`;
        }
        
        // Footer
        message += `_${template.footer}_\n\n`;
        message += template.hashtags;

        return message;
    }

    /**
     * Format duration from seconds to MM:SS
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Escape markdown characters for WhatsApp
     */
    escapeMarkdown(text) {
        return text.replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');
    }

    /**
     * Send voice message to channel
     */
    async sendVoiceMessage(channelJid, audioPath) {
        const fs = require('fs');
        const audioBuffer = fs.readFileSync(audioPath);
        
        await this.sock.sendMessage(channelJid, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true, // Mark as voice message
        });
        
        console.log(`🔊 Voice message sent to channel`);
    }

    /**
     * Send formatted text message to channel
     */
    async sendFormattedMessage(channelJid, message) {
        await this.sock.sendMessage(channelJid, {
            text: message
        });
        
        console.log(`📝 Formatted message sent to channel`);
    }

    /**
     * Create a simple text post for channels (without audio)
     */
    async createTextPost(channelType, title, content) {
        try {
            const channelJid = this.channels[channelType] || this.channels.music;
            const template = this.templates[channelType] || this.templates.music;

            if (!channelJid) {
                throw new Error('No channel JID configured for: ' + channelType);
            }

            const message = `*${template.title}*\n\n` +
                           `*${this.escapeMarkdown(title)}*\n\n` +
                           `${content}\n\n` +
                           `_${template.footer}_\n\n` +
                           template.hashtags;

            await this.sock.sendMessage(channelJid, { text: message });
            console.log(`✅ Text post sent to channel: ${channelJid}`);

        } catch (error) {
            console.error('Error creating text post:', error);
            throw error;
        }
    }
}

module.exports = ChannelPoster;
