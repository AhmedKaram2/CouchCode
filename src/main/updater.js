const { autoUpdater } = require('electron-updater');
const { app, dialog, Notification } = require('electron');
const config = require('./config');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

class UpdateManager {
  constructor() {
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.updateInfo = null;
    this.downloadProgress = 0;
    this.mainWindow = null;
    this.trayManager = null;
    this.isChecking = false;

    // Configure auto-updater
    autoUpdater.autoDownload = true; // Auto-download when update found
    autoUpdater.autoInstallOnAppQuit = true; // Install on quit

    this.setupEventHandlers();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setTrayManager(tray) {
    this.trayManager = tray;
  }

  setupEventHandlers() {
    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);

      // Check if user has skipped this version
      if (config.getSkipVersion() === info.version) {
        log.info(`Skipping version ${info.version} as requested by user`);
        return;
      }

      this.updateAvailable = true;
      this.updateInfo = info;
      this.notifyUpdateAvailable(info);
      this.updateTrayMenu();
      this.sendToRenderer('update-available', info);
    });

    // Update not available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available');
      this.updateAvailable = false;
      this.isChecking = false;
      this.sendToRenderer('update-not-available', info);
    });

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      this.downloadProgress = Math.round(progress.percent);
      log.info(`Download progress: ${this.downloadProgress}%`);
      this.updateTrayMenu();
      this.sendToRenderer('update-download-progress', {
        percent: this.downloadProgress,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      });
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded');
      this.updateDownloaded = true;
      this.updateAvailable = false;
      this.downloadProgress = 100;
      this.updateTrayMenu();
      this.sendToRenderer('update-downloaded', info);
      this.promptUserToRestart(info);
    });

    // Error handling
    autoUpdater.on('error', (error) => {
      log.error('Update error:', error);
      this.isChecking = false;
      this.updateAvailable = false;
      this.sendToRenderer('update-error', {
        message: error.message,
        stack: error.stack
      });
    });

    // Checking for update
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...');
      this.isChecking = true;
      this.sendToRenderer('checking-for-update');
    });
  }

  // Check for updates
  async checkForUpdates(silent = false) {
    // Skip if auto-update is disabled
    if (!config.getAutoUpdateEnabled() && silent) {
      log.info('Auto-update is disabled, skipping check');
      return null;
    }

    // Don't check if already checking
    if (this.isChecking) {
      log.info('Update check already in progress');
      return null;
    }

    try {
      log.info('Manually checking for updates...');
      config.updateLastCheckTime();
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      log.error('Failed to check for updates:', error);
      if (!silent) {
        this.showErrorDialog(error.message);
      }
      return null;
    }
  }

  // Notify user about available update
  notifyUpdateAvailable(info) {
    const notification = {
      title: 'Update Available',
      body: `Version ${info.version} is available. Downloading...`,
      silent: false
    };

    if (Notification.isSupported()) {
      const n = new Notification(notification);
      n.show();
    }
  }

  // Prompt user to restart and install
  promptUserToRestart(info) {
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded`,
      detail: 'The update will be installed when you restart the application. Would you like to restart now?'
    };

    // Show dialog if window exists
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      dialog.showMessageBox(this.mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          // User clicked "Restart Now"
          setImmediate(() => {
            app.isQuitting = true;
            autoUpdater.quitAndInstall(false, true);
          });
        }
      });
    }
  }

  // Skip this version
  skipVersion(version) {
    config.setSkipVersion(version);
    this.updateAvailable = false;
    this.updateInfo = null;
    this.updateTrayMenu();
    this.sendToRenderer('update-skipped', version);
  }

  // Install update now
  installUpdate() {
    if (this.updateDownloaded) {
      setImmediate(() => {
        app.isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
      });
    }
  }

  // Get update status
  getStatus() {
    return {
      checking: this.isChecking,
      available: this.updateAvailable,
      downloaded: this.updateDownloaded,
      progress: this.downloadProgress,
      version: this.updateInfo?.version || null,
      releaseNotes: this.updateInfo?.releaseNotes || null,
      releaseDate: this.updateInfo?.releaseDate || null,
      currentVersion: app.getVersion(),
      autoUpdateEnabled: config.getAutoUpdateEnabled()
    };
  }

  // Send message to renderer
  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  // Update tray menu
  updateTrayMenu() {
    if (this.trayManager) {
      this.trayManager.updateMenu();
    }
  }

  // Show error dialog
  showErrorDialog(message) {
    dialog.showErrorBox('Update Error',
      `Failed to check for updates:\n\n${message}`);
  }
}

module.exports = new UpdateManager();
