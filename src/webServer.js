const express = require('express');
const path = require('path');

let currentQR = null;
let connectionStatus = 'disconnected';
let app = null;

function startWebServer(sock, config) {
    const port = config.webServer?.port || process.env.PORT || 3000;

    app = express();
    app.use(express.json());

    // ── Status endpoint ──────────────────────────────────────────────
    app.get('/status', (req, res) => {
        res.json({
            status: connectionStatus,
            hasQR: !!currentQR,
            timestamp: new Date().toISOString()
        });
    });

    // ── QR code page (simple HTML) ────────────────────────────────────
    app.get('/', (req, res) => {
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>WhatsApp Music Bot</title>
  <style>
    body { font-family: sans-serif; background: #111; color: #eee; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    h1 { color: #25D366; }
    #status { margin: 12px 0; padding: 8px 20px; border-radius: 20px; font-weight: bold; }
    .connected    { background: #1a4a2e; color: #25D366; }
    .disconnected { background: #4a1a1a; color: #f55; }
    .connecting   { background: #3a3a1a; color: #ff0; }
    #qr-box { margin: 20px; padding: 16px; background: #fff; border-radius: 12px; }
    #qr-box img { display: block; }
    p { color: #aaa; font-size: 14px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body>
  <h1>🎵 WhatsApp Music Bot</h1>
  <div id="status" class="connecting">Connecting...</div>
  <div id="qr-container">
    <div id="qr-box"></div>
    <p id="qr-hint">Waiting for QR code...</p>
  </div>
  <script>
    async function poll() {
      try {
        const r = await fetch('/api/qr');
        const d = await r.json();
        const statusEl = document.getElementById('status');
        const hint = document.getElementById('qr-hint');

        if (d.status === 'connected') {
          statusEl.textContent = '✅ Connected';
          statusEl.className = 'connected';
          document.getElementById('qr-box').innerHTML = '';
          hint.textContent = 'Bot is online!';
        } else if (d.qr) {
          statusEl.textContent = '📱 Scan QR Code';
          statusEl.className = 'connecting';
          const box = document.getElementById('qr-box');
          box.innerHTML = '';
          new QRCode(box, { text: d.qr, width: 256, height: 256 });
          hint.textContent = 'Open WhatsApp → Settings → Linked Devices → Link a Device';
        } else {
          statusEl.textContent = '⏳ Waiting...';
          statusEl.className = 'disconnected';
          hint.textContent = 'Starting up...';
        }
      } catch(e) {}
      setTimeout(poll, 3000);
    }
    poll();
  </script>
</body>
</html>`);
    });

    // ── QR API ──────────────────────────────────────────────────────
    app.get('/api/qr', (req, res) => {
        res.json({ qr: currentQR, status: connectionStatus });
    });

    // ── Track connection state ────────────────────────────────────────
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) currentQR = qr;
        if (connection === 'open') {
            connectionStatus = 'connected';
            currentQR = null;
        } else if (connection === 'close') {
            connectionStatus = 'disconnected';
        } else if (connection === 'connecting') {
            connectionStatus = 'connecting';
        }
    });

    app.listen(port, () => {
        console.log(`🌐 Web server running at http://localhost:${port}`);
        console.log(`   Open this URL to scan QR code if needed.`);
    });

    return app;
}

module.exports = { startWebServer };
