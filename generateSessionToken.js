const crypto = require('crypto');

function generateSessionToken() {
    // Generate a random 32-byte buffer
    const buffer = crypto.randomBytes(32);

    // Convert the buffer to a hexadecimal string
    return buffer.toString('hex');
}

module.exports = generateSessionToken
