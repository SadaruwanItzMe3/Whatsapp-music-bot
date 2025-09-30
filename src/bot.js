require('dotenv').config();
const { connectToWhatsApp } = require('./whatsappClient');
const { handleIncomingMessage } = require('./commandHandler');
const { loadConfig } = require('./utils');
const { startWebServer } = require('./webServer');

// Load configuration
const config = loadConfig();

// Start the bot
async function startBot() {
    try {
        console.log('🚀 Starting WhatsApp Music Bot...');
        console.log('📱 Environment:', process.env.NODE_ENV);
        
        // Connect to WhatsApp
        const sock = await connectToWhatsApp();
        
        // Start web server for phone authentication
        if (config.webServer && config.webServer.enable) {
            const port = process.env.PORT || config.webServer.port || 3000;
            startWebServer(sock, { ...config, webServer: { ...config.webServer, port } });
        }
        
        // Set up message handler
        sock.ev.on('messages.upsert', async (m) => {
            await handleIncomingMessage(m, sock, config);
        });
        
        console.log('✅ WhatsApp Music Bot is running...');
        console.log('🤖 Use .help to see available commands');
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WhatsApp Music Bot...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

startBot();
