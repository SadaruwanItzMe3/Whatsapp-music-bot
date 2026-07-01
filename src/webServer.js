const express = require('express');
const path = require('path');
const { requestPairingCode, getPairingState } = require('./whatsappClient');

let connectionStatus = 'disconnected';
let app = null;

function startWebServer(sock, config) {
    const port = config.webServer?.port || process.env.PORT || 3000;

    app = express();
    app.use(express.json());
    app.use(express.static(path.join(process.cwd(), 'public')));

    // ── Status endpoint ──────────────────────────────────────────────
    app.get('/status', (req, res) => {
        res.json({
            status: connectionStatus,
            timestamp: new Date().toISOString()
        });
    });

    // ── Pairing state polling endpoint ─────────────────────────────────
    app.get('/api/pairing-state', (req, res) => {
        const state = getPairingState();
        res.json(state);
    });

    // ── Request a pairing code for a phone number ────────────────────
    app.post('/api/phone-auth/request', async (req, res) => {
        const { phoneNumber } = req.body || {};
        if (!phoneNumber) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }

        try {
            const code = await (sock.__requestPairingCode
                ? sock.__requestPairingCode(phoneNumber)
                : requestPairingCode(sock, phoneNumber));

            res.json({ success: true, code });
        } catch (err) {
            console.error('Pairing code request failed:', err.message);
            res.status(400).json({ success: false, error: err.message });
        }
    });

    // ── Track connection state ────────────────────────────────────────
    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            connectionStatus = 'connected';
        } else if (connection === 'close') {
            connectionStatus = 'disconnected';
        } else if (connection === 'connecting') {
            connectionStatus = 'connecting';
        }
    });

    app.listen(port, () => {
        console.log(`🌐 Web server running at http://localhost:${port}`);
        console.log(`   Open this URL to enter your phone number and get a pairing code.`);
    });

    return app;
}

module.exports = { startWebServer };
