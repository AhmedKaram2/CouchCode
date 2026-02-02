const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');
const auth = require('./auth');
const config = require('./config');
const ptyManager = require('./pty-manager');

class Server {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.clients = new Map(); // WebSocket -> { authenticated, sessionId }
    this.running = false;
  }

  // Get local IP address (cross-platform)
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal (loopback) interfaces
        if (iface.internal) continue;

        // Handle both IPv4 and legacy 'IPv4' string (Node.js versions differ)
        const isIPv4 = iface.family === 'IPv4' || iface.family === 4;

        if (isIPv4) {
          // Prioritize certain interface names based on platform
          const lowerName = name.toLowerCase();

          // High priority: Ethernet, WiFi, en0 (macOS), eth0 (Linux)
          if (lowerName.includes('ethernet') ||
              lowerName.includes('wi-fi') ||
              lowerName.includes('wifi') ||
              lowerName === 'en0' ||
              lowerName === 'eth0' ||
              lowerName.startsWith('wlan')) {
            candidates.unshift(iface.address); // Add to front
          } else {
            candidates.push(iface.address);
          }
        }
      }
    }

    // Return first candidate or fallback to localhost
    return candidates.length > 0 ? candidates[0] : '127.0.0.1';
  }

  // Setup Express routes
  setupRoutes() {
    this.app.use(express.json());

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
        const result = await auth.authenticate(pin);
        if (result.success) {
          res.json({ token: result.token, expiresIn: 86400 });
        } else {
          res.status(401).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // Check if PIN is set
    this.app.get('/api/auth/status', (req, res) => {
      res.json({ pinRequired: config.hasPin() });
    });

    // Get sessions (protected)
    this.app.get('/api/sessions', auth.middleware, (req, res) => {
      res.json({ sessions: ptyManager.getSessions() });
    });

    // Create session (protected)
    this.app.post('/api/sessions', auth.middleware, (req, res) => {
      try {
        const { name, shell } = req.body;
        const session = ptyManager.createSession({ name, shell });
        res.json(session);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create session' });
      }
    });

    // Delete session (protected)
    this.app.delete('/api/sessions/:id', auth.middleware, (req, res) => {
      const { id } = req.params;
      const killed = ptyManager.killSession(id);
      if (killed) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Session not found' });
      }
    });

    // Generate QR code
    this.app.get('/api/qr-code', async (req, res) => {
      try {
        const url = this.getConnectionURL();
        const qrCode = await QRCode.toDataURL(url, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        res.json({ qrCode, url });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR code' });
      }
    });

    // Serve PWA for any other route
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/index.html'));
    });
  }

  // Setup WebSocket server
  setupWebSocket() {
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws) => {
      this.clients.set(ws, { authenticated: false, sessionId: null });

      ws.on('message', (message) => {
        this.handleWebSocketMessage(ws, message);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Forward PTY output to connected clients
    ptyManager.on('output', (sessionId, data) => {
      for (const [ws, client] of this.clients) {
        if (client.authenticated && client.sessionId === sessionId) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'output', data }));
          }
        }
      }
    });

    // Notify clients when session ends
    ptyManager.on('exit', (sessionId) => {
      for (const [ws, client] of this.clients) {
        if (client.authenticated && client.sessionId === sessionId) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'session_ended', sessionId }));
            client.sessionId = null;
          }
        }
      }
      // Broadcast session list update to all clients
      this.broadcastSessionsUpdate();
    });
  }

  // Handle WebSocket messages
  handleWebSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message.toString());
      const client = this.clients.get(ws);

      switch (data.type) {
        case 'auth':
          this.handleAuth(ws, client, data.token);
          break;

        case 'attach':
          this.handleAttach(ws, client, data.sessionId);
          break;

        case 'detach':
          client.sessionId = null;
          ws.send(JSON.stringify({ type: 'detached' }));
          break;

        case 'input':
          if (client.authenticated && client.sessionId) {
            ptyManager.write(client.sessionId, data.data);
          }
          break;

        case 'resize':
          if (client.authenticated && client.sessionId) {
            ptyManager.resize(client.sessionId, data.cols, data.rows);
          }
          break;

        case 'create_session':
          console.log('Create session request, authenticated:', client.authenticated);
          if (client.authenticated) {
            try {
              const session = ptyManager.createSession({ name: data.name });
              console.log('Session created:', session);
              ws.send(JSON.stringify({ type: 'session_created', session }));
              // Broadcast session list update to all authenticated clients
              this.broadcastSessionsUpdate();
            } catch (err) {
              console.error('Failed to create session:', err);
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to create session: ' + err.message }));
            }
          } else {
            console.log('Client not authenticated, rejecting create_session');
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          }
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  // Handle WebSocket authentication
  handleAuth(ws, client, token) {
    console.log('Authenticating WebSocket client');
    const result = auth.authenticateWebSocket(token);
    if (result.valid) {
      client.authenticated = true;
      console.log('WebSocket client authenticated successfully');
      ws.send(JSON.stringify({ type: 'auth_success' }));
    } else {
      console.log('WebSocket authentication failed:', result.error);
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
    }
  }

  // Handle session attachment
  handleAttach(ws, client, sessionId) {
    if (!client.authenticated) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
      return;
    }

    const session = ptyManager.getSession(sessionId);
    if (session) {
      client.sessionId = sessionId;

      // Send attachment confirmation
      ws.send(JSON.stringify({
        type: 'attached',
        sessionId,
        cols: session.cols,
        rows: session.rows
      }));

      // Send session history to sync the terminal
      const history = ptyManager.getSessionHistory(sessionId);
      if (history && history.length > 0) {
        ws.send(JSON.stringify({
          type: 'history',
          data: history
        }));
      }
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    }
  }

  // Get connection URL
  getConnectionURL() {
    const ip = this.getLocalIP();
    const port = config.getPort();
    return `http://${ip}:${port}`;
  }

  // Start the server
  start() {
    return new Promise((resolve, reject) => {
      if (this.running) {
        return resolve({ url: this.getConnectionURL() });
      }

      this.app = express();
      this.setupRoutes();

      this.server = http.createServer(this.app);
      this.setupWebSocket();

      const port = config.getPort();

      this.server.listen(port, '0.0.0.0', () => {
        this.running = true;
        const url = this.getConnectionURL();
        console.log(`Server running at ${url}`);
        resolve({ url, port });
      });

      this.server.on('error', (error) => {
        this.running = false;
        reject(error);
      });
    });
  }

  // Stop the server
  stop() {
    return new Promise((resolve) => {
      if (!this.running) {
        return resolve();
      }

      // Close all WebSocket connections
      for (const [ws] of this.clients) {
        ws.close();
      }
      this.clients.clear();

      // Kill all PTY sessions
      ptyManager.killAll();

      // Close the server
      if (this.wss) {
        this.wss.close();
      }

      if (this.server) {
        this.server.close(() => {
          this.running = false;
          resolve();
        });
      } else {
        this.running = false;
        resolve();
      }
    });
  }

  // Check if server is running
  isRunning() {
    return this.running;
  }

  // Get connected clients count
  getClientCount() {
    let count = 0;
    for (const [, client] of this.clients) {
      if (client.authenticated) {
        count++;
      }
    }
    return count;
  }

  // Broadcast sessions update to all authenticated clients
  broadcastSessionsUpdate() {
    const sessions = ptyManager.getSessions();
    const message = JSON.stringify({ type: 'sessions_update', sessions });

    for (const [ws, client] of this.clients) {
      if (client.authenticated && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

module.exports = new Server();
