const vscode = require('vscode');

class SessionTreeItem extends vscode.TreeItem {
    constructor(session, collapsibleState) {
        super(session.name, collapsibleState);
        this.session = session;
        this.tooltip = `${session.shellName || 'Unknown'} - ${session.createdAt || 'Unknown time'}`;
        this.description = session.shellIcon ? `${session.shellIcon} ${session.shellName}` : session.shellName;
        this.contextValue = 'session';
        this.iconPath = new vscode.ThemeIcon('terminal');

        // Add commands
        this.command = {
            command: 'couchcode.selectSession',
            title: 'Select Session',
            arguments: [session]
        };
    }
}

class SessionsTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.sessions = [];
        this.serverUrl = null;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    setSessions(sessions) {
        this.sessions = sessions || [];
        this.refresh();
    }

    setServerUrl(url) {
        this.serverUrl = url;
        this.refresh();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (element) {
            return [];
        }

        if (!this.serverUrl) {
            return [this.createInfoItem('Not connected', 'Click "Connect to Server" to start')];
        }

        if (!this.sessions || this.sessions.length === 0) {
            return [this.createInfoItem('No sessions', 'Create a session in CouchCode')];
        }

        return this.sessions.map(session =>
            new SessionTreeItem(session, vscode.TreeItemCollapsibleState.None)
        );
    }

    createInfoItem(label, description) {
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.description = description;
        item.iconPath = new vscode.ThemeIcon('info');
        item.contextValue = 'info';
        return item;
    }
}

module.exports = SessionsTreeProvider;
