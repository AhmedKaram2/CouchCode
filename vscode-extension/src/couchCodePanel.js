const vscode = require('vscode');

/**
 * Manages the CouchCode WebView panel
 */
class CouchCodePanel {
    static currentPanel = undefined;
    static viewType = 'couchCodePanel';

    constructor(panel, extensionUri, serverUrl, authParams) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._serverUrl = serverUrl;
        this._authParams = authParams || {};
        this._disposables = [];

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        return;
                    case 'error':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'connected':
                        vscode.window.showInformationMessage('Connected to CouchCode server!');
                        return;
                    case 'disconnected':
                        vscode.window.showWarningMessage('Disconnected from CouchCode server');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    static createOrShow(extensionUri, serverUrl, authParams) {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (CouchCodePanel.currentPanel) {
            CouchCodePanel.currentPanel._panel.reveal(column);
            return CouchCodePanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            CouchCodePanel.viewType,
            'CouchCode Remote Terminal',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        CouchCodePanel.currentPanel = new CouchCodePanel(panel, extensionUri, serverUrl, authParams);
        return CouchCodePanel.currentPanel;
    }

    dispose() {
        CouchCodePanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    reveal() {
        this._panel.reveal();
    }

    _update() {
        const webview = this._panel.webview;
        this._panel.title = 'CouchCode Remote Terminal';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    _getHtmlForWebview(webview) {
        // Build auth query params for the iframe
        const authQuery = [];
        if (this._authParams.apiToken) {
            authQuery.push(`apiToken=${encodeURIComponent(this._authParams.apiToken)}`);
        }
        if (this._authParams.pin) {
            authQuery.push(`pin=${encodeURIComponent(this._authParams.pin)}`);
        }
        if (this._authParams.autoApprove) {
            authQuery.push('autoApprove=true');
        }
        const queryString = authQuery.length > 0 ? '?' + authQuery.join('&') : '';
        const iframeUrl = this._serverUrl + queryString;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${this._serverUrl} http: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>CouchCode Remote Terminal</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100vh;
            overflow: hidden;
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #cccccc);
            font-family: var(--vscode-font-family);
        }
        #connection-status {
            padding: 8px 12px;
            background-color: var(--vscode-sideBar-background, #252526);
            color: var(--vscode-sideBar-foreground, #cccccc);
            border-bottom: 1px solid var(--vscode-panel-border, #3e3e42);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 12px;
        }
        .status-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #ffa500;
            flex-shrink: 0;
        }
        #status-indicator.connected {
            background-color: var(--vscode-testing-iconPassed, #4ec9b0);
        }
        #status-indicator.disconnected {
            background-color: var(--vscode-testing-iconFailed, #f48771);
        }
        .status-actions {
            display: flex;
            gap: 6px;
        }
        .status-actions button {
            background: var(--vscode-button-secondaryBackground, #3a3d41);
            color: var(--vscode-button-secondaryForeground, #cccccc);
            border: none;
            padding: 3px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        .status-actions button:hover {
            background: var(--vscode-button-secondaryHoverBackground, #45494e);
        }
        #couchcode-frame {
            width: 100%;
            height: calc(100vh - 36px);
            border: none;
            background-color: var(--vscode-editor-background, #1e1e1e);
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 36px);
            color: var(--vscode-editor-foreground, #cccccc);
            flex-direction: column;
            gap: 16px;
        }
        .spinner {
            border: 3px solid var(--vscode-panel-border, #3e3e42);
            border-top: 3px solid var(--vscode-progressBar-background, #4ec9b0);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error-hint {
            font-size: 12px;
            color: var(--vscode-descriptionForeground, #858585);
            max-width: 400px;
            text-align: center;
            line-height: 1.5;
        }
        .error-hint code {
            background: var(--vscode-textCodeBlock-background, #2a2a2a);
            padding: 1px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <div id="connection-status">
        <div class="status-left">
            <div id="status-indicator"></div>
            <span id="status-text">Connecting to CouchCode...</span>
        </div>
        <div class="status-actions">
            <button onclick="loadCouchCode()" title="Reconnect">Reconnect</button>
            <button onclick="openExternal()" title="Open in browser">Browser</button>
        </div>
    </div>
    <div id="content">
        <div class="loading">
            <div class="spinner"></div>
            <p>Connecting to CouchCode server...</p>
        </div>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const serverUrl = '${this._serverUrl}';
            const iframeUrl = '${iframeUrl}';
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            const content = document.getElementById('content');
            let retryCount = 0;
            const maxRetries = 10;

            function updateStatus(status, text) {
                statusIndicator.className = status;
                statusText.textContent = text;
            }

            window.openExternal = function() {
                vscode.postMessage({ type: 'openExternal', url: serverUrl });
            };

            window.loadCouchCode = function() {
                retryCount = 0;
                content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Connecting...</p></div>';
                updateStatus('', 'Reconnecting...');
                attemptConnection();
            };

            function attemptConnection() {
                fetch(serverUrl + '/api/status')
                    .then(response => {
                        if (response.ok) {
                            content.innerHTML = '<iframe id="couchcode-frame" src="' + iframeUrl + '"></iframe>';
                            updateStatus('connected', 'Connected to ' + serverUrl);
                            vscode.postMessage({ type: 'connected' });
                            retryCount = 0;
                        } else {
                            throw new Error('Server returned: ' + response.status);
                        }
                    })
                    .catch(error => {
                        retryCount++;
                        updateStatus('disconnected', 'Cannot connect to ' + serverUrl);

                        if (retryCount <= maxRetries) {
                            const delay = Math.min(retryCount * 2, 10);
                            content.innerHTML = '<div class="loading">' +
                                '<p style="color: var(--vscode-testing-iconFailed, #f48771);">Cannot connect to CouchCode server</p>' +
                                '<div class="error-hint">' +
                                '<p>Make sure CouchCode is running at <code>' + serverUrl + '</code></p>' +
                                '<p>Retrying in ' + delay + 's... (attempt ' + retryCount + '/' + maxRetries + ')</p>' +
                                '</div></div>';
                            setTimeout(attemptConnection, delay * 1000);
                        } else {
                            content.innerHTML = '<div class="loading">' +
                                '<p style="color: var(--vscode-testing-iconFailed, #f48771);">Cannot connect to CouchCode server</p>' +
                                '<div class="error-hint">' +
                                '<p>Server not reachable at <code>' + serverUrl + '</code></p>' +
                                '<p>1. Start the CouchCode desktop app</p>' +
                                '<p>2. Check <code>couchcode.serverUrl</code> in VS Code settings</p>' +
                                '<p>3. Click <strong>Reconnect</strong> above</p>' +
                                '</div></div>';
                            vscode.postMessage({ type: 'error', text: 'Cannot connect after ' + maxRetries + ' attempts' });
                        }
                    });
            }

            // Start loading
            attemptConnection();
        })();
    </script>
</body>
</html>`;
    }
}

module.exports = CouchCodePanel;
