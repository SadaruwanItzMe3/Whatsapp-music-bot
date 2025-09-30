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
    async createMusicPost(videoInfo, audioPath, postType = 'slowReverb') {
        try {
            const template = this.templates[postType] || this.templates.slowReverb;
            const channelJid = this.channels[postType] || this.channels.music;

            if (!channelJid) {
                throw new Error('No channel JID configured for post type: ' + postType);
            }

            // Create formatted message
            const formattedMessage = this.formatMusicMessage(videoInfo, template);

            // First send the audio as voice message
            await this.sendVoiceMessage(channelJid, audioPath);

            // Then send the formatted text message
            await this.sendFormattedMessage(channelJid, formattedMessage, videoInfo);

            console.log(`✅ Music post sent to channel: ${channelJid}`);
            return true;

        } catch (error) {
            console.error('Error creating music post:', error);
            throw error;
        }
    }

    /**
     * Format the music message based on template
     */
    formatMusicMessage(videoInfo, template) {
        const duration = this.formatDuration(videoInfo.duration);
        
        let message = `*${template.title}*\n\n`;
        
        // Artist and title section (like in your screenshot)
        message += `*${this.escapeMarkdown(videoInfo.title)}*\n\n`;
        
        // Description section
        message += `🎧 *Use headphones for better experience*\n`;
        message += `⏱ *Duration*: ${duration}\n\n`;
        
        // Vibes section (like in your screenshot)
        message += `🌊 *Better vibes*\n`;
        message += `☁️ *For a moment of peace...*\n\n`;
        
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
    }

    /**
     * Send formatted text message to channel
     */
    async sendFormattedMessage(channelJid, message, videoInfo) {
        // Add a small delay to ensure voice message is sent first
        await new Promise(resolve => setTimeout(resolve, 2000));

        await this.sock.sendMessage(channelJid, {
            text: message,
            // You can add context info with thumbnail if needed
            // contextInfo: {
            //     externalAdReply: {
            //         title: videoInfo.title,
            //         body: 'Now playing...',
            //         thumbnailUrl: videoInfo.thumbnail,
            //         mediaType: 1,
            //         sourceUrl: videoInfo.url
            //     }
            // }
        });
    }

    /**
     * Create a simple text post for channels (without audio)
     */
    async createTextPost(channelType, title, content) {
        try {
            const channelJid = this.channels[channelType] || this.channels.music;
            const template = this.templates[channelType] || this.templates.slowReverb;

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
