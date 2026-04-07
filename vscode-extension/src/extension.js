const vscode = require('vscode');
const CouchCodePanel = require('./couchCodePanel');
const SessionsTreeProvider = require('./sessionsTreeProvider');
const CouchCodeTerminal = require('./couchCodeTerminal');

let currentPanel = undefined;
let sessionsTreeProvider = null;
let statusBarItem = null;
let connectionStatus = 'disconnected'; // disconnected, connecting, connected

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('CouchCode extension is now active!');

    // Initialize sessions tree provider
    sessionsTreeProvider = new SessionsTreeProvider();
    vscode.window.registerTreeDataProvider('couchcode-sessions', sessionsTreeProvider);

    // Create status bar item
    const config = vscode.workspace.getConfiguration('couchcode');
    if (config.get('showInStatusBar') !== false) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'couchcode.openPanel';
        updateStatusBar('disconnected');
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
    }

    // Register command to open CouchCode panel
    let openPanelCommand = vscode.commands.registerCommand('couchcode.openPanel', () => {
        const config = vscode.workspace.getConfiguration('couchcode');
        const serverUrl = config.get('serverUrl') || 'http://localhost:3847';

        if (currentPanel) {
            currentPanel.reveal();
        } else {
            currentPanel = CouchCodePanel.createOrShow(context.extensionUri, serverUrl, getAuthParams());

            // Reset when panel is closed
            currentPanel.onDidDispose(() => {
                currentPanel = undefined;
            });
        }
    });

    // Register command to connect to server
    let connectCommand = vscode.commands.registerCommand('couchcode.connect', async () => {
        const config = vscode.workspace.getConfiguration('couchcode');
        let serverUrl = config.get('serverUrl');

        // Prompt for server URL if not configured
        if (!serverUrl || serverUrl === 'http://localhost:3847') {
            serverUrl = await vscode.window.showInputBox({
                prompt: 'Enter CouchCode server URL',
                placeHolder: 'http://192.168.1.100:3847',
                value: serverUrl
            });

            if (!serverUrl) {
                return; // User cancelled
            }

            // Save the server URL
            await config.update('serverUrl', serverUrl, vscode.ConfigurationTarget.Global);
        }

        // Open the panel
        vscode.commands.executeCommand('couchcode.openPanel');
        updateStatusBar('connecting');
    });

    // Register command to disconnect
    let disconnectCommand = vscode.commands.registerCommand('couchcode.disconnect', () => {
        if (currentPanel) {
            currentPanel.dispose();
            currentPanel = undefined;
            updateStatusBar('disconnected');
            vscode.window.showInformationMessage('Disconnected from CouchCode server');
        }
    });

    // Register command to show QR code
    let showQRCommand = vscode.commands.registerCommand('couchcode.showQR', async () => {
        const config = vscode.workspace.getConfiguration('couchcode');
        const serverUrl = config.get('serverUrl') || 'http://localhost:3847';

        vscode.window.showInformationMessage(
            `CouchCode Server URL: ${serverUrl}`,
            'Copy URL'
        ).then(selection => {
            if (selection === 'Copy URL') {
                vscode.env.clipboard.writeText(serverUrl);
                vscode.window.showInformationMessage('Server URL copied to clipboard!');
            }
        });
    });

    // Register command to create new terminal
    let createTerminalCommand = vscode.commands.registerCommand('couchcode.createTerminal', async () => {
        vscode.window.showInformationMessage(
            'Create a new terminal session in the CouchCode panel or mobile app',
            'Open Panel'
        ).then(selection => {
            if (selection === 'Open Panel') {
                vscode.commands.executeCommand('couchcode.openPanel');
            }
        });
    });

    // Register command to open native remote terminal
    let openNativeTerminalCommand = vscode.commands.registerCommand('couchcode.openNativeTerminal', async () => {
        const config = vscode.workspace.getConfiguration('couchcode');
        const serverUrl = config.get('serverUrl') || 'http://localhost:3847';

        try {
            const authParams = getAuthParams();
            const terminal = CouchCodeTerminal.create(serverUrl, authParams);
            terminal.show();
            updateStatusBar('connected');
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to open CouchCode terminal: ${e.message}`);
        }
    });

    // Register command to refresh sessions
    let refreshSessionsCommand = vscode.commands.registerCommand('couchcode.refreshSessions', () => {
        if (sessionsTreeProvider) {
            sessionsTreeProvider.refresh();
            vscode.window.showInformationMessage('Refreshed terminal sessions');
        }
    });

    // Register command to select a session
    let selectSessionCommand = vscode.commands.registerCommand('couchcode.selectSession', (session) => {
        vscode.window.showInformationMessage(`Selected: ${session.name}`);
        vscode.commands.executeCommand('couchcode.openPanel');
    });

    // Register command to open in browser
    let openInBrowserCommand = vscode.commands.registerCommand('couchcode.openInBrowser', () => {
        const config = vscode.workspace.getConfiguration('couchcode');
        const serverUrl = config.get('serverUrl') || 'http://localhost:3847';
        vscode.env.openExternal(vscode.Uri.parse(serverUrl));
    });

    context.subscriptions.push(
        openPanelCommand,
        connectCommand,
        disconnectCommand,
        showQRCommand,
        createTerminalCommand,
        openNativeTerminalCommand,
        refreshSessionsCommand,
        selectSessionCommand,
        openInBrowserCommand
    );

    // Auto-connect if configured
    if (config.get('autoConnect')) {
        // Delay auto-connect to let VS Code settle
        setTimeout(() => {
            const serverUrl = config.get('serverUrl');
            if (serverUrl) {
                sessionsTreeProvider.setServerUrl(serverUrl);
                updateStatusBar('connecting');
                // Verify server is accessible
                checkServerStatus(serverUrl).then(ok => {
                    updateStatusBar(ok ? 'connected' : 'disconnected');
                });
            }
        }, 2000);
    }

    // Update sessions tree provider with server URL
    if (sessionsTreeProvider) {
        const serverUrl = config.get('serverUrl');
        if (serverUrl) {
            sessionsTreeProvider.setServerUrl(serverUrl);
        }
    }

    // Watch for config changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('couchcode')) {
                const config = vscode.workspace.getConfiguration('couchcode');
                if (sessionsTreeProvider) {
                    sessionsTreeProvider.setServerUrl(config.get('serverUrl'));
                }
            }
        })
    );
}

/**
 * Get authentication parameters from configuration
 */
function getAuthParams() {
    const config = vscode.workspace.getConfiguration('couchcode');
    return {
        apiToken: config.get('apiToken') || '',
        pin: config.get('pin') || '',
        autoApprove: config.get('autoApprove') !== false
    };
}

/**
 * Check if server is accessible
 */
async function checkServerStatus(serverUrl) {
    try {
        const http = require('http');
        return new Promise((resolve) => {
            const req = http.get(`${serverUrl}/api/status`, { timeout: 3000 }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
        });
    } catch {
        return false;
    }
}

/**
 * Update status bar appearance
 */
function updateStatusBar(status) {
    if (!statusBarItem) return;
    connectionStatus = status;

    switch (status) {
        case 'connected':
            statusBarItem.text = '$(terminal) CouchCode';
            statusBarItem.tooltip = 'CouchCode: Connected - Click to open terminal';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'connecting':
            statusBarItem.text = '$(sync~spin) CouchCode';
            statusBarItem.tooltip = 'CouchCode: Connecting...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'disconnected':
        default:
            statusBarItem.text = '$(terminal) CouchCode';
            statusBarItem.tooltip = 'CouchCode: Disconnected - Click to connect';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
    }
}

function deactivate() {
    if (currentPanel) {
        currentPanel.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};
