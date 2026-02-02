const vscode = require('vscode');
const CouchCodePanel = require('./couchCodePanel');
const SessionsTreeProvider = require('./sessionsTreeProvider');

let currentPanel = undefined;
let sessionsTreeProvider = null;
let statusBarItem = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('CouchCode extension is now active!');

    // Initialize sessions tree provider
    sessionsTreeProvider = new SessionsTreeProvider();
    vscode.window.registerTreeDataProvider('couchcode-sessions', sessionsTreeProvider);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'couchcode.openPanel';
    statusBarItem.text = '$(terminal) CouchCode';
    statusBarItem.tooltip = 'Open CouchCode Remote Terminal';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register command to open CouchCode panel
    let openPanelCommand = vscode.commands.registerCommand('couchcode.openPanel', () => {
        const config = vscode.workspace.getConfiguration('couchcode');
        const serverUrl = config.get('serverUrl') || 'http://localhost:3847';

        if (currentPanel) {
            currentPanel.reveal();
        } else {
            currentPanel = CouchCodePanel.createOrShow(context.extensionUri, serverUrl);

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
    });

    // Register command to disconnect
    let disconnectCommand = vscode.commands.registerCommand('couchcode.disconnect', () => {
        if (currentPanel) {
            currentPanel.dispose();
            currentPanel = undefined;
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
        const config = vscode.workspace.getConfiguration('couchcode');
        const serverUrl = config.get('serverUrl') || 'http://localhost:3847';

        vscode.window.showInformationMessage(
            'Create a new terminal session in the CouchCode panel or mobile app',
            'Open Panel'
        ).then(selection => {
            if (selection === 'Open Panel') {
                vscode.commands.executeCommand('couchcode.openPanel');
            }
        });
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
        refreshSessionsCommand,
        selectSessionCommand,
        openInBrowserCommand
    );

    // Auto-connect if configured
    const config = vscode.workspace.getConfiguration('couchcode');
    if (config.get('autoConnect')) {
        vscode.commands.executeCommand('couchcode.openPanel');
    }

    // Update sessions tree provider with server URL
    if (sessionsTreeProvider) {
        const serverUrl = config.get('serverUrl');
        if (serverUrl) {
            sessionsTreeProvider.setServerUrl(serverUrl);
        }
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
