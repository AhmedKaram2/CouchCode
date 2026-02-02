const vscode = require('vscode');

/**
 * Manages the CouchCode WebView panel
 */
class CouchCodePanel {
    static currentPanel = undefined;
    static viewType = 'couchCodePanel';

    constructor(panel, extensionUri, serverUrl) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._serverUrl = serverUrl;
        this._disposables = [];

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
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

    static createOrShow(extensionUri, serverUrl) {
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
                // Enable javascript in the webview
                enableScripts: true,

                // Restrict the webview to only loading content from our extension's directory
                localResourceRoots: [extensionUri],

                // Keep webview state when hidden
                retainContextWhenHidden: true
            }
        );

        CouchCodePanel.currentPanel = new CouchCodePanel(panel, extensionUri, serverUrl);
        return CouchCodePanel.currentPanel;
    }

    dispose() {
        CouchCodePanel.currentPanel = undefined;

        // Clean up our resources
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
            background-color: #1e1e1e;
        }
        #connection-status {
            padding: 10px;
            background-color: #252526;
            color: #cccccc;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        #status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #ffa500;
        }
        #status-indicator.connected {
            background-color: #4ec9b0;
        }
        #status-indicator.disconnected {
            background-color: #f48771;
        }
        #couchcode-frame {
            width: 100%;
            height: calc(100vh - 40px);
            border: none;
            background-color: #1e1e1e;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 40px);
            color: #cccccc;
            flex-direction: column;
            gap: 20px;
        }
        .spinner {
            border: 4px solid #3e3e42;
            border-top: 4px solid #4ec9b0;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="connection-status">
        <div id="status-indicator"></div>
        <span id="status-text">Connecting to CouchCode server...</span>
    </div>
    <div id="content">
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading CouchCode...</p>
        </div>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            const serverUrl = '${this._serverUrl}';
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            const content = document.getElementById('content');

            function updateStatus(status, text) {
                statusIndicator.className = status;
                statusText.textContent = text;
            }

            function loadCouchCode() {
                // Test if server is accessible
                fetch(serverUrl)
                    .then(response => {
                        if (response.ok || response.status === 401) {
                            // Server is running, load it in iframe
                            content.innerHTML = '<iframe id="couchcode-frame" src="' + serverUrl + '"></iframe>';
                            updateStatus('connected', 'Connected to ' + serverUrl);
                            vscode.postMessage({ type: 'connected' });
                        } else {
                            throw new Error('Server returned: ' + response.status);
                        }
                    })
                    .catch(error => {
                        updateStatus('disconnected', 'Cannot connect to ' + serverUrl);
                        content.innerHTML = '<div class="loading"><p style="color: #f48771;">⚠️ Cannot connect to CouchCode server</p><p>Make sure CouchCode is running at: ' + serverUrl + '</p><p style="font-size: 12px; color: #858585;">Error: ' + error.message + '</p></div>';
                        vscode.postMessage({
                            type: 'error',
                            text: 'Cannot connect to CouchCode server at ' + serverUrl
                        });

                        // Retry after 5 seconds
                        setTimeout(loadCouchCode, 5000);
                    });
            }

            // Start loading
            loadCouchCode();
        })();
    </script>
</body>
</html>`;
    }
}

module.exports = CouchCodePanel;
