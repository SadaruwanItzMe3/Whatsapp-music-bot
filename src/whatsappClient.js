const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const pino = require('pino');

// Create necessary directories
const authPath = './auth_info';
const tempPath = './temp';

if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });

// Suppress verbose Baileys logs — use silent logger
const logger = pino({ level: 'silent' });

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Module-level state shared with webServer.js for the pairing-code UI
let pairingState = {
    status: 'disconnected', // disconnected | awaiting_number | code_ready | connected
    code: null,
    phoneNumber: null
};

function getPairingState() {
    return pairingState;
}

/**
 * Request a pairing code for a given phone number (E.164 digits only, no '+').
 * Must be called AFTER the socket exists but BEFORE it's registered (no creds yet).
 */
async function requestPairingCode(sock, phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
        throw new Error('Invalid phone number. Include country code, digits only (e.g. 14155552671).');
    }

    console.log(`📲 Requesting pairing code for +${cleaned}...`);
    const code = await sock.requestPairingCode(cleaned);
    const formatted = code.match(/.{1,4}/g)?.join('-') || code;

    pairingState.status = 'code_ready';
    pairingState.code = formatted;
    pairingState.phoneNumber = cleaned;

    console.log(`✅ Pairing code: ${formatted}`);
    console.log('   Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead → enter this code.');

    return formatted;
}

async function connectToWhatsApp(messageHandler = null, options = {}) {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const usePairingCode = options.usePairingCode === true;

    // NOTE: fetchLatestBaileysVersion() is broken in many environments (hangs).
    // We use a hardcoded stable version instead.
    const version = [2, 3000, 1020374448];

    console.log(`🔌 Connecting to WhatsApp (WA v${version.join('.')})...`);

    const sock = makeWASocket({
        version,
        auth: state,
        // QR printing/requesting is disabled entirely when using pairing-code mode
        printQRInTerminal: !usePairingCode,
        logger,
        browser: Browsers.ubuntu('WhatsApp Music Bot'),
        markOnlineOnConnect: false,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
    });

    sock.ev.on('creds.update', saveCreds);

    // If pairing-code mode and not yet registered, expose the request function
    // and wait for the phone number via web UI or env var.
    if (usePairingCode && !sock.authState.creds.registered) {
        pairingState.status = 'awaiting_number';

        const envPhone = process.env.PAIRING_PHONE_NUMBER;
        if (envPhone) {
            // Slight delay so the socket is fully ready before requesting
            setTimeout(() => {
                requestPairingCode(sock, envPhone).catch(err =>
                    console.error('❌ Pairing code request failed:', err.message)
                );
            }, 3000);
        } else {
            console.log('📲 Pairing-code mode: waiting for phone number.');
            console.log('   Set PAIRING_PHONE_NUMBER in .env, or submit it via the web UI at /');
        }

        // Attach a one-off method onto sock so webServer.js can trigger it on demand
        sock.__requestPairingCode = (phoneNumber) => requestPairingCode(sock, phoneNumber);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !usePairingCode) {
            console.log('📱 Scan the QR code above with your WhatsApp app.');
            console.log('   (Settings → Linked Devices → Link a Device)');
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;

            console.log(`⚠️  Connection closed. Status: ${statusCode}`);

            if (isLoggedOut) {
                console.log('🔒 Logged out. Clearing auth and restarting...');
                fs.rmSync(authPath, { recursive: true, force: true });
                fs.mkdirSync(authPath, { recursive: true });
                reconnectAttempts = 0;
                pairingState = { status: 'disconnected', code: null, phoneNumber: null };
                setTimeout(() => connectToWhatsApp(messageHandler, options), 3000);
            } else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = Math.min(5000 * reconnectAttempts, 30000);
                console.log(`🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                setTimeout(() => connectToWhatsApp(messageHandler, options), delay);
            } else {
                console.error('❌ Max reconnect attempts reached. Please restart the bot manually.');
                process.exit(1);
            }

        } else if (connection === 'open') {
            reconnectAttempts = 0;
            pairingState.status = 'connected';
            pairingState.code = null;
            console.log('✅ WhatsApp connected successfully!');
            console.log('🤖 Bot is ready. Use .help to see commands.');
        } else if (connection === 'connecting') {
            console.log('⏳ Connecting to WhatsApp...');
        }
    });

    // Attach message handler if provided
    if (messageHandler) {
        sock.ev.on('messages.upsert', async (m) => {
            await messageHandler(m, sock);
        });
    }

    return sock;
}

module.exports = { connectToWhatsApp, requestPairingCode, getPairingState };
