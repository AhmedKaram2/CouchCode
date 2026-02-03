const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const os = require('os');
const server = require('./server');
const updater = require('./updater');

class TrayManager {
  constructor(mainWindow) {
    this.tray = null;
    this.mainWindow = mainWindow;
    this.platform = os.platform(); // 'win32', 'darwin', 'linux'
  }

  // Get platform-specific icon path
  getIconPath() {
    const buildDir = path.join(__dirname, '../../build');

    switch (this.platform) {
      case 'win32':
        // Windows uses .ico files
        return path.join(buildDir, 'tray-icon.ico');
      case 'darwin':
        // macOS prefers template images (Template.png) for dark/light mode support
        return path.join(buildDir, 'tray-iconTemplate.png');
      default:
        // Linux uses .png
        return path.join(buildDir, 'tray-icon.png');
    }
  }

  // Get appropriate icon size for platform
  getIconSize() {
    switch (this.platform) {
      case 'win32':
        return { width: 16, height: 16 };
      case 'darwin':
        return { width: 18, height: 18 }; // macOS retina support
      default:
        return { width: 22, height: 22 }; // Linux typically uses larger icons
    }
  }

  // Create tray icon
  create() {
    const iconPath = this.getIconPath();
    const iconSize = this.getIconSize();

    // Create a simple icon using nativeImage
    let icon;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        icon = this.createDefaultIcon(iconSize.width);
      }
    } catch {
      icon = this.createDefaultIcon(iconSize.width);
    }

    // Resize for tray
    icon = icon.resize(iconSize);

    // On macOS, mark as template image for proper dark/light mode handling
    if (this.platform === 'darwin') {
      icon.setTemplateImage(true);
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('CouchCode');
    this.updateMenu();

    // Click behavior differs by platform
    if (this.platform === 'win32') {
      // Windows: left-click shows window, right-click shows menu (default)
      this.tray.on('click', () => {
        if (this.mainWindow) {
          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide();
          } else {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      });
    } else if (this.platform === 'darwin') {
      // macOS: click shows menu by default, but we add double-click for window
      this.tray.on('double-click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
    } else {
      // Linux: click to toggle window
      this.tray.on('click', () => {
        if (this.mainWindow) {
          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide();
          } else {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      });
    }

    return this.tray;
  }

  // Create default icon
  createDefaultIcon(size = 16) {
    const canvas = Buffer.alloc(size * size * 4);

    // Fill with a simple green circle pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const dx = x - size / 2;
        const dy = y - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < size / 2 - 1) {
          // Green color (matches our primary color)
          canvas[idx] = 16;      // R
          canvas[idx + 1] = 185; // G
          canvas[idx + 2] = 129; // B
          canvas[idx + 3] = 255; // A
        } else {
          // Transparent
          canvas[idx] = 0;
          canvas[idx + 1] = 0;
          canvas[idx + 2] = 0;
          canvas[idx + 3] = 0;
        }
      }
    }

    return nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size
    });
  }

  // Update tray menu
  updateMenu() {
    const isRunning = server.isRunning();
    const clientCount = server.getClientCount();
    const updateStatus = updater.getStatus();

    const menuTemplate = [
      {
        label: `CouchCode`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: isRunning ? `Server Running (${clientCount} connected)` : 'Server Stopped',
        enabled: false
      },
      { type: 'separator' }
    ];

    // Add update menu items if update is available or downloaded
    if (updateStatus.checking) {
      menuTemplate.push({
        label: 'Checking for updates...',
        enabled: false
      });
      menuTemplate.push({ type: 'separator' });
    } else if (updateStatus.downloaded) {
      menuTemplate.push({
        label: `Update Ready (v${updateStatus.version})`,
        enabled: false
      });
      menuTemplate.push({
        label: 'Restart to Install',
        click: () => {
          updater.installUpdate();
        }
      });
      menuTemplate.push({ type: 'separator' });
    } else if (updateStatus.available) {
      menuTemplate.push({
        label: `Downloading update ${updateStatus.progress}%`,
        enabled: false
      });
      menuTemplate.push({ type: 'separator' });
    }

    // Server controls
    menuTemplate.push({
      label: isRunning ? 'Stop Server' : 'Start Server',
      click: async () => {
        if (isRunning) {
          await server.stop();
        } else {
          await server.start();
        }
        this.updateMenu();
        if (this.mainWindow) {
          this.mainWindow.webContents.send('server-status-changed', server.isRunning());
        }
      }
    });

    menuTemplate.push({
      label: 'Show Window',
      click: () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      }
    });

    menuTemplate.push({ type: 'separator' });

    menuTemplate.push({
      label: 'Quit',
      click: () => {
        const { app } = require('electron');
        app.quit();
      }
    });

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);

    // Update tooltip
    let tooltip = 'CouchCode';
    if (isRunning) {
      tooltip += ` - Running (${clientCount} connected)`;
    } else {
      tooltip += ' - Stopped';
    }
    if (updateStatus.downloaded) {
      tooltip += ' - Update Ready!';
    }
    this.tray.setToolTip(tooltip);
  }

  // Destroy tray
  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = TrayManager;
