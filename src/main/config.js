const Store = require('electron-store');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const store = new Store({
  name: 'couchcode-config',
  defaults: {
    port: 3847,
    pinHash: null,
    jwtSecret: null,
    startOnLogin: false,
    startMinimized: false,
    cloudRelayEnabled: false,
    preferredShell: null,
    commandHistory: [],
    autoUpdateEnabled: true,
    lastUpdateCheck: null,
    skipVersion: null
  }
});

// Initialize JWT secret if not exists
if (!store.get('jwtSecret')) {
  store.set('jwtSecret', uuidv4() + uuidv4());
}

const config = {
  // Get all settings
  getAll() {
    return {
      port: store.get('port'),
      hasPin: !!store.get('pinHash'),
      startOnLogin: store.get('startOnLogin'),
      startMinimized: store.get('startMinimized'),
      cloudRelayEnabled: store.get('cloudRelayEnabled')
    };
  },

  // Get specific setting
  get(key) {
    return store.get(key);
  },

  // Set specific setting
  set(key, value) {
    store.set(key, value);
  },

  // Get JWT secret
  getJwtSecret() {
    return store.get('jwtSecret');
  },

  // Set PIN (hashes it before storing)
  async setPin(pin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pin, salt);
    store.set('pinHash', hash);
  },

  // Verify PIN
  async verifyPin(pin) {
    const hash = store.get('pinHash');
    if (!hash) return false;
    return bcrypt.compare(pin, hash);
  },

  // Check if PIN is set
  hasPin() {
    return !!store.get('pinHash');
  },

  // Get port
  getPort() {
    return store.get('port');
  },

  // Set port
  setPort(port) {
    store.set('port', parseInt(port, 10));
  },

  // Reset to defaults
  reset() {
    store.clear();
    store.set('jwtSecret', uuidv4() + uuidv4());
  },

  // Get preferred shell
  getPreferredShell() {
    return store.get('preferredShell');
  },

  // Set preferred shell
  setPreferredShell(shellPath) {
    store.set('preferredShell', shellPath);
  },

  // Get command history
  getCommandHistory() {
    return store.get('commandHistory') || [];
  },

  // Add command to history
  addToHistory(command) {
    if (!command || command.trim() === '') return;

    const history = store.get('commandHistory') || [];
    // Remove duplicates and add to front
    const filtered = history.filter(c => c !== command);
    filtered.unshift(command);
    // Keep only last 100 commands
    store.set('commandHistory', filtered.slice(0, 100));
  },

  // Search command history
  searchHistory(query) {
    const history = store.get('commandHistory') || [];
    if (!query) return history.slice(0, 10);
    return history.filter(cmd => cmd.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  },

  // Auto-update settings
  getAutoUpdateEnabled() {
    return store.get('autoUpdateEnabled') !== false; // Default true
  },

  setAutoUpdateEnabled(enabled) {
    store.set('autoUpdateEnabled', !!enabled);
  },

  getSkipVersion() {
    return store.get('skipVersion');
  },

  setSkipVersion(version) {
    store.set('skipVersion', version);
  },

  updateLastCheckTime() {
    store.set('lastUpdateCheck', new Date().toISOString());
  }
};

module.exports = config;
