const { downloadAndConvertAudio, getVideoInfo } = require('./audioHandler');
const { isValidYouTubeUrl } = require('./utils');
const ChannelPoster = require('./channelPoster');

let channelPoster = null;

/**
 * Check if the sender is allowed to run commands.
 * Allows: messages you sent yourself (from your linked phone), or numbers
 * listed in the OWNER_NUMBERS env var (comma-separated, digits + country
 * code, no '+', e.g. OWNER_NUMBERS=14155552671,94771234567).
 */
function isAuthorized(message) {
    if (message.key.fromMe) return true;

    const ownerNumbers = (process.env.OWNER_NUMBERS || '')
        .split(',')
        .map(n => n.trim())
        .filter(Boolean);

    if (ownerNumbers.length === 0) return false;

    const senderJid = message.key.participant || message.key.remoteJid || '';
    const senderNumber = senderJid.split('@')[0];

    return ownerNumbers.includes(senderNumber);
}

async function handleIncomingMessage(m, sock, config) {
    const message = m.messages[0];
    if (!message.message || message.key.remoteJid === 'status@broadcast') return;

    // Only the bot owner (or messages sent from your own linked account)
    // may trigger commands — prevents strangers from spamming downloads
    // or forcing posts to your channels.
    if (!isAuthorized(message)) return;

    // Initialize channel poster if not done
    if (!channelPoster) {
        channelPoster = new ChannelPoster(sock);
    }
    
    const text = message.message.conversation || 
                (message.message.extendedTextMessage && message.message.extendedTextMessage.text) || '';
    
    const prefix = config.whatsapp.prefix || '.';
    
    if (text.startsWith(prefix)) {
        const commandText = text.slice(prefix.length).trim();
        const [commandName, ...args] = commandText.split(' ');
        const fullArgs = args.join(' ');
        
        if (commandName === 'csong' && fullArgs) {
            await handleCsongCommand(fullArgs, message, sock, config);
        } else if (commandName === 'cpost' && fullArgs) {
            await handleCpostCommand(fullArgs, message, sock, config);
        } else if (commandName === 'help') {
            await handleHelpCommand(message, sock, config);
        } else if (commandName === 'slowreverb' && fullArgs) {
            await handleSlowReverbCommand(fullArgs, message, sock, config);
        } else if (commandName === 'official' && fullArgs) {
            await handleOfficialCommand(fullArgs, message, sock, config);
        }
    }
}

/**
 * Handle .csong command - Send audio to channel with formatted post
 */
async function handleCsongCommand(args, message, sock, config) {
    const [url, ...postArgs] = args.split(' ');
    const postType = postArgs[0] || 'music';
    
    const prefix = config.whatsapp.prefix || '.';
    
    if (!url) {
        await sendMessage(sock, message.key.remoteJid, `❌ Please provide a YouTube URL. Usage: ${prefix}csong <youtube_url> [post_type]`);
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        await sendMessage(sock, message.key.remoteJid, '❌ Invalid YouTube URL. Please provide a valid YouTube link.');
        return;
    }
    
    console.log(`Processing YouTube URL for channel post: ${url}`);
    
    try {
        await sendMessage(sock, message.key.remoteJid, '⏳ Downloading audio and creating channel post...');
        
        // Download and convert audio
        const audioPath = await downloadAndConvertAudio(url);
        
        // Get video info for the post
        const videoInfo = await getVideoInfo(url);
        
        // Create formatted post in channel
        await channelPoster.createMusicPost(videoInfo, audioPath, postType);
        
        // Confirm success to user
        await sendMessage(sock, message.key.remoteJid, 
            `✅ Music post created successfully!\n` +
            `📱 Sent to: ${config.channels[postType] || config.channels.music}\n` +
            `🎵 ${videoInfo.title}\n` +
            `⏱ Duration: ${channelPoster.formatDuration(videoInfo.duration)}`
        );
        
        // Clean up
        cleanupAudioFile(audioPath);
        
    } catch (error) {
        console.error('Error processing audio for channel:', error);
        await sendMessage(sock, message.key.remoteJid, `❌ Error creating channel post: ${error.message}`);
    }
}

/**
 * Handle .slowreverb command - Specifically for slowed reverb posts
 */
async function handleSlowReverbCommand(args, message, sock, config) {
    const url = args.trim();
    
    if (!url) {
        await sendMessage(sock, message.key.remoteJid, `❌ Please provide a YouTube URL. Usage: .slowreverb <youtube_url>`);
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        await sendMessage(sock, message.key.remoteJid, '❌ Invalid YouTube URL.');
        return;
    }
    
    try {
        await sendMessage(sock, message.key.remoteJid, '⏳ Creating slowed & reverb post... 🌊');
        
        const audioPath = await downloadAndConvertAudio(url);
        const videoInfo = await getVideoInfo(url);
        
        // Always use slowReverb template for this command
        await channelPoster.createMusicPost(videoInfo, audioPath, 'slowReverb');
        
        await sendMessage(sock, message.key.remoteJid, 
            `✅ Slowed & Reverb post created! 🌊\n` +
            `📱 Channel: ${config.channels.slowReverb}\n` +
            `🎵 ${videoInfo.title}\n` +
            `⏱ ${channelPoster.formatDuration(videoInfo.duration)}`
        );
        
        cleanupAudioFile(audioPath);
        
    } catch (error) {
        console.error('Error creating slowed reverb post:', error);
        await sendMessage(sock, message.key.remoteJid, `❌ Error: ${error.message}`);
    }
}

/**
 * Handle .official command - For official music posts
 */
async function handleOfficialCommand(args, message, sock, config) {
    const url = args.trim();
    
    if (!url) {
        await sendMessage(sock, message.key.remoteJid, `❌ Please provide a YouTube URL. Usage: .official <youtube_url>`);
        return;
    }
    
    if (!isValidYouTubeUrl(url)) {
        await sendMessage(sock, message.key.remoteJid, '❌ Invalid YouTube URL.');
        return;
    }
    
    try {
        await sendMessage(sock, message.key.remoteJid, '⏳ Creating official music post... 🎶');
        
        const audioPath = await downloadAndConvertAudio(url);
        const videoInfo = await getVideoInfo(url);
        
        await channelPoster.createMusicPost(videoInfo, audioPath, 'official');
        
        await sendMessage(sock, message.key.remoteJid, 
            `✅ Official music post created! 🎶\n` +
            `📱 Channel: ${config.channels.official}\n` +
            `🎵 ${videoInfo.title}\n` +
            `⏱ ${channelPoster.formatDuration(videoInfo.duration)}`
        );
        
        cleanupAudioFile(audioPath);
        
    } catch (error) {
        console.error('Error creating official post:', error);
        await sendMessage(sock, message.key.remoteJid, `❌ Error: ${error.message}`);
    }
}

/**
 * Handle .cpost command - Create text-only post in channel
 */
async function handleCpostCommand(args, message, sock, config) {
    const [channelType, ...contentParts] = args.split(' ');
    const content = contentParts.join(' ');
    
    if (!channelType || !content) {
        await sendMessage(sock, message.key.remoteJid, 
            '❌ Usage: .cpost <channel_type> <message>\n' +
            '📱 Channel types: music, slowReverb, official\n' +
            '💬 Example: .cpost music "New music coming soon! Stay tuned 🎵"'
        );
        return;
    }
    
    try {
        await sendMessage(sock, message.key.remoteJid, '⏳ Creating channel post...');
        
        // Extract title from content (first line) and rest as content
        const lines = content.split('\n');
        const title = lines[0];
        const postContent = lines.slice(1).join('\n') || 'Check out our latest content!';
        
        await channelPoster.createTextPost(channelType, title, postContent);
        
        await sendMessage(sock, message.key.remoteJid, 
            `✅ Text post created successfully!\n` +
            `📱 Channel: ${config.channels[channelType] || config.channels.music}\n` +
            `📝 ${title}`
        );
        
    } catch (error) {
        console.error('Error creating text post:', error);
        await sendMessage(sock, message.key.remoteJid, `❌ Error creating post: ${error.message}`);
    }
}

async function handleHelpCommand(message, sock, config) {
    const prefix = config.whatsapp.prefix || '.';
    const helpText = `🎵 *WhatsApp Music Bot Commands* 🎵\n\n
*${prefix}csong <url>* - Send audio to channel with formatted post
*${prefix}slowreverb <url>* - Create slowed & reverb post 🌊
*${prefix}official <url>* - Create official music post 🎶
*${prefix}cpost <type> <message>* - Create text post in channel
*${prefix}help* - Show this help message

*Channel Types:*
- music (default)
- slowReverb 🌊
- official 🎶

*Examples:*
${prefix}csong https://youtube.com/watch?v=xxx
${prefix}slowreverb https://youtube.com/watch?v=xxx
${prefix}official https://youtube.com/watch?v=xxx
${prefix}cpost music "New Release\\nCheck out our latest track!"`;

    await sendMessage(sock, message.key.remoteJid, helpText);
}

/**
 * Clean up audio file
 */
function cleanupAudioFile(audioPath) {
    try {
        const fs = require('fs');
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
            console.log(`🗑️ Cleaned up: ${audioPath}`);
        }
    } catch (error) {
        console.error('Error cleaning up audio file:', error);
    }
}

async function sendMessage(sock, jid, content) {
    if (typeof content === 'string') {
        await sock.sendMessage(jid, { text: content });
    } else {
        await sock.sendMessage(jid, content);
    }
}

module.exports = { handleIncomingMessage };
