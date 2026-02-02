const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { EventEmitter } = require('events');
const { execSync } = require('child_process');

class PTYManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.availableShells = this.detectAvailableShells();
    this.preferredShell = null;
  }

  // Detect available shells on the system
  detectAvailableShells() {
    const shells = [];

    if (os.platform() === 'win32') {
      // Windows shells
      const windowsShells = [
        {
          name: 'PowerShell 7',
          path: 'pwsh.exe',
          icon: '💠',
          features: ['modern', 'cross-platform', 'tab-completion'],
          checkPaths: ['C:\\Program Files\\PowerShell\\7\\pwsh.exe', 'pwsh.exe']
        },
        {
          name: 'PowerShell',
          path: 'powershell.exe',
          icon: '🔷',
          features: ['scripting', 'tab-completion'],
          checkPaths: ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', 'powershell.exe']
        },
        {
          name: 'CMD',
          path: 'cmd.exe',
          icon: '📦',
          features: ['classic', 'batch-scripts'],
          checkPaths: ['C:\\Windows\\System32\\cmd.exe', 'cmd.exe']
        },
        {
          name: 'Git Bash',
          path: 'bash.exe',
          icon: '🐱',
          features: ['unix-like', 'git-integration'],
          checkPaths: ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe']
        },
        {
          name: 'WSL',
          path: 'wsl.exe',
          icon: '🐧',
          features: ['linux', 'full-unix'],
          checkPaths: ['C:\\Windows\\System32\\wsl.exe', 'wsl.exe']
        }
      ];

      for (const shell of windowsShells) {
        let foundPath = null;
        for (const checkPath of shell.checkPaths) {
          if (fs.existsSync(checkPath)) {
            foundPath = checkPath;
            break;
          }
          // Try which equivalent on Windows
          try {
            const result = execSync(`where ${checkPath} 2>nul`, { encoding: 'utf8' }).trim().split('\n')[0];
            if (result) {
              foundPath = result;
              break;
            }
          } catch (e) {
            // Not found
          }
        }
        if (foundPath) {
          shells.push({
            name: shell.name,
            path: foundPath,
            icon: shell.icon,
            features: shell.features
          });
        }
      }

      console.log('Available Windows shells:', shells.map(s => `${s.name} (${s.path})`).join(', '));
      return shells;
    }

    // Unix-like systems (macOS and Linux)
    const isMac = os.platform() === 'darwin';
    const possibleShells = [
      // Fish shell (various install locations)
      { name: 'Fish', path: '/opt/homebrew/bin/fish', icon: '🐟', features: ['autosuggestions', 'syntax-highlighting', 'smart-completion'] },
      { name: 'Fish', path: '/usr/local/bin/fish', icon: '🐟', features: ['autosuggestions', 'syntax-highlighting', 'smart-completion'] },
      { name: 'Fish', path: '/usr/bin/fish', icon: '🐟', features: ['autosuggestions', 'syntax-highlighting', 'smart-completion'] },
      // Zsh (default on macOS)
      { name: 'Zsh', path: '/bin/zsh', icon: '⚡', features: ['plugins', 'themes', 'completion'] },
      { name: 'Zsh', path: '/usr/bin/zsh', icon: '⚡', features: ['plugins', 'themes', 'completion'] },
      { name: 'Zsh', path: '/usr/local/bin/zsh', icon: '⚡', features: ['plugins', 'themes', 'completion'] },
      // Bash
      { name: 'Bash', path: '/bin/bash', icon: '💻', features: ['universal', 'scripting'] },
      { name: 'Bash', path: '/usr/bin/bash', icon: '💻', features: ['universal', 'scripting'] },
      { name: 'Bash', path: '/usr/local/bin/bash', icon: '💻', features: ['universal', 'scripting'] },
      // Linux-specific shells
      { name: 'Dash', path: '/bin/dash', icon: '🏃', features: ['fast', 'posix'] },
      { name: 'Ash', path: '/bin/ash', icon: '🪶', features: ['lightweight', 'busybox'] },
      { name: 'Sh', path: '/bin/sh', icon: '📜', features: ['posix', 'universal'] }
    ];

    const added = new Set();
    for (const shell of possibleShells) {
      if (!added.has(shell.name) && fs.existsSync(shell.path)) {
        shells.push(shell);
        added.add(shell.name);
      }
    }

    // Also check which command for fish
    if (!added.has('Fish')) {
      try {
        const fishPath = execSync('which fish 2>/dev/null').toString().trim();
        if (fishPath) {
          shells.unshift({ name: 'Fish', path: fishPath, icon: '🐟', features: ['autosuggestions', 'syntax-highlighting', 'smart-completion'] });
        }
      } catch (e) {
        // Fish not found
      }
    }

    console.log('Available shells:', shells.map(s => `${s.name} (${s.path})`).join(', '));
    return shells;
  }

  // Get available shells
  getAvailableShells() {
    return this.availableShells.map(s => ({
      name: s.name,
      path: s.path,
      icon: s.icon,
      features: s.features || []
    }));
  }

  // Set preferred shell
  setPreferredShell(shellPath) {
    const shell = this.availableShells.find(s => s.path === shellPath);
    if (shell) {
      this.preferredShell = shellPath;
      return true;
    }
    return false;
  }

  // Get default shell based on OS
  getDefaultShell() {
    if (this.preferredShell) {
      return this.preferredShell;
    }

    // Prefer fish if available
    const fish = this.availableShells.find(s => s.name === 'Fish');
    if (fish) {
      return fish.path;
    }

    if (os.platform() === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  // Create a new terminal session
  createSession(options = {}) {
    const sessionId = uuidv4();
    const shell = options.shell || this.getDefaultShell();
    const name = options.name || `Session ${this.sessions.size + 1}`;
    const cwd = options.cwd || os.homedir();

    const cols = options.cols || 80;
    const rows = options.rows || 24;

    // Support for running a specific command
    const args = options.command ? ['-c', options.command] : [];

    console.log(`Creating PTY session: shell=${shell}, cwd=${cwd}, cols=${cols}, rows=${rows}`);

    // Get shell info for features
    const shellInfo = this.availableShells.find(s => s.path === shell) || { name: 'Unknown', icon: '💻' };

    // Enhanced environment for fish and other shells
    const shellEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8'
    };

    // Fish-specific enhancements
    if (shellInfo.name === 'Fish') {
      shellEnv.fish_greeting = ''; // Disable greeting for cleaner start
    }

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: shellEnv
      });
    } catch (err) {
      console.error('Failed to spawn PTY:', err);
      throw err;
    }

    const session = {
      id: sessionId,
      name,
      shell,
      shellName: shellInfo.name,
      shellIcon: shellInfo.icon,
      cwd,
      pty: ptyProcess,
      createdAt: new Date().toISOString(),
      cols,
      rows,
      outputHistory: '',      // Store terminal output history
      maxHistorySize: 50000   // Max 50KB of history
    };

    // Handle output from PTY
    ptyProcess.onData((data) => {
      // Store output in history
      session.outputHistory += data;
      // Trim if too large
      if (session.outputHistory.length > session.maxHistorySize) {
        session.outputHistory = session.outputHistory.slice(-session.maxHistorySize);
      }
      this.emit('output', sessionId, data);
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Session ${sessionId} exited with code ${exitCode}, signal ${signal}`);
      this.emit('exit', sessionId, exitCode, signal);
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    this.emit('created', sessionId, session);

    console.log(`Session created: ${sessionId} (${shellInfo.name})`);

    return {
      id: sessionId,
      name,
      shell,
      shellName: shellInfo.name,
      shellIcon: shellInfo.icon,
      createdAt: session.createdAt
    };
  }

  // Get all sessions (without PTY process details)
  getSessions() {
    const sessions = [];
    for (const [id, session] of this.sessions) {
      sessions.push({
        id,
        name: session.name,
        shell: session.shell,
        shellName: session.shellName,
        shellIcon: session.shellIcon,
        createdAt: session.createdAt
      });
    }
    return sessions;
  }

  // Get a specific session
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Get session output history
  getSessionHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      return session.outputHistory || '';
    }
    return '';
  }

  // Write input to a session
  write(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
      return true;
    }
    return false;
  }

  // Resize a session
  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      return true;
    }
    return false;
  }

  // Kill a session
  killSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(sessionId);
      this.emit('killed', sessionId);
      return true;
    }
    return false;
  }

  // Kill all sessions
  killAll() {
    for (const [sessionId, session] of this.sessions) {
      session.pty.kill();
      this.emit('killed', sessionId);
    }
    this.sessions.clear();
  }

  // Rename a session
  renameSession(sessionId, newName) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.name = newName;
      return true;
    }
    return false;
  }
}

// Export singleton instance
module.exports = new PTYManager();
