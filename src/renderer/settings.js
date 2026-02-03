const { ipcRenderer } = require('electron');

// DOM Elements
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const qrCode = document.getElementById('qr-code');
const urlDisplay = document.getElementById('url-display');
const copyUrlBtn = document.getElementById('copy-url');
const portInput = document.getElementById('port-input');
const pinInput = document.getElementById('pin-input');
const setPinBtn = document.getElementById('set-pin');
const startLoginCheckbox = document.getElementById('start-login');
const startMinimizedCheckbox = document.getElementById('start-minimized');
const sessionsList = document.getElementById('sessions-list');
const toggleServerBtn = document.getElementById('toggle-server');
const quitAppBtn = document.getElementById('quit-app');
const toast = document.getElementById('toast');
const autoUpdateCheckbox = document.getElementById('auto-update');
const checkUpdateBtn = document.getElementById('check-update');
const updateStatus = document.getElementById('update-status');

// State
let isServerRunning = false;

// Initialize
async function init() {
  await loadSettings();
  await updateServerStatus();
  await updateQRCode();
  await loadSessions();

  // Set up event listeners
  setupEventListeners();

  // Poll for updates
  setInterval(async () => {
    await updateServerStatus();
    await loadSessions();
  }, 3000);
}

// Load settings
async function loadSettings() {
  const settings = await ipcRenderer.invoke('get-settings');
  portInput.value = settings.port;
  startLoginCheckbox.checked = settings.startOnLogin;
  startMinimizedCheckbox.checked = settings.startMinimized;

  // Load auto-update setting
  const autoUpdateEnabled = settings.autoUpdateEnabled !== false;
  if (autoUpdateCheckbox) {
    autoUpdateCheckbox.checked = autoUpdateEnabled;
  }

  // Load update status
  await updateUpdateStatus();
}

// Update status display
async function updateUpdateStatus() {
  if (!updateStatus) return;

  const status = await ipcRenderer.invoke('get-update-status');

  if (status.checking) {
    updateStatus.innerHTML = `<span class="status-checking">Checking for updates...</span>`;
  } else if (status.downloaded) {
    updateStatus.innerHTML = `
      <span class="status-ready">Update v${status.version} ready to install</span>
      <button id="install-now" class="btn-primary">Restart & Install</button>
    `;
    document.getElementById('install-now')?.addEventListener('click', async () => {
      await ipcRenderer.invoke('install-update');
    });
  } else if (status.available) {
    updateStatus.innerHTML = `<span class="status-downloading">Downloading v${status.version} (${status.progress}%)</span>`;
  } else {
    updateStatus.innerHTML = `<span class="status-current">Current version: ${status.currentVersion}</span>`;
  }
}

// Update server status
async function updateServerStatus() {
  const status = await ipcRenderer.invoke('get-server-status');
  isServerRunning = status.running;

  if (isServerRunning) {
    statusBadge.className = 'status-badge running';
    statusText.textContent = `Running (${status.clientCount} connected)`;
    toggleServerBtn.textContent = 'Stop Server';
    toggleServerBtn.classList.add('stop');
    urlDisplay.value = status.url;
  } else {
    statusBadge.className = 'status-badge stopped';
    statusText.textContent = 'Stopped';
    toggleServerBtn.textContent = 'Start Server';
    toggleServerBtn.classList.remove('stop');
    urlDisplay.value = 'Server not running';
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
  const sessions = await ipcRenderer.invoke('get-sessions');

  if (sessions.length === 0) {
    sessionsList.innerHTML = '<p class="no-sessions">No active sessions</p>';
    return;
  }

  sessionsList.innerHTML = sessions.map(session => `
    <div class="session-item" data-id="${session.id}">
      <div class="session-info">
        <h3>${escapeHtml(session.name)}</h3>
        <p>${session.shell} - ${formatDate(session.createdAt)}</p>
      </div>
      <div class="session-actions">
        <button onclick="killSession('${session.id}')">Kill</button>
      </div>
    </div>
  `).join('');
}

// Kill session
async function killSession(sessionId) {
  await ipcRenderer.invoke('kill-session', sessionId);
  await loadSessions();
  showToast('Session terminated', 'success');
}

// Make killSession available globally
window.killSession = killSession;

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

  // Auto-update toggle
  if (autoUpdateCheckbox) {
    autoUpdateCheckbox.addEventListener('change', async () => {
      await ipcRenderer.invoke('toggle-auto-update', autoUpdateCheckbox.checked);
      showToast(
        autoUpdateCheckbox.checked ? 'Auto-update enabled' : 'Auto-update disabled',
        'success'
      );
    });
  }

  // Check for updates button
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      checkUpdateBtn.disabled = true;
      checkUpdateBtn.textContent = 'Checking...';

      const result = await ipcRenderer.invoke('check-for-updates');

      checkUpdateBtn.disabled = false;
      checkUpdateBtn.textContent = 'Check for Updates';

      if (result.success) {
        showToast('Checked for updates', 'success');
      } else {
        showToast('Failed to check for updates', 'error');
      }

      await updateUpdateStatus();
    });
  }

  // Quit app
  quitAppBtn.addEventListener('click', () => {
    const { app } = require('@electron/remote') || {};
    if (app) {
      app.quit();
    } else {
      window.close();
    }
  });

  // Listen for server status changes from main process
  ipcRenderer.on('server-status-changed', async (event, running) => {
    isServerRunning = running;
    await updateServerStatus();
    await updateQRCode();
  });

  // Listen for update events from main process
  ipcRenderer.on('update-available', async (event, info) => {
    showToast(`Update v${info.version} is downloading...`, 'info');
    await updateUpdateStatus();
  });

  ipcRenderer.on('update-downloaded', async (event, info) => {
    showToast(`Update v${info.version} ready to install!`, 'success');
    await updateUpdateStatus();
  });

  ipcRenderer.on('update-download-progress', async (event, progress) => {
    await updateUpdateStatus();
  });

  ipcRenderer.on('update-error', async (event, error) => {
    showToast('Update check failed', 'error');
    await updateUpdateStatus();
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

// Format date
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
