const fs = require('fs');
const path = require('path');
const { getConfig } = require('./utils');

// Store verification codes
const verificationCodes = new Map();

class PhoneAuth {
    constructor(sock) {
        this.sock = sock;
        this.enabled = getConfig('phoneAuth.enabled', true);
        this.codeExpiry = getConfig('phoneAuth.codeExpiry', 600000);
        this.maxAttempts = getConfig('phoneAuth.maxAttempts', 3);
    }

    /**
     * Generate and send verification code to a phone number
     */
    async sendVerificationCode(phoneNumber) {
        if (!this.enabled) {
            throw new Error('Phone authentication is disabled');
        }

        // Validate phone number
        if (!this.isValidPhoneNumber(phoneNumber)) {
            throw new Error('Invalid phone number format');
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationId = this.generateVerificationId();
        
        // Store verification data
        verificationCodes.set(verificationId, {
            phoneNumber: this.formatPhoneNumber(phoneNumber),
            code: code,
            timestamp: Date.now(),
            attempts: 0,
            verified: false
        });

        // Send code via WhatsApp
        await this.sendWhatsAppCode(phoneNumber, code);

        return {
            verificationId: verificationId,
            message: 'Verification code sent to WhatsApp'
        };
    }

    /**
     * Verify the code entered by user
     */
    async verifyCode(verificationId, enteredCode) {
        const verification = verificationCodes.get(verificationId);
        
        if (!verification) {
            throw new Error('Invalid verification ID');
        }

        // Check if code is expired
        if (Date.now() - verification.timestamp > this.codeExpiry) {
            verificationCodes.delete(verificationId);
            throw new Error('Verification code has expired');
        }

        // Check max attempts
        if (verification.attempts >= this.maxAttempts) {
            verificationCodes.delete(verificationId);
            throw new Error('Too many failed attempts');
        }

        verification.attempts++;

        if (verification.code !== enteredCode) {
            throw new Error('Invalid verification code');
        }

        // Code is correct
        verification.verified = true;
        verificationCodes.set(verificationId, verification);

        return {
            success: true,
            phoneNumber: verification.phoneNumber,
            message: 'Phone number verified successfully'
        };
    }

    /**
     * Send WhatsApp message with verification code
     */
    async sendWhatsAppCode(phoneNumber, code) {
        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const message = `Your verification code is: *${code}*\nThis code will expire in 10 minutes.`;

            await this.sock.sendMessage(`${formattedNumber}@s.whatsapp.net`, {
                text: message
            });

            console.log(`Verification code sent to ${formattedNumber}`);
        } catch (error) {
            throw new Error(`Failed to send verification code: ${error.message}`);
        }
    }

    /**
     * Validate phone number format
     */
    isValidPhoneNumber(phoneNumber) {
        // Remove any non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Basic validation - at least 10 digits
        return cleaned.length >= 10;
    }

    /**
     * Format phone number to international format
     */
    formatPhoneNumber(phoneNumber) {
        // Remove any non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // If number starts with 0, remove it and add country code
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1); // Default to Indonesia code
        }
        
        // Ensure it has country code
        if (!cleaned.startsWith('+') && cleaned.length === 10) {
            cleaned = '1' + cleaned; // Default to US code
        }

        return cleaned;
    }

    /**
     * Generate unique verification ID
     */
    generateVerificationId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Clean up expired verification codes
     */
    cleanupExpiredCodes() {
        const now = Date.now();
        for (const [id, verification] of verificationCodes.entries()) {
            if (now - verification.timestamp > this.codeExpiry) {
                verificationCodes.delete(id);
                console.log(`Cleaned up expired verification code for ${verification.phoneNumber}`);
            }
        }
    }

    /**
     * Get verification status
     */
    getVerificationStatus(verificationId) {
        return verificationCodes.get(verificationId);
    }
}

// Start cleanup interval
setInterval(() => {
    new PhoneAuth().cleanupExpiredCodes();
}, 300000); // Clean every 5 minutes

module.exports = PhoneAuth;
