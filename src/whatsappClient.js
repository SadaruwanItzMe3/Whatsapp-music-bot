const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Create necessary directories
const authPath = './auth_info';
const tempPath = './temp';

if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });

async function connectToWhatsApp(io = null) {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join('.')}`);
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // Emit QR code to web clients if socket.io is available
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && io) {
            io.emit('qr-code', qr);
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            console.log('Connection closed, reconnecting', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp(io);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp bot connected successfully!');
            if (io) {
                io.emit('connection-status', 'connected');
            }
        }
    });
    
    return sock;
}

module.exports = { connectToWhatsApp };
