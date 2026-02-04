const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');
const auth = require('./auth');
const config = require('./config');
const ptyManager = require('./pty-manager');
const { serverLogger: logger } = require('./logger');

// Input validation helpers
const validators = {
  /**
   * Validate session name (alphanumeric, spaces, dashes, underscores)
   */
  sessionName(name) {
    if (!name || typeof name !== 'string') return null;
    const sanitized = name.trim().slice(0, 50);
    if (!/^[\w\s\-]+$/.test(sanitized)) return null;
    return sanitized;
  },

  /**
   * Validate shell path against whitelist
   */
  shellPath(shellPath) {
    if (!shellPath || typeof shellPath !== 'string') return null;
    const availableShells = ptyManager.getAvailableShells();
    const shell = availableShells.find(s => s.path === shellPath);
    return shell ? shellPath : null;
  },

  /**
   * Validate session ID (UUID format)
   */
  sessionId(id) {
    if (!id || typeof id !== 'string') return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) ? id : null;
  },

  /**
   * Validate resize dimensions
   */
  dimensions(cols, rows) {
    const c = parseInt(cols, 10);
    const r = parseInt(rows, 10);
    if (isNaN(c) || isNaN(r)) return null;
    if (c < 1 || c > 500 || r < 1 || r > 200) return null;
    return { cols: c, rows: r };
  },

  /**
   * Validate terminal input data
   */
  terminalInput(data) {
    if (data === undefined || data === null) return null;
    if (typeof data !== 'string') return null;
    // Allow any printable characters and control sequences
    // Limit size to prevent memory issues
    if (data.length > 10000) return data.slice(0, 10000);
    return data;
  }
};

class Server {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.clients = new Map(); // WebSocket -> { authenticated, sessionId }
    this.running = false;
  }

  /**
   * Get local IP address (cross-platform)
   */
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.internal) continue;
        const isIPv4 = iface.family === 'IPv4' || iface.family === 4;

        if (isIPv4) {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('ethernet') ||
              lowerName.includes('wi-fi') ||
              lowerName.includes('wifi') ||
              lowerName === 'en0' ||
              lowerName === 'eth0' ||
              lowerName.startsWith('wlan')) {
            candidates.unshift(iface.address);
          } else {
            candidates.push(iface.address);
          }
        }
      }
    }

    return candidates.length > 0 ? candidates[0] : '127.0.0.1';
  }

  /**
   * Setup Express middleware and routes
   */
  setupRoutes() {
    // Security headers middleware
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      // CSP - allow inline scripts for PWA functionality
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' ws: wss:; " +
        "font-src 'self';"
      );
      next();
    });

    this.app.use(express.json({ limit: '1mb' }));

    // Serve PWA static files
    this.app.use(express.static(path.join(__dirname, '../client')));

    // Health check
    this.app.get('/api/status', (req, res) => {
      res.json({
        version: '1.0.0',
        uptime: process.uptime(),
        activeSessions: ptyManager.getSessions().length,
        connectedClients: this.clients.size
      });
    });

    // Authentication
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { pin } = req.body;
        if (!pin) {
          return res.status(400).json({ error: 'PIN is required' });
        }

        const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
        const result = await auth.authenticate(pin, clientIP);

        if (result.success) {
          const expiry = auth.getTokenExpiry();
          res.json({
            token: result.token,
            expiresIn: expiry.expiresInSeconds,
            isNewPin: result.isNewPin || false
          });
        } else {
          const status = result.rateLimited ? 429 : 401;
          res.status(status).json({ error: result.error });
        }
      } catch (error) {
        logger.error('Authentication error', { error });
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // Check if PIN is set
    this.app.get('/api/auth/status', (req, res) => {
      res.json({ pinRequired: config.hasPin() });
    });

    // Get sessions (protected)
    this.app.get('/api/sessions', auth.middleware, (req, res) => {
      try {
        res.json({ sessions: ptyManager.getSessions() });
      } catch (error) {
        logger.error('Failed to get sessions', { error });
        res.status(500).json({ error: 'Failed to retrieve sessions' });
      }
    });

    // Create session (protected)
    this.app.post('/api/sessions', auth.middleware, (req, res) => {
      try {
        const { name, shell } = req.body;

        // Validate inputs
        const validName = validators.sessionName(name) || 'New Session';
        const validShell = shell ? validators.shellPath(shell) : null;

        if (shell && !validShell) {
          logger.security('Invalid shell path attempted', {
            ip: req.ip,
            details: shell
          });
          return res.status(400).json({ error: 'Invalid shell path' });
        }

        const options = { name: validName };
        if (validShell) options.shell = validShell;

        const session = ptyManager.createSession(options);
        logger.info('Session created', { data: { sessionId: session.id, name: validName } });
        res.json(session);
      } catch (error) {
        logger.error('Failed to create session', { error });
        res.status(500).json({ error: 'Failed to create session' });
      }
    });

    // Delete session (protected)
    this.app.delete('/api/sessions/:id', auth.middleware, (req, res) => {
      try {
        const sessionId = validators.sessionId(req.params.id);
        if (!sessionId) {
          return res.status(400).json({ error: 'Invalid session ID' });
        }

        const killed = ptyManager.killSession(sessionId);
        if (killed) {
          logger.info('Session killed', { data: { sessionId } });
          res.json({ success: true });
        } else {
          res.status(404).json({ error: 'Session not found' });
        }
      } catch (error) {
        logger.error('Failed to delete session', { error });
        res.status(500).json({ error: 'Failed to delete session' });
      }
    });

    // Generate QR code
    this.app.get('/api/qr-code', async (req, res) => {
      try {
        const url = this.getConnectionURL();
        const qrCode = await QRCode.toDataURL(url, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        res.json({ qrCode, url });
      } catch (error) {
        logger.error('Failed to generate QR code', { error });
        res.status(500).json({ error: 'Failed to generate QR code' });
      }
    });

    // Serve PWA for any other route
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/index.html'));
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled Express error', { error: err });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup WebSocket server
   */
  setupWebSocket() {
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      const clientIP = req.socket?.remoteAddress || 'unknown';
      this.clients.set(ws, { authenticated: false, sessionId: null, ip: clientIP });

      ws.on('message', (message) => {
        this.handleWebSocketMessage(ws, message);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error, data: { ip: clientIP } });
        this.clients.delete(ws);
      });
    });

    // Forward PTY output to connected clients
    ptyManager.on('output', (sessionId, data) => {
      for (const [ws, client] of this.clients) {
        if (client.authenticated && client.sessionId === sessionId) {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'output', data }));
            } catch (error) {
              logger.error('Failed to send output to client', { error });
            }
          }
        }
      }
    });

    // Notify clients when session ends
    ptyManager.on('exit', (sessionId) => {
      for (const [ws, client] of this.clients) {
        if (client.authenticated && client.sessionId === sessionId) {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'session_ended', sessionId }));
              client.sessionId = null;
            } catch (error) {
              logger.error('Failed to notify client of session end', { error });
            }
          }
        }
      }
      this.broadcastSessionsUpdate();
    });
  }

  /**
   * Handle WebSocket messages with validation
   */
  handleWebSocketMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client) return;

    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (error) {
      this.sendError(ws, 'Invalid message format');
      return;
    }

    if (!data || typeof data.type !== 'string') {
      this.sendError(ws, 'Invalid message structure');
      return;
    }

    try {
      switch (data.type) {
        case 'auth':
          this.handleAuth(ws, client, data.token);
          break;

        case 'attach':
          this.handleAttach(ws, client, data.sessionId);
          break;

        case 'detach':
          if (client.authenticated) {
            client.sessionId = null;
            ws.send(JSON.stringify({ type: 'detached' }));
          }
          break;

        case 'input':
          if (client.authenticated && client.sessionId) {
            const validInput = validators.terminalInput(data.data);
            if (validInput !== null) {
              ptyManager.write(client.sessionId, validInput);
            }
          }
          break;

        case 'resize':
          if (client.authenticated && client.sessionId) {
            const dims = validators.dimensions(data.cols, data.rows);
            if (dims) {
              ptyManager.resize(client.sessionId, dims.cols, dims.rows);
            }
          }
          break;

        case 'create_session':
          this.handleCreateSession(ws, client, data);
          break;

        default:
          this.sendError(ws, 'Unknown message type');
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error, data: { type: data.type } });
      this.sendError(ws, 'Failed to process message');
    }
  }

  /**
   * Send error message to WebSocket client
   */
  sendError(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message }));
      }
    } catch (error) {
      logger.error('Failed to send error message', { error });
    }
  }

  /**
   * Handle WebSocket authentication
   */
  handleAuth(ws, client, token) {
    logger.debug('Authenticating WebSocket client', { data: { ip: client.ip } });
    const result = auth.authenticateWebSocket(token);

    if (result.valid) {
      client.authenticated = true;
      logger.info('WebSocket client authenticated', { data: { ip: client.ip } });
      ws.send(JSON.stringify({ type: 'auth_success' }));
    } else {
      logger.warn('WebSocket authentication failed', { data: { ip: client.ip, reason: result.error } });
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
    }
  }

  /**
   * Handle session attachment
   */
  handleAttach(ws, client, sessionId) {
    if (!client.authenticated) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    const validSessionId = validators.sessionId(sessionId);
    if (!validSessionId) {
      this.sendError(ws, 'Invalid session ID');
      return;
    }

    const session = ptyManager.getSession(validSessionId);
    if (session) {
      client.sessionId = validSessionId;

      ws.send(JSON.stringify({
        type: 'attached',
        sessionId: validSessionId,
        cols: session.cols,
        rows: session.rows
      }));

      // Send session history
      const history = ptyManager.getSessionHistory(validSessionId);
      if (history && history.length > 0) {
        ws.send(JSON.stringify({ type: 'history', data: history }));
      }
    } else {
      this.sendError(ws, 'Session not found');
    }
  }

  /**
   * Handle session creation via WebSocket
   */
  handleCreateSession(ws, client, data) {
    if (!client.authenticated) {
      logger.debug('Rejecting create_session: not authenticated');
      this.sendError(ws, 'Not authenticated');
      return;
    }

    try {
      const validName = validators.sessionName(data.name) || 'New Session';
      const session = ptyManager.createSession({ name: validName });

      logger.info('Session created via WebSocket', { data: { sessionId: session.id, ip: client.ip } });
      ws.send(JSON.stringify({ type: 'session_created', session }));
      this.broadcastSessionsUpdate();
    } catch (error) {
      logger.error('Failed to create session', { error });
      this.sendError(ws, 'Failed to create session: ' + error.message);
    }
  }

  /**
   * Get connection URL
   */
  getConnectionURL() {
    const ip = this.getLocalIP();
    const port = config.getPort();
    return `http://${ip}:${port}`;
  }

  /**
   * Start the server
   */
  start() {
    return new Promise((resolve, reject) => {
      if (this.running) {
        return resolve({ url: this.getConnectionURL() });
      }

      try {
        this.app = express();
        this.setupRoutes();

        this.server = http.createServer(this.app);
        this.setupWebSocket();

        const port = config.getPort();

        this.server.listen(port, '0.0.0.0', () => {
          this.running = true;
          const url = this.getConnectionURL();
          logger.info('Server started', { data: { url, port } });
          resolve({ url, port });
        });

        this.server.on('error', (error) => {
          this.running = false;
          logger.error('Server error', { error });
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start server', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.running) {
        return resolve();
      }

      logger.info('Stopping server');

      // Close all WebSocket connections
      for (const [ws] of this.clients) {
        try {
          ws.close();
        } catch (error) {
          logger.error('Error closing WebSocket', { error });
        }
      }
      this.clients.clear();

      // Kill all PTY sessions
      ptyManager.killAll();

      // Close WebSocket server
      if (this.wss) {
        try {
          this.wss.close();
        } catch (error) {
          logger.error('Error closing WebSocket server', { error });
        }
      }

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          this.running = false;
          logger.info('Server stopped');
          resolve();
        });
      } else {
        this.running = false;
        resolve();
      }
    });
  }

  /**
   * Check if server is running
   */
  isRunning() {
    return this.running;
  }

  /**
   * Get connected clients count
   */
  getClientCount() {
    let count = 0;
    for (const [, client] of this.clients) {
      if (client.authenticated) count++;
    }
    return count;
  }

  /**
   * Broadcast sessions update to all authenticated clients
   */
  broadcastSessionsUpdate() {
    const sessions = ptyManager.getSessions();
    const message = JSON.stringify({ type: 'sessions_update', sessions });

    for (const [ws, client] of this.clients) {
      if (client.authenticated && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          logger.error('Failed to broadcast sessions update', { error });
        }
      }
    }
  }
}

module.exports = new Server();
