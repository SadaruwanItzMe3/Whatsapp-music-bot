const { getConfig } = require('./utils');

class ChannelPoster {
    constructor(sock) {
        this.sock = sock;
        this.channels = getConfig('channels', {});
        this.templates = getConfig('templates', {});
        this.channelType = getConfig('channelType', 'newsletter');
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
            console.log(`📱 Channel type: ${this.channelType}`);

            // Validate channel JID format
            if (!this.isValidChannelJid(channelJid)) {
                throw new Error(`Invalid channel JID format: ${channelJid}. Expected @newsletter.`);
            }

            // First send the audio as voice message
            await this.sendVoiceMessage(channelJid, audioPath);

            // Wait a bit before sending text (newsletter channels might need more delay)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create formatted message and send
            const formattedMessage = this.formatMusicMessage(videoInfo, template, postType);
            await this.sendFormattedMessage(channelJid, formattedMessage);

            console.log(`✅ ${postType} post sent to newsletter channel: ${channelJid}`);
            return true;

        } catch (error) {
            console.error('Error creating music post:', error);
            throw error;
        }
    }

    /**
     * Validate channel JID format
     */
    isValidChannelJid(jid) {
        return jid.endsWith('@newsletter');
    }

    /**
     * Format the music message for newsletter channels
     */
    formatMusicMessage(videoInfo, template, postType) {
        const duration = this.formatDuration(videoInfo.duration);
        
        let message = `*${template.title}*\n\n`;
        
        // Title section - newsletter channels might have different character limits
        const shortTitle = videoInfo.title.length > 100 
            ? videoInfo.title.substring(0, 100) + '...' 
            : videoInfo.title;
        
        message += `*${this.escapeMarkdown(shortTitle)}*\n\n`;
        
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
        
        // Footer - shorter for newsletter
        message += `_${template.footer}_\n\n`;
        message += template.hashtags;

        return message;
    }

    /**
     * Send voice message to newsletter channel
     */
    async sendVoiceMessage(channelJid, audioPath) {
        try {
            const fs = require('fs');
            const audioBuffer = fs.readFileSync(audioPath);
            
            console.log(`🔊 Sending voice message to newsletter...`);
            
            await this.sock.sendMessage(channelJid, {
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true, // Mark as voice message
            });
            
            console.log(`✅ Voice message sent to newsletter`);
            
        } catch (error) {
            console.error('❌ Failed to send voice message to newsletter:', error);
            throw new Error(`Newsletter voice message failed: ${error.message}`);
        }
    }

    /**
     * Send formatted text message to newsletter
     */
    async sendFormattedMessage(channelJid, message) {
        try {
            console.log(`📝 Sending formatted message to newsletter...`);
            
            await this.sock.sendMessage(channelJid, {
                text: message
            });
            
            console.log(`✅ Formatted message sent to newsletter`);
            
        } catch (error) {
            console.error('❌ Failed to send message to newsletter:', error);
            throw new Error(`Newsletter message failed: ${error.message}`);
        }
    }

    /**
     * Create a text post for newsletter channels
     */
    async createTextPost(channelType, title, content) {
        try {
            const channelJid = this.channels[channelType] || this.channels.music;
            const template = this.templates[channelType] || this.templates.music;

            if (!channelJid) {
                throw new Error('No channel JID configured for: ' + channelType);
            }

            if (!this.isValidChannelJid(channelJid)) {
                throw new Error(`Invalid newsletter JID: ${channelJid}`);
            }

            // Shorter content for newsletter
            const shortTitle = title.length > 80 ? title.substring(0, 80) + '...' : title;
            const shortContent = content.length > 200 ? content.substring(0, 200) + '...' : content;

            const message = `*${template.title}*\n\n` +
                           `*${this.escapeMarkdown(shortTitle)}*\n\n` +
                           `${shortContent}\n\n` +
                           `_${template.footer}_\n\n` +
                           template.hashtags;

            await this.sock.sendMessage(channelJid, { text: message });
            console.log(`✅ Text post sent to newsletter: ${channelJid}`);

        } catch (error) {
            console.error('Error creating newsletter text post:', error);
            throw error;
        }
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
}

module.exports = ChannelPoster;
