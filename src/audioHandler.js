const ytdl = require('ytdl-core');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isValidYouTubeUrl, generateAudioFilename } = require('./utils');

// Maximum audio duration in seconds (5 minutes default)
const MAX_DURATION = parseInt(process.env.MAX_AUDIO_DURATION) || 300;

/**
 * Download and convert YouTube audio to WhatsApp-compatible format
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} - Path to the converted audio file
 */
async function downloadAndConvertAudio(url) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate YouTube URL
            if (!isValidYouTubeUrl(url)) {
                reject(new Error('Invalid YouTube URL'));
                return;
            }

            // Get video info to check duration
            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;
            const duration = parseInt(videoDetails.lengthSeconds);

            // Check if video is too long
            if (duration > MAX_DURATION) {
                reject(new Error(`Video is too long. Maximum allowed duration is ${MAX_DURATION} seconds (${Math.floor(MAX_DURATION/60)} minutes). This video is ${duration} seconds long.`));
                return;
            }

            const filename = generateAudioFilename(url);
            const outputPath = path.join(__dirname, '..', 'temp', filename);

            console.log(`Downloading audio from: ${url}`);
            console.log(`Video title: ${videoDetails.title}`);
            console.log(`Duration: ${duration} seconds`);

            // Download audio with highest quality
            const audioStream = ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25 // 32MB buffer
            });

            // FFmpeg command to convert to OGG/Opus format (WhatsApp compatible)
            const ffmpegCommand = `ffmpeg -i pipe:0 -c:a libopus -ar 48000 -ac 1 -b:a 96k -v warning -y "${outputPath}"`;
            
            const ffmpeg = exec(ffmpegCommand, (error) => {
                if (error) {
                    reject(new Error(`FFmpeg error: ${error.message}`));
                }
            });

            // Handle FFmpeg events
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`Audio converted successfully: ${outputPath}`);
                    
                    // Verify the file was created
                    if (fs.existsSync(outputPath)) {
                        const stats = fs.statSync(outputPath);
                        if (stats.size > 0) {
                            resolve(outputPath);
                        } else {
                            reject(new Error('Converted audio file is empty'));
                        }
                    } else {
                        reject(new Error('Converted audio file was not created'));
                    }
                } else {
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(new Error(`FFmpeg execution error: ${err.message}`));
            });

            // Pipe audio stream to FFmpeg
            audioStream.pipe(ffmpeg.stdin);

            // Handle stream errors
            audioStream.on('error', (err) => {
                reject(new Error(`YouTube download error: ${err.message}`));
            });

            ffmpeg.stdin.on('error', (err) => {
                // Ignore EPIPE errors which can happen when FFmpeg closes early
                if (err.code !== 'EPIPE') {
                    reject(new Error(`FFmpeg stdin error: ${err.message}`));
                }
            });

            // Progress tracking (optional)
            let downloadedBytes = 0;
            audioStream.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                console.log(`Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
            });

        } catch (error) {
            reject(new Error(`Failed to process audio: ${error.message}`));
        }
    });
}

/**
 * Get video information without downloading
 * @param {string} url - YouTube URL
 * @returns {Promise<Object>} - Video information
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
            thumbnail: videoDetails.thumbnails[0]?.url || null,
            author: videoDetails.author?.name || 'Unknown Artist',
            viewCount: videoDetails.viewCount,
            url: url
        };
    } catch (error) {
        throw new Error(`Failed to get video info: ${error.message}`);
    }
}

/**
 * Check if FFmpeg is available on the system
 * @returns {Promise<boolean>} - True if FFmpeg is available
 */
async function checkFFmpeg() {
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error) => {
            resolve(!error);
        });
    });
}

/**
 * Clean up temporary audio files
 */
function cleanupAudioFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error cleaning up audio file:', error);
        return false;
    }
}

module.exports = {
    downloadAndConvertAudio,
    getVideoInfo,
    checkFFmpeg,
    cleanupAudioFile,
    MAX_DURATION
};
