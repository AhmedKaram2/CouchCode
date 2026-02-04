const jwt = require('jsonwebtoken');
const config = require('./config');
const { authLogger: logger } = require('./logger');

// Reduced token expiry for security (4 hours instead of 24)
const TOKEN_EXPIRY = '4h';
const TOKEN_EXPIRY_SECONDS = 4 * 60 * 60;

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 5,           // Max failed attempts before lockout
  lockoutDuration: 30000,   // 30 seconds lockout
  cleanupInterval: 60000    // Clean old entries every minute
};

// Track failed authentication attempts by IP
const failedAttempts = new Map();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of failedAttempts) {
    if (now - data.lastAttempt > RATE_LIMIT.lockoutDuration * 2) {
      failedAttempts.delete(ip);
    }
  }
}, RATE_LIMIT.cleanupInterval);

const auth = {
  /**
   * Check if IP is currently rate limited
   */
  isRateLimited(ip) {
    const data = failedAttempts.get(ip);
    if (!data) return false;

    const now = Date.now();
    const timeSinceLockout = now - data.lockoutStart;

    // If in lockout period
    if (data.isLocked && timeSinceLockout < RATE_LIMIT.lockoutDuration) {
      const remainingSeconds = Math.ceil((RATE_LIMIT.lockoutDuration - timeSinceLockout) / 1000);
      return { limited: true, remainingSeconds };
    }

    // Lockout expired, reset
    if (data.isLocked) {
      data.isLocked = false;
      data.attempts = 0;
    }

    return false;
  },

  /**
   * Record a failed authentication attempt
   */
  recordFailedAttempt(ip) {
    const now = Date.now();
    let data = failedAttempts.get(ip);

    if (!data) {
      data = { attempts: 0, lastAttempt: now, isLocked: false, lockoutStart: 0 };
      failedAttempts.set(ip, data);
    }

    data.attempts++;
    data.lastAttempt = now;

    // Check if should be locked out
    if (data.attempts >= RATE_LIMIT.maxAttempts) {
      data.isLocked = true;
      data.lockoutStart = now;
      logger.security('Rate limit triggered', { ip, attempts: data.attempts });
    }

    return data.attempts;
  },

  /**
   * Clear failed attempts for IP (on successful login)
   */
  clearFailedAttempts(ip) {
    failedAttempts.delete(ip);
  },

  /**
   * Generate JWT token with payload
   */
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

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Invalid token format' };
    }

    try {
      const secret = config.getJwtSecret();
      const decoded = jwt.verify(token, secret);
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },

  /**
   * Authenticate with PIN (with rate limiting)
   */
  async authenticate(pin, ip = 'unknown') {
    // Check rate limiting
    const rateLimitStatus = this.isRateLimited(ip);
    if (rateLimitStatus.limited) {
      logger.auth('PIN verification', false, {
        ip,
        reason: `Rate limited (${rateLimitStatus.remainingSeconds}s remaining)`
      });
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${rateLimitStatus.remainingSeconds} seconds.`,
        rateLimited: true
      };
    }

    // Validate PIN format
    if (!pin || typeof pin !== 'string') {
      this.recordFailedAttempt(ip);
      logger.auth('PIN verification', false, { ip, reason: 'Invalid PIN format' });
      return { success: false, error: 'Invalid PIN format' };
    }

    // PIN length validation (4-8 characters)
    if (pin.length < 4 || pin.length > 8) {
      this.recordFailedAttempt(ip);
      logger.auth('PIN verification', false, { ip, reason: 'PIN length out of range' });
      return { success: false, error: 'PIN must be 4-8 characters' };
    }

    // Check if PIN is set
    if (!config.hasPin()) {
      // Set new PIN
      await config.setPin(pin);
      logger.auth('PIN setup', true, { ip });
      return { success: true, token: this.generateToken(), isNewPin: true };
    }

    // Verify existing PIN
    const valid = await config.verifyPin(pin);
    if (valid) {
      this.clearFailedAttempts(ip);
      logger.auth('PIN verification', true, { ip });
      return { success: true, token: this.generateToken() };
    }

    // Failed attempt
    const attemptCount = this.recordFailedAttempt(ip);
    const remainingAttempts = RATE_LIMIT.maxAttempts - attemptCount;
    logger.auth('PIN verification', false, {
      ip,
      reason: 'Invalid PIN',
      remainingAttempts
    });

    return {
      success: false,
      error: remainingAttempts > 0
        ? `Invalid PIN. ${remainingAttempts} attempts remaining.`
        : 'Invalid PIN. Account temporarily locked.'
    };
  },

  /**
   * Express middleware for authentication
   */
  middleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const result = auth.verifyToken(token);

    if (!result.valid) {
      logger.auth('Token verification', false, {
        ip: req.ip,
        reason: result.error
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.decoded;
    next();
  },

  /**
   * WebSocket authentication
   */
  authenticateWebSocket(token) {
    return this.verifyToken(token);
  },

  /**
   * Get token expiry info
   */
  getTokenExpiry() {
    return {
      expiresIn: TOKEN_EXPIRY,
      expiresInSeconds: TOKEN_EXPIRY_SECONDS
    };
  }
};

module.exports = auth;
