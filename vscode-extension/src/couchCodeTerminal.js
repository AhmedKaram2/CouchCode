const vscode = require('vscode');
const WebSocket = require('ws');
const http = require('http');

/**
 * CouchCode Native Terminal Provider
 * Creates a VS Code terminal backed by a CouchCode remote session.
 * This gives a native-feeling terminal experience within VS Code.
 */
class CouchCodeTerminal {
    constructor(serverUrl, authParams) {
        this._serverUrl = serverUrl;
        this._authParams = authParams || {};
        this._ws = null;
        this._sessionId = null;
        this._writeEmitter = new vscode.EventEmitter();
        this._closeEmitter = new vscode.EventEmitter();
        this._terminal = null;
    }

    static create(serverUrl, authParams) {
        const provider = new CouchCodeTerminal(serverUrl, authParams);
        const terminal = vscode.window.createTerminal({
            name: `CouchCode (${new URL(serverUrl).hostname})`,
            pty: provider
        });
        provider._terminal = terminal;
        return terminal;
    }

    // Terminal PseudoTerminal interface
    get onDidWrite() { return this._writeEmitter.event; }
    get onDidClose() { return this._closeEmitter.event; }

    open(initialDimensions) {
        this._cols = initialDimensions?.columns || 80;
        this._rows = initialDimensions?.rows || 24;
        this._writeEmitter.fire('Connecting to CouchCode at ' + this._serverUrl + '...\r\n');
        this._connect();
    }

    close() {
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    }

    handleInput(data) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN && this._sessionId) {
            this._ws.send(JSON.stringify({ type: 'input', data }));
        }
    }

    setDimensions(dimensions) {
        this._cols = dimensions.columns;
        this._rows = dimensions.rows;
        if (this._ws && this._ws.readyState === WebSocket.OPEN && this._sessionId) {
            this._ws.send(JSON.stringify({
                type: 'resize',
                cols: dimensions.columns,
                rows: dimensions.rows
            }));
        }
    }

    async _connect() {
        try {
            const token = await this._authenticate();
            if (!token) {
                this._writeEmitter.fire('\r\nAuthentication failed. Check your CouchCode settings.\r\n');
                this._closeEmitter.fire(1);
                return;
            }

            const wsUrl = this._serverUrl.replace(/^http/, 'ws');
            this._ws = new WebSocket(wsUrl);

            this._ws.on('open', () => {
                this._ws.send(JSON.stringify({ type: 'auth', token }));
            });

            this._ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    this._handleMessage(msg);
                } catch (e) {
                    console.error('CouchCode: Failed to parse message:', e);
                }
            });

            this._ws.on('close', () => {
                this._writeEmitter.fire('\r\nDisconnected from CouchCode.\r\n');
                this._closeEmitter.fire(0);
            });

            this._ws.on('error', (err) => {
                this._writeEmitter.fire('\r\nConnection error: ' + err.message + '\r\n');
                this._closeEmitter.fire(1);
            });

        } catch (e) {
            this._writeEmitter.fire('\r\nFailed to connect: ' + e.message + '\r\n');
            this._closeEmitter.fire(1);
        }
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'auth_success':
                this._writeEmitter.fire('Authenticated. Creating session...\r\n');
                this._ws.send(JSON.stringify({
                    type: 'create_session',
                    name: `vscode-${require('os').hostname()}`
                }));
                break;

            case 'session_created':
                this._sessionId = msg.session.id;
                this._ws.send(JSON.stringify({
                    type: 'attach',
                    sessionId: this._sessionId
                }));
                break;

            case 'attached':
                // Send initial dimensions
                this._ws.send(JSON.stringify({
                    type: 'resize',
                    cols: this._cols,
                    rows: this._rows
                }));
                break;

            case 'output':
                this._writeEmitter.fire(msg.data);
                break;

            case 'history':
                this._writeEmitter.fire(msg.data);
                break;

            case 'session_ended':
                this._writeEmitter.fire('\r\nSession ended.\r\n');
                this._closeEmitter.fire(0);
                break;

            case 'auth_error':
                this._writeEmitter.fire('\r\nAuthentication error: ' + (msg.message || 'Invalid token') + '\r\n');
                this._closeEmitter.fire(1);
                break;

            case 'error':
                this._writeEmitter.fire('\r\nError: ' + (msg.message || 'Unknown error') + '\r\n');
                break;
        }
    }

    async _authenticate() {
        const { apiToken, pin, autoApprove } = this._authParams;

        // Try API token
        if (apiToken) {
            const result = await this._authRequest({ apiToken });
            if (result) return result;
        }

        // Try auto-approve (localhost)
        if (autoApprove) {
            const result = await this._authRequest({
                deviceFingerprint: `vscode-${require('os').hostname()}`,
                deviceName: `VS Code (${require('os').hostname()})`
            });
            if (result) return result;
        }

        // Try PIN
        if (pin) {
            const result = await this._authRequest({ pin });
            if (result) return result;
        }

        // Prompt for PIN
        const inputPin = await vscode.window.showInputBox({
            prompt: 'Enter CouchCode PIN',
            password: true,
            placeHolder: 'PIN'
        });

        if (inputPin) {
            return this._authRequest({ pin: inputPin });
        }

        return null;
    }

    _authRequest(body) {
        return new Promise((resolve) => {
            const url = new URL('/api/auth/login', this._serverUrl);
            const postData = JSON.stringify(body);

            const req = http.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(res.statusCode === 200 ? result.token : null);
                    } catch {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.write(postData);
            req.end();
        });
    }
}

module.exports = CouchCodeTerminal;
