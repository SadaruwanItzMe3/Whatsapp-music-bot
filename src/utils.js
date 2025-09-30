const fs = require('fs');
const path = require('path');

// Config management
let config = null;

/**
 * Load configuration from config.json
 * @returns {Object} Configuration object
 */
function loadConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configData);
            console.log('Configuration loaded successfully');
        } else {
            console.warn('Config file not found, using default configuration');
            config = getDefaultConfig();
        }
        return config;
    } catch (error) {
        console.error('Error loading config:', error);
        return getDefaultConfig();
    }
}

/**
 * Get default configuration
 * @returns {Object} Default configuration
 */
function getDefaultConfig() {
    return {
        whatsapp: {
            prefix: process.env.PREFIX || ".",
            maxAudioDuration: parseInt(process.env.MAX_AUDIO_DURATION) || 300
        },
        channels: {
            music: process.env.CHANNEL_JID || "your_channel_jid@broadcast",
            slowReverb: process.env.CHANNEL_JID || "your_channel_jid@broadcast",
            official: process.env.CHANNEL_JID || "your_channel_jid@broadcast"
        },
        templates: {
            slowReverb: {
                title: "🎵 SLOWED AND REVERB 🎵",
                footer: "THE DANUZ Z | VIBE CURATOR",
                hashtags: "#SlowedReverb #Vibes #Music"
            },
            official: {
                title: "🎶 OFFICIAL MUSIC 🎶",
                footer: "OFFICIAL RELEASE",
                hashtags: "#Official #Music"
            },
            music: {
                title: "🎵 MUSIC RELEASE 🎵",
                footer: "DANUZ Z VIBES",
                hashtags: "#Music #NewRelease #Vibes"
            }
        }
    };
}

/**
 * Get config value by path
 * @param {string} path - Config path (e.g., 'whatsapp.prefix')
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Config value
 */
function getConfig(path, defaultValue = null) {
    if (!config) {
        loadConfig();
    }
    
    const parts = path.split('.');
    let value = config;
    
    for (const part of parts) {
        if (value && value[part] !== undefined) {
            value = value[part];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

/**
 * Validate if a string is a valid YouTube URL
 */
function isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
}

/**
 * Generate a unique filename for audio files
 */
function generateAudioFilename(url) {
    const videoId = new URL(url).searchParams.get('v');
    const timestamp = Date.now();
    return `${videoId}_${timestamp}.ogg`;
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v');
    } catch (error) {
        return null;
    }
}

module.exports = {
    isValidYouTubeUrl,
    generateAudioFilename,
    extractVideoId,
    loadConfig,
    getConfig,
    getDefaultConfig
};
