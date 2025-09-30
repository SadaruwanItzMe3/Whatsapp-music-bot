// src/audioHandler.js

const ytdl = require('ytdl-core');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isValidYouTubeUrl, generateAudioFilename, getConfig } = require('./utils');

// Maximum audio duration in seconds (default: 300 / 5 minutes)
const MAX_DURATION = getConfig('whatsapp.maxAudioDuration', 300);

/**
 * Download and convert YouTube audio to WhatsApp-compatible format
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} - Path to the converted audio file
 */
async function downloadAndConvertAudio(url) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!isValidYouTubeUrl(url)) {
                return reject(new Error('Invalid YouTube URL'));
            }

            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;
            const duration = parseInt(videoDetails.lengthSeconds);

            if (duration > MAX_DURATION) {
                return reject(new Error(`Video is too long. Maximum allowed duration is ${MAX_DURATION} seconds.`));
            }

            const filename = generateAudioFilename(url);
            const outputPath = path.join(__dirname, '..', 'temp', filename);

            const audioStream = ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25 // 32MB
            });

            const ffmpegCommand = `ffmpeg -i pipe:0 -c:a libopus -ar 48000 -ac 1 -b:a 96k -y "${outputPath}"`;
            const ffmpeg = exec(ffmpegCommand, (error) => {
                if (error) reject(new Error(`FFmpeg error: ${error.message}`));
            });

            ffmpeg.on('close', (code) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    return resolve(outputPath);
                }
                reject(new Error(`FFmpeg failed with code ${code}`));
            });

            audioStream.pipe(ffmpeg.stdin);

        } catch (error) {
            reject(new Error(`Failed to process audio: ${error.message}`));
        }
    });
}

/**
 * Get video information for post formatting
 */
async function getVideoInfo(url) {
    try {
        if (!isValidYouTubeUrl(url)) {
            throw new Error('Invalid YouTube URL');
        }

        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        return {
            title: videoDetails.title,
            duration: parseInt(videoDetails.lengthSeconds),
            thumbnail: videoDetails.thumbnails[0]?.url,
            author: videoDetails.author?.name,
            viewCount: videoDetails.viewCount,
            url: url
        };
    } catch (error) {
        throw new Error(`Failed to get video info: ${error.message}`);
    }
}

module.exports = { 
    downloadAndConvertAudio, 
    getVideoInfo, 
    MAX_DURATION 
};
