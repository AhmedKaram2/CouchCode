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
    skipVersion: null,
    // Auto-approve settings
    autoApproveEnabled: false,
    trustedDevices: [],           // { id, name, fingerprint, createdAt, lastSeen }
    autoApproveLocalhost: true,   // Always auto-approve localhost connections
    autoApproveExpiry: 30,        // Days before trusted device expires
    // IDE integration
    apiTokens: []                 // { id, name, token, createdAt, scope }
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
      cloudRelayEnabled: store.get('cloudRelayEnabled'),
      autoApproveEnabled: store.get('autoApproveEnabled'),
      autoApproveLocalhost: store.get('autoApproveLocalhost') !== false,
      autoUpdateEnabled: store.get('autoUpdateEnabled') !== false
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
  },

  // ==================== AUTO-APPROVE ====================

  getAutoApproveEnabled() {
    return store.get('autoApproveEnabled') === true;
  },

  setAutoApproveEnabled(enabled) {
    store.set('autoApproveEnabled', !!enabled);
  },

  getAutoApproveLocalhost() {
    return store.get('autoApproveLocalhost') !== false; // Default true
  },

  setAutoApproveLocalhost(enabled) {
    store.set('autoApproveLocalhost', !!enabled);
  },

  getAutoApproveExpiry() {
    return store.get('autoApproveExpiry') || 30;
  },

  setAutoApproveExpiry(days) {
    store.set('autoApproveExpiry', Math.max(1, Math.min(365, parseInt(days, 10) || 30)));
  },

  // Trusted devices management
  getTrustedDevices() {
    const devices = store.get('trustedDevices') || [];
    const expiryDays = this.getAutoApproveExpiry();
    const now = Date.now();
    // Filter out expired devices
    return devices.filter(d => {
      const age = (now - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return age < expiryDays;
    });
  },

  addTrustedDevice(device) {
    const devices = this.getTrustedDevices();
    // Remove existing device with same fingerprint
    const filtered = devices.filter(d => d.fingerprint !== device.fingerprint);
    filtered.push({
      id: device.id || uuidv4(),
      name: device.name || 'Unknown Device',
      fingerprint: device.fingerprint,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
    store.set('trustedDevices', filtered);
  },

  removeTrustedDevice(fingerprint) {
    const devices = this.getTrustedDevices();
    store.set('trustedDevices', devices.filter(d => d.fingerprint !== fingerprint));
  },

  isTrustedDevice(fingerprint) {
    if (!this.getAutoApproveEnabled()) return false;
    const devices = this.getTrustedDevices();
    const device = devices.find(d => d.fingerprint === fingerprint);
    if (device) {
      // Update last seen
      device.lastSeen = new Date().toISOString();
      store.set('trustedDevices', this.getTrustedDevices());
      return true;
    }
    return false;
  },

  clearTrustedDevices() {
    store.set('trustedDevices', []);
  },

  // ==================== API TOKENS (IDE Integration) ====================

  getApiTokens() {
    return store.get('apiTokens') || [];
  },

  createApiToken(name, scope = 'full') {
    const tokens = this.getApiTokens();
    const token = uuidv4() + '-' + uuidv4();
    const entry = {
      id: uuidv4(),
      name: name || 'API Token',
      token,
      createdAt: new Date().toISOString(),
      scope
    };
    tokens.push(entry);
    store.set('apiTokens', tokens);
    return entry;
  },

  validateApiToken(token) {
    const tokens = this.getApiTokens();
    return tokens.find(t => t.token === token) || null;
  },

  revokeApiToken(id) {
    const tokens = this.getApiTokens();
    store.set('apiTokens', tokens.filter(t => t.id !== id));
  }
};

module.exports = config;
