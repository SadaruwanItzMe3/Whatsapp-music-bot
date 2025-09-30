const express = require('express');
const cors = require('cors');
const path = require('path');
const PhoneAuth = require('./phoneAuth');

let phoneAuthInstance = null;

function startWebServer(sock, config) {
    const app = express();
    const port = process.env.PORT || config.webServer?.port || 3000;
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.static('public'));
    
    // Initialize phone authentication
    phoneAuthInstance = new PhoneAuth(sock);
    
    // Routes
    app.get('/', (req, res) => {
        res.json({
            message: 'WhatsApp Music Bot API',
            status: 'running',
            version: '1.0.0'
        });
    });
    
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'OK', 
            service: 'WhatsApp Bot',
            timestamp: new Date().toISOString()
        });
    });
    
    // Start server
    app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 Web server running on port ${port}`);
    });
    
    return app;
}

module.exports = { startWebServer };
