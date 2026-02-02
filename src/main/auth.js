const jwt = require('jsonwebtoken');
const config = require('./config');

const TOKEN_EXPIRY = '24h';

const auth = {
  // Generate JWT token
  generateToken(payload = {}) {
    const secret = config.getJwtSecret();
    return jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000)
      },
      secret,
      { expiresIn: TOKEN_EXPIRY }
    );
  },

  // Verify JWT token
  verifyToken(token) {
    try {
      const secret = config.getJwtSecret();
      const decoded = jwt.verify(token, secret);
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  // Authenticate with PIN
  async authenticate(pin) {
    if (!config.hasPin()) {
      // If no PIN is set, set it now
      await config.setPin(pin);
      return { success: true, token: this.generateToken() };
    }

    const valid = await config.verifyPin(pin);
    if (valid) {
      return { success: true, token: this.generateToken() };
    }
    return { success: false, error: 'Invalid PIN' };
  },

  // Express middleware for authentication
  middleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const result = auth.verifyToken(token);

    if (!result.valid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.decoded;
    next();
  },

  // WebSocket authentication
  authenticateWebSocket(token) {
    return this.verifyToken(token);
  }
};

module.exports = auth;
