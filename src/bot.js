require('dotenv').config();
const { connectToWhatsApp } = require('./whatsappClient');
const { handleIncomingMessage } = require('./commandHandler');
const { loadConfig, getConfig } = require('./utils');
const { startWebServer } = require('./webServer');

const config = loadConfig();

async function startBot() {
    try {
        console.log('');
        console.log('╔══════════════════════════════════╗');
        console.log('║   🎵 WhatsApp Music Bot v2.0 🎵  ║');
        console.log('╚══════════════════════════════════╝');
        console.log('');
        console.log(`📌 Prefix: ${config.whatsapp?.prefix || '.'}`);
        console.log(`📱 Channels: ${JSON.stringify(config.channels, null, 2)}`);
        console.log('');

        // Connect to WhatsApp using pairing-code login (phone number, no QR)
        const sock = await connectToWhatsApp(
            async (m) => await handleIncomingMessage(m, sock, config),
            { usePairingCode: true }
        );

        // Start optional web server (QR viewer)
        if (config.webServer?.enable) {
            const port = process.env.PORT || config.webServer?.port || 3000;
            startWebServer(sock, { ...config, webServer: { ...config.webServer, port } });
        }

    } catch (error) {
        console.error('❌ Fatal error starting bot:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down...');
    process.exit(0);
});
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
});

startBot();
