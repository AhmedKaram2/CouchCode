const { ipcRenderer } = require('electron');

// Action key mappings - comprehensive terminal control
const actionMap = {
  'yes': 'y\r',
  'no': 'n\r',
  'enter': '\r',
  'space': ' ',
  'tab': '\t',
  'up': '\x1b[A',
  'down': '\x1b[B',
  'left': '\x1b[D',
  'right': '\x1b[C',
  'ctrl-c': '\x03',
  'ctrl-d': '\x04',
  'ctrl-z': '\x1a',
  'ctrl-l': '\x0c',
  'ctrl-r': '\x12',        // Reverse search history
  'ctrl-w': '\x17',        // Delete word backward
  'ctrl-u': '\x15',        // Delete line (to start)
  'ctrl-k': '\x0b',        // Delete to end of line
  'ctrl-a': '\x01',        // Go to start of line
  'ctrl-e': '\x05',        // Go to end of line
  'esc': '\x1b',
  'escape': '\x1b',
  'backspace': '\x7f',
  'delete': '\x1b[3~',
  'delete-word': '\x17',   // Ctrl+W - delete word
  'delete-line': '\x15',   // Ctrl+U - delete line
  'home': '\x1b[H',
  'end': '\x1b[F',
  'pageup': '\x1b[5~',
  'pagedown': '\x1b[6~',
  'clear': 'clear\r',
  'exit': 'exit\r'
};

// State
let isServerRunning = false;
let terminal = null;
let fitAddon = null;
let currentSessionId = null;
let sessions = [];
let autoEnter = true; // Default ON

// DOM Elements
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const qrCode = document.getElementById('qr-code');
const urlDisplay = document.getElementById('url-display');
const copyUrlBtn = document.getElementById('copy-url');
const sessionsList = document.getElementById('sessions-list');
const newSessionBtn = document.getElementById('new-session-btn');
const toggleServerBtn = document.getElementById('toggle-server');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const portInput = document.getElementById('port-input');
const pinInput = document.getElementById('pin-input');
const setPinBtn = document.getElementById('set-pin');
const startLoginCheckbox = document.getElementById('start-login');
const startMinimizedCheckbox = document.getElementById('start-minimized');
const shellSelect = document.getElementById('shell-select');
const toast = document.getElementById('toast');

// Available shells
let availableShells = [];

// Terminal elements
const terminalContainer = document.getElementById('terminal');
const terminalContainerDiv = document.getElementById('terminal-container');
const noSessionMsg = document.getElementById('no-session-msg');
const sessionTitle = document.getElementById('session-title');
const connectedClients = document.getElementById('connected-clients');
const createSessionBtn = document.getElementById('create-session-btn');
const commandInput = document.getElementById('command-input');
const sendBtn = document.getElementById('send-btn');
const autoEnterBtn = document.getElementById('auto-enter-btn');
const quickActions = document.querySelector('.quick-actions');

// Initialize
async function init() {
  await loadSettings();
  await updateServerStatus();
  await updateQRCode();
  await loadSessions();
  initTerminal();
  setupEventListeners();

  // Poll for updates
  setInterval(async () => {
    await updateServerStatus();
    await loadSessions();
  }, 3000);
}

// Initialize terminal
function initTerminal() {
  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: 15,
    fontFamily: 'Menlo, Monaco, "Cascadia Code", "Fira Code", "Courier New", monospace',
    fontWeight: '400',
    fontWeightBold: '600',
    lineHeight: 1.2,
    letterSpacing: 0,
    scrollback: 10000,
    smoothScrollDuration: 100,
    fastScrollModifier: 'alt',
    fastScrollSensitivity: 5,
    scrollSensitivity: 3,
    theme: {
      background: '#0d1117',
      foreground: '#f0f6fc',
      cursor: '#58a6ff',
      cursorAccent: '#0d1117',
      selection: 'rgba(56, 139, 253, 0.3)',
      black: '#484f58',
      red: '#ff7b72',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#b1bac4',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc'
    }
  });

  fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon.WebLinksAddon());

  terminal.open(terminalContainer);

  // Handle terminal input
  terminal.onData((data) => {
    if (currentSessionId) {
      ipcRenderer.invoke('terminal-input', currentSessionId, data);
    }
  });

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    if (fitAddon && terminal && currentSessionId) {
      fitAddon.fit();
      const dims = { cols: terminal.cols, rows: terminal.rows };
      ipcRenderer.invoke('terminal-resize', currentSessionId, dims.cols, dims.rows);
    }
  });
  resizeObserver.observe(terminalContainerDiv);

  // Listen for terminal output from main process
  ipcRenderer.on('terminal-output', (event, sessionId, data) => {
    if (sessionId === currentSessionId && terminal) {
      terminal.write(data);
    }
  });

  // Listen for session ended
  ipcRenderer.on('session-ended', (event, sessionId) => {
    if (sessionId === currentSessionId) {
      currentSessionId = null;
      showNoSession();
    }
    loadSessions();
  });
}

// Load available shells
async function loadShells() {
  availableShells = await ipcRenderer.invoke('get-available-shells');
  if (shellSelect && availableShells.length > 0) {
    shellSelect.innerHTML = availableShells.map(shell =>
      `<option value="${shell.path}">${shell.icon} ${shell.name} ${shell.features ? '(' + shell.features.join(', ') + ')' : ''}</option>`
    ).join('');

    // Set current preferred shell
    const settings = await ipcRenderer.invoke('get-settings');
    if (settings.preferredShell) {
      shellSelect.value = settings.preferredShell;
    }
  }
}

// Load settings
async function loadSettings() {
  const settings = await ipcRenderer.invoke('get-settings');
  portInput.value = settings.port;
  startLoginCheckbox.checked = settings.startOnLogin;
  startMinimizedCheckbox.checked = settings.startMinimized;

  // Load shells
  await loadShells();
}

// Update server status
async function updateServerStatus() {
  const status = await ipcRenderer.invoke('get-server-status');
  isServerRunning = status.running;

  if (isServerRunning) {
    statusBadge.className = 'status-badge running';
    statusText.textContent = 'Running';
    toggleServerBtn.textContent = 'Stop Server';
    toggleServerBtn.classList.add('stop');
    urlDisplay.value = status.url;
    connectedClients.textContent = `${status.clientCount} client${status.clientCount !== 1 ? 's' : ''}`;
  } else {
    statusBadge.className = 'status-badge stopped';
    statusText.textContent = 'Stopped';
    toggleServerBtn.textContent = 'Start Server';
    toggleServerBtn.classList.remove('stop');
    urlDisplay.value = 'Server not running';
    connectedClients.textContent = '0 clients';
  }
}

// Update QR code
async function updateQRCode() {
  if (!isServerRunning) {
    qrCode.src = '';
    qrCode.alt = 'Start server to generate QR code';
    return;
  }

  const result = await ipcRenderer.invoke('get-qr-code');
  if (result.qrCode) {
    qrCode.src = result.qrCode;
    qrCode.alt = 'Scan to connect';
    urlDisplay.value = result.url;
  }
}

// Load sessions
async function loadSessions() {
  sessions = await ipcRenderer.invoke('get-sessions');

  if (sessions.length === 0) {
    sessionsList.innerHTML = '<p class="no-sessions">No active sessions</p>';
    if (currentSessionId) {
      currentSessionId = null;
      showNoSession();
    }
    return;
  }

  sessionsList.innerHTML = sessions.map(session => `
    <div class="session-item ${session.id === currentSessionId ? 'active' : ''}" data-id="${session.id}">
      <div class="session-info">
        <span class="session-name">${escapeHtml(session.name)}</span>
        <span class="session-shell">${session.shell}</span>
      </div>
      <button class="session-kill" data-kill="${session.id}" title="Kill session">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Auto-attach to first session if none selected
  if (!currentSessionId && sessions.length > 0) {
    attachToSession(sessions[0].id);
  }
}

// Create session
async function createSession() {
  const session = await ipcRenderer.invoke('create-session', {
    name: `Session ${sessions.length + 1}`
  });
  if (session) {
    await loadSessions();
    attachToSession(session.id);
    showToast('Session created', 'success');
  }
}

// Attach to session
function attachToSession(sessionId) {
  if (currentSessionId === sessionId) return;

  currentSessionId = sessionId;
  const session = sessions.find(s => s.id === sessionId);

  if (session) {
    sessionTitle.textContent = session.name;
    showTerminal();

    // Clear terminal and request history
    if (terminal) {
      terminal.clear();
      setTimeout(() => {
        fitAddon.fit();
        terminal.focus();
      }, 100);
    }

    // Update session list to show active
    loadSessions();
  }
}

// Kill session
async function killSession(sessionId) {
  await ipcRenderer.invoke('kill-session', sessionId);
  await loadSessions();
  showToast('Session terminated', 'success');
}

// Show terminal
function showTerminal() {
  terminalContainer.style.display = 'block';
  noSessionMsg.style.display = 'none';
  if (fitAddon) {
    setTimeout(() => fitAddon.fit(), 50);
  }
}

// Show no session message
function showNoSession() {
  terminalContainer.style.display = 'none';
  noSessionMsg.style.display = 'flex';
  sessionTitle.textContent = 'No Session';
}

// Handle action button
function handleAction(action) {
  const sequence = actionMap[action];
  if (sequence && currentSessionId) {
    ipcRenderer.invoke('terminal-input', currentSessionId, sequence);
  }
}

// Send command
function sendCommand() {
  const command = commandInput.value;
  if (command && currentSessionId) {
    // Send with or without Enter based on autoEnter setting
    ipcRenderer.invoke('terminal-input', currentSessionId, autoEnter ? command + '\r' : command);
    commandInput.value = '';
  }
}

// Toggle auto-enter
function toggleAutoEnter() {
  autoEnter = !autoEnter;
  updateAutoEnterButton();
}

// Update auto-enter button state
function updateAutoEnterButton() {
  if (autoEnterBtn) {
    if (autoEnter) {
      autoEnterBtn.classList.add('active');
      autoEnterBtn.title = 'Auto-enter ON (click to send without Enter)';
    } else {
      autoEnterBtn.classList.remove('active');
      autoEnterBtn.title = 'Auto-enter OFF (click to send with Enter)';
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Toggle server
  toggleServerBtn.addEventListener('click', async () => {
    toggleServerBtn.disabled = true;

    if (isServerRunning) {
      const result = await ipcRenderer.invoke('stop-server');
      if (result.success) {
        showToast('Server stopped', 'success');
      } else {
        showToast('Failed to stop server', 'error');
      }
    } else {
      const result = await ipcRenderer.invoke('start-server');
      if (result.success) {
        showToast('Server started', 'success');
        await updateQRCode();
      } else {
        showToast(`Failed to start server: ${result.error}`, 'error');
      }
    }

    await updateServerStatus();
    toggleServerBtn.disabled = false;
  });

  // Copy URL
  copyUrlBtn.addEventListener('click', async () => {
    const url = urlDisplay.value;
    if (url && url !== 'Server not running') {
      await navigator.clipboard.writeText(url);
      showToast('URL copied to clipboard', 'success');
    }
  });

  // New session
  newSessionBtn.addEventListener('click', createSession);
  createSessionBtn.addEventListener('click', createSession);

  // Sessions list click handler
  sessionsList.addEventListener('click', (e) => {
    const killBtn = e.target.closest('[data-kill]');
    if (killBtn) {
      killSession(killBtn.dataset.kill);
      return;
    }

    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
      attachToSession(sessionItem.dataset.id);
    }
  });

  // Quick actions
  quickActions.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-btn');
    if (btn) {
      handleAction(btn.dataset.action);
    }
  });

  // Command input
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand();
    }
  });
  sendBtn.addEventListener('click', sendCommand);

  // Auto-enter toggle
  if (autoEnterBtn) {
    autoEnterBtn.addEventListener('click', toggleAutoEnter);
  }

  // Settings modal
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });

  // Port change
  portInput.addEventListener('change', async () => {
    const port = parseInt(portInput.value, 10);
    if (port >= 1024 && port <= 65535) {
      await ipcRenderer.invoke('update-settings', { port });
      showToast('Port updated (restart server to apply)', 'success');
    } else {
      showToast('Invalid port number', 'error');
      const settings = await ipcRenderer.invoke('get-settings');
      portInput.value = settings.port;
    }
  });

  // Set PIN
  setPinBtn.addEventListener('click', async () => {
    const pin = pinInput.value;
    if (pin.length < 4) {
      showToast('PIN must be at least 4 characters', 'error');
      return;
    }

    const result = await ipcRenderer.invoke('set-pin', pin);
    if (result.success) {
      showToast('PIN updated', 'success');
      pinInput.value = '';
    } else {
      showToast('Failed to set PIN', 'error');
    }
  });

  // Start on login
  startLoginCheckbox.addEventListener('change', async () => {
    await ipcRenderer.invoke('update-settings', {
      startOnLogin: startLoginCheckbox.checked
    });
  });

  // Start minimized
  startMinimizedCheckbox.addEventListener('change', async () => {
    await ipcRenderer.invoke('update-settings', {
      startMinimized: startMinimizedCheckbox.checked
    });
  });

  // Shell selection
  if (shellSelect) {
    shellSelect.addEventListener('change', async () => {
      const shellPath = shellSelect.value;
      const result = await ipcRenderer.invoke('set-preferred-shell', shellPath);
      if (result) {
        const shell = availableShells.find(s => s.path === shellPath);
        showToast(`Default shell set to ${shell?.name || 'Unknown'}`, 'success');
      }
    });
  }

  // Listen for server status changes from main process
  ipcRenderer.on('server-status-changed', async (event, running) => {
    isServerRunning = running;
    await updateServerStatus();
    await updateQRCode();
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
