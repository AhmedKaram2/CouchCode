const { app, BrowserWindow, ipcMain, shell, powerSaveBlocker } = require('electron');
const path = require('path');
const os = require('os');
const server = require('./server');
const config = require('./config');
const TrayManager = require('./tray');
const ptyManager = require('./pty-manager');
const updater = require('./updater');

// Platform detection
const platform = os.platform(); // 'win32', 'darwin', 'linux'
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

// Disable GPU acceleration to prevent rendering issues (helps on some systems)
// Can be conditionally enabled based on platform if needed
if (isWindows || isLinux) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

// Linux-specific: Set app name for proper desktop integration
if (isLinux) {
  app.setName('CouchCode');
}

let mainWindow = null;
let trayManager = null;
let powerSaveBlockerId = null; // For keeping device awake

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Create the main window
function createWindow() {
  // Platform-specific window options
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    show: !config.get('startMinimized'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  };

  // macOS-specific: Use native title bar style
  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 15, y: 15 };
  } else {
    windowOptions.frame = true;
    windowOptions.titleBarStyle = 'default';
  }

  // Windows-specific: Set app user model ID for proper taskbar grouping
  if (isWindows) {
    app.setAppUserModelId('com.terminalremote.app');
  }

  // Linux-specific: Set window icon
  if (isLinux) {
    const iconPath = path.join(__dirname, '../../build/icon.png');
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  const indexPath = path.join(__dirname, '../renderer/index.html');
  console.log('Loading:', indexPath);

  mainWindow.loadFile(indexPath).catch(err => {
    console.error('Failed to load index.html:', err);
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Hide instead of close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Start power save blocker to keep device active
function startPowerSaveBlocker() {
  if (powerSaveBlockerId === null) {
    // 'prevent-display-sleep' prevents the display from sleeping
    // 'prevent-app-suspension' prevents the app from being suspended
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    console.log('Power save blocker started, ID:', powerSaveBlockerId);
    return true;
  }
  return false;
}

// Stop power save blocker
function stopPowerSaveBlocker() {
  if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    console.log('Power save blocker stopped');
    powerSaveBlockerId = null;
    return true;
  }
  return false;
}

// App ready
app.whenReady().then(async () => {
  createWindow();

  // Create tray
  trayManager = new TrayManager(mainWindow);
  trayManager.create();

  // Start power save blocker to keep screen active
  const keepAwake = config.get('keepScreenAwake') !== false; // Default to true
  if (keepAwake) {
    startPowerSaveBlocker();
  }

  // Auto-start server
  try {
    await server.start();
    trayManager.updateMenu();
    if (mainWindow) {
      mainWindow.webContents.send('server-status-changed', true);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
  }

  // Update tray periodically
  setInterval(() => {
    if (trayManager) {
      trayManager.updateMenu();
    }
  }, 5000);

  // Initialize updater
  updater.setMainWindow(mainWindow);
  updater.setTrayManager(trayManager);

  // Check for updates on startup (if enabled)
  if (config.get('autoUpdateEnabled') !== false) {
    setTimeout(() => {
      updater.checkForUpdates(true); // silent check
    }, 3000);
  }
});

// Handle window activation on macOS
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, apps typically stay running in the menu bar
  // On Windows and Linux, quit when all windows are closed
  if (!isMac) {
    app.quit();
  }
});

// Before quit
app.on('before-quit', async () => {
  app.isQuitting = true;
  stopPowerSaveBlocker(); // Stop power save blocker
  await server.stop();
  if (trayManager) {
    trayManager.destroy();
  }
});

// IPC Handlers

// Get server status
ipcMain.handle('get-server-status', () => {
  return {
    running: server.isRunning(),
    url: server.getConnectionURL(),
    clientCount: server.getClientCount()
  };
});

// Start server
ipcMain.handle('start-server', async () => {
  try {
    const result = await server.start();
    if (trayManager) trayManager.updateMenu();
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stop server
ipcMain.handle('stop-server', async () => {
  try {
    await server.stop();
    if (trayManager) trayManager.updateMenu();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get QR code
ipcMain.handle('get-qr-code', async () => {
  const QRCode = require('qrcode');
  const url = server.getConnectionURL();
  try {
    const qrCode = await QRCode.toDataURL(url, {
      width: 200,
      margin: 2
    });
    return { qrCode, url };
  } catch (error) {
    return { error: error.message };
  }
});

// Get settings
ipcMain.handle('get-settings', () => {
  return config.getAll();
});

// Update settings
ipcMain.handle('update-settings', async (event, settings) => {
  try {
    if (settings.port !== undefined) {
      config.setPort(settings.port);
    }
    if (settings.startOnLogin !== undefined) {
      config.set('startOnLogin', settings.startOnLogin);
      app.setLoginItemSettings({
        openAtLogin: settings.startOnLogin
      });
    }
    if (settings.startMinimized !== undefined) {
      config.set('startMinimized', settings.startMinimized);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Set PIN
ipcMain.handle('set-pin', async (event, pin) => {
  try {
    await config.setPin(pin);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get sessions
ipcMain.handle('get-sessions', () => {
  return ptyManager.getSessions();
});

// Get available shells
ipcMain.handle('get-available-shells', () => {
  return ptyManager.getAvailableShells();
});

// Set preferred shell
ipcMain.handle('set-preferred-shell', (event, shellPath) => {
  return ptyManager.setPreferredShell(shellPath);
});

// Create session
ipcMain.handle('create-session', (event, options) => {
  return ptyManager.createSession(options);
});

// Kill session
ipcMain.handle('kill-session', (event, sessionId) => {
  return ptyManager.killSession(sessionId);
});

// Terminal input
ipcMain.handle('terminal-input', (event, sessionId, data) => {
  return ptyManager.write(sessionId, data);
});

// Terminal resize
ipcMain.handle('terminal-resize', (event, sessionId, cols, rows) => {
  return ptyManager.resize(sessionId, cols, rows);
});

// Forward PTY output to renderer
ptyManager.on('output', (sessionId, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('terminal-output', sessionId, data);
  }
});

// Forward session exit to renderer
ptyManager.on('exit', (sessionId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('session-ended', sessionId);
  }
});

// Power save blocker controls
ipcMain.handle('get-power-save-status', () => {
  return {
    enabled: powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)
  };
});

ipcMain.handle('toggle-power-save-blocker', (event, enable) => {
  try {
    if (enable) {
      startPowerSaveBlocker();
      config.set('keepScreenAwake', true);
    } else {
      stopPowerSaveBlocker();
      config.set('keepScreenAwake', false);
    }
    return { success: true, enabled: enable };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update-related IPC handlers
ipcMain.handle('get-update-status', () => {
  return updater.getStatus();
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await updater.checkForUpdates(false); // not silent
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  updater.installUpdate();
  return { success: true };
});

ipcMain.handle('skip-update-version', (event, version) => {
  updater.skipVersion(version);
  return { success: true };
});

ipcMain.handle('toggle-auto-update', (event, enabled) => {
  config.setAutoUpdateEnabled(enabled);
  return { success: true, enabled };
});
