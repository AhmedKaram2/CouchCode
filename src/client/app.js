// Terminal Remote PWA Application with Voice & Smart Prompts
class TerminalRemoteApp {
  constructor() {
    this.token = localStorage.getItem('terminal-remote-token');
    this.ws = null;
    this.terminal = null;
    this.currentSessionId = null;
    this.sessions = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.authenticated = false;

    // Voice features
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.ttsEnabled = this.getSafeStorage('tts-enabled', 'false') === 'true';

    // Auto-enter feature (send with Enter or without)
    this.autoEnter = this.getSafeStorage('auto-enter', 'true') === 'true'; // Default ON

    // Kanban integration
    this.kanbanVisible = false;
    this.kanbanUrl = this.getSafeStorage('kanban-url', 'http://localhost:3000');
    this.kanbanConnected = false;

    // Vibe-Claude integration
    this.vibeClaudeEnabled = this.getSafeStorage('vibe-claude-enabled', 'false') === 'true';

    // Wake lock to keep screen active
    this.wakeLock = null;
    this.wakeLockEnabled = this.getSafeStorage('wake-lock-enabled', 'true') === 'true';

    // Prompt detection
    this.outputBuffer = '';
    this.lastOutputLines = [];
    this.outputTimeout = null;
    this.lastActivityTime = 0;
    this.isProcessing = false;

    // Claude Code completion patterns
    this.completionPatterns = [
      /Done[.!]?\s*$/i,
      /Completed[.!]?\s*$/i,
      /Finished[.!]?\s*$/i,
      /Successfully/i,
      /Created\s+\d+\s+files?/i,
      /Updated\s+\d+\s+files?/i,
      /No\s+changes/i,
      /Error[:\s]/i,
      /Failed[:\s]/i,
      /\$\s*$/,  // Shell prompt
      />\s*$/,   // Windows prompt
      /❯\s*$/,  // Fish/Zsh prompt
      /╰─>/,    // Custom prompt
      /claude.*>\s*$/i,  // Claude prompt
    ];

    // Patterns indicating Claude is working
    this.workingPatterns = [
      /Thinking/i,
      /Analyzing/i,
      /Processing/i,
      /Reading/i,
      /Writing/i,
      /Searching/i,
      /Running/i,
      /Executing/i,
      /Loading/i,
      /\.\.\./,  // Ellipsis (loading)
      /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/,  // Spinner characters
    ];

    this.promptPatterns = [
      { pattern: /\?\s*(y\/n|yes\/no|\[Y\/n\]|\[y\/N\])/i, type: 'yesno' },
      { pattern: /Do you want to proceed\?/i, type: 'yesno' },
      { pattern: /Do you trust the files/i, type: 'yesno' },
      { pattern: /Allow\s+.*\?/i, type: 'yesno' },
      { pattern: /Proceed\?/i, type: 'yesno' },
      { pattern: /Continue\?/i, type: 'yesno' },
      { pattern: /Confirm\?/i, type: 'yesno' },
      { pattern: /\(y\)es.*\(n\)o/i, type: 'yesno' },
      { pattern: /Press Enter to continue/i, type: 'enter' },
      { pattern: /Press any key/i, type: 'enter' },
      { pattern: /password:/i, type: 'password' },
      { pattern: /\[sudo\] password/i, type: 'password' },
      { pattern: /Overwrite.*\?.*\[y\/n\]/i, type: 'yesno' },
      { pattern: /Is this OK\?/i, type: 'yesno' },
      { pattern: /Are you sure\?/i, type: 'yesno' }
    ];

    // Action key mappings - actual character codes
    this.actionMap = {
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

    this.init();
  }

  // Safe localStorage getter (handles Safari Private Browsing)
  getSafeStorage(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return defaultValue;
    }
  }

  // Safe localStorage setter (handles Safari Private Browsing)
  setSafeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.registerServiceWorker();
    this.initSpeechRecognition();

    if (this.token) {
      this.showAppScreen();
      this.connect();
    } else {
      this.showLoginScreen();
    }
  }

  initSpeechRecognition() {
    // Detect iOS
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    this.isIOSChrome = this.isIOS && /CriOS/.test(navigator.userAgent);
    this.isIOSFirefox = this.isIOS && /FxiOS/.test(navigator.userAgent);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && !this.isIOSChrome && !this.isIOSFirefox) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (this.commandInput) {
          this.commandInput.value = transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          console.log('Voice command:', transcript);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateVoiceButton();
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.updateVoiceButton();

        if (event.error === 'not-allowed') {
          this.showVoiceError('Microphone access denied. Please allow microphone in settings.');
        }
      };

      this.speechSupported = true;
    } else {
      this.speechSupported = false;
    }
  }

  showVoiceError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'voice-toast';
    toast.innerHTML = `
      <div class="voice-toast-content">
        <span class="voice-toast-icon">🎤</span>
        <span class="voice-toast-message">${message}</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  bindElements() {
    // Screens
    this.loginScreen = document.getElementById('login-screen');
    this.appScreen = document.getElementById('app-screen');

    // Login
    this.loginForm = document.getElementById('login-form');
    this.pinInput = document.getElementById('pin-input');
    this.loginBtn = document.getElementById('login-btn');
    this.loginError = document.getElementById('login-error');

    // Header
    this.sessionsBtn = document.getElementById('sessions-btn');
    this.sessionCount = document.getElementById('session-count');
    this.sessionTitle = document.getElementById('session-title');
    this.newSessionBtn = document.getElementById('new-session-btn');

    // Terminal
    this.terminalContainer = document.getElementById('terminal');
    this.noSession = document.getElementById('no-session');
    this.createFirstSession = document.getElementById('create-first-session');

    // Quick keyboard
    this.quickKeyboard = document.getElementById('quick-keyboard');
    this.keyboardGrid = document.getElementById('keyboard-grid');
    this.keyboardCompact = document.getElementById('keyboard-compact');
    this.keyboardMinimal = document.getElementById('keyboard-minimal');
    this.layoutToggle = document.getElementById('layout-toggle');
    this.keyboardCollapse = document.getElementById('keyboard-collapse');
    this.smartPromptBar = document.getElementById('smart-prompt-bar');

    // Scroll controls
    this.scrollTopBtn = document.getElementById('scroll-top-btn');
    this.scrollBottomBtn = document.getElementById('scroll-bottom-btn');

    // Layout preference
    this.currentLayout = this.getSafeStorage('keyboard-layout', 'default');

    // Input bar
    this.commandInput = document.getElementById('command-input');
    this.sendBtn = document.getElementById('send-btn');
    this.voiceBtn = document.getElementById('voice-btn');
    this.ttsBtn = document.getElementById('tts-btn');
    this.autoEnterBtn = document.getElementById('auto-enter-btn');

    // Sessions panel
    this.sessionsPanel = document.getElementById('sessions-panel');
    this.closeSessionsBtn = document.getElementById('close-sessions-btn');
    this.sessionsList = document.getElementById('sessions-list');
    this.panelNewSession = document.getElementById('panel-new-session');

    // Overlay
    this.overlay = document.getElementById('overlay');

    // Connection status
    this.connectionStatus = document.getElementById('connection-status');

    // Kanban integration
    this.mainContent = document.getElementById('main-content');
    this.kanbanBtn = document.getElementById('kanban-btn');
    this.kanbanPanel = document.getElementById('kanban-panel');
    this.splitDivider = document.getElementById('split-divider');
    this.kanbanIframe = document.getElementById('kanban-iframe');
    this.kanbanPlaceholder = document.getElementById('kanban-placeholder');
    this.kanbanUrlInput = document.getElementById('kanban-url-input');
    this.kanbanConnectBtn = document.getElementById('kanban-connect-btn');
    this.kanbanSettingsBtn = document.getElementById('kanban-settings-btn');
    this.kanbanRefreshBtn = document.getElementById('kanban-refresh-btn');
    this.kanbanExternalBtn = document.getElementById('kanban-external-btn');

    // Vibe-Claude integration
    this.vibeClaudeBar = document.getElementById('vibe-claude-bar');
    this.vibeEnableBtn = document.getElementById('vibe-enable-btn');
    this.vibeToggleBtn = document.getElementById('vibe-toggle-btn');

    // Claude Code integration
    this.claudeCodeBtn = document.getElementById('claude-code-btn');
    this.claudeCodeModal = document.getElementById('claude-code-modal');
    this.claudePromptInput = document.getElementById('claude-prompt-input');
    this.claudeCancelBtn = document.getElementById('claude-cancel-btn');
    this.claudeStartBtn = document.getElementById('claude-start-btn');

    // Snippets/Quick Commands
    this.snippetsBtn = document.getElementById('snippets-btn');
    this.snippetsModal = document.getElementById('snippets-modal');
    this.snippetsCloseBtn = document.getElementById('snippets-close-btn');
    this.snippetsSearchInput = document.getElementById('snippets-search-input');
    this.snippetsList = document.getElementById('snippets-list');
    this.snippetNewInput = document.getElementById('snippet-new-input');
    this.snippetAddBtn = document.getElementById('snippet-add-btn');

    // Settings
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');
    this.fontDecrease = document.getElementById('font-decrease');
    this.fontIncrease = document.getElementById('font-increase');
    this.fontSizeDisplay = document.getElementById('font-size-display');
    this.themeSelector = document.getElementById('theme-selector');
    this.notifyToggle = document.getElementById('notify-toggle');
    this.soundToggle = document.getElementById('sound-toggle');
    this.hapticToggle = document.getElementById('haptic-toggle');

    // Settings state
    this.fontSize = parseInt(this.getSafeStorage('font-size', '14'));
    this.currentTheme = this.getSafeStorage('terminal-theme', 'dark');
    this.notifyEnabled = this.getSafeStorage('notify-enabled', 'true') === 'true';
    this.soundEnabled = this.getSafeStorage('sound-enabled', 'true') === 'true';
    this.hapticEnabled = this.getSafeStorage('haptic-enabled', 'true') === 'true';

    // Command history & favorites
    this.commandHistory = JSON.parse(this.getSafeStorage('command-history', '[]')) || [];
    this.favoriteCommands = JSON.parse(this.getSafeStorage('favorite-commands', '[]')) || [];

    // Long command tracking
    this.commandStartTime = null;
    this.longCommandThreshold = 5000; // 5 seconds

    // Default snippets by category
    this.defaultSnippets = {
      git: [
        { cmd: 'git status', desc: 'Check status' },
        { cmd: 'git add .', desc: 'Stage all' },
        { cmd: 'git commit -m ""', desc: 'Commit' },
        { cmd: 'git push', desc: 'Push changes' },
        { cmd: 'git pull', desc: 'Pull changes' },
        { cmd: 'git log --oneline -10', desc: 'Recent commits' },
        { cmd: 'git branch', desc: 'List branches' },
        { cmd: 'git checkout -b ', desc: 'New branch' },
        { cmd: 'git stash', desc: 'Stash changes' },
        { cmd: 'git diff', desc: 'Show diff' },
      ],
      npm: [
        { cmd: 'npm install', desc: 'Install deps' },
        { cmd: 'npm start', desc: 'Start app' },
        { cmd: 'npm run build', desc: 'Build' },
        { cmd: 'npm test', desc: 'Run tests' },
        { cmd: 'npm run dev', desc: 'Dev mode' },
        { cmd: 'npm outdated', desc: 'Check updates' },
        { cmd: 'npm audit', desc: 'Security audit' },
        { cmd: 'npx ', desc: 'Run package' },
      ],
      system: [
        { cmd: 'ls -la', desc: 'List files' },
        { cmd: 'pwd', desc: 'Current dir' },
        { cmd: 'cd ', desc: 'Change dir' },
        { cmd: 'mkdir ', desc: 'Create dir' },
        { cmd: 'rm -rf ', desc: 'Delete' },
        { cmd: 'cat ', desc: 'View file' },
        { cmd: 'grep -r "" .', desc: 'Search' },
        { cmd: 'find . -name ""', desc: 'Find file' },
        { cmd: 'ps aux', desc: 'Processes' },
        { cmd: 'top', desc: 'System monitor' },
      ]
    };

    this.currentSnippetTab = 'favorites';
  }

  bindEvents() {
    // Login form
    this.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    // Sessions panel
    this.sessionsBtn.addEventListener('click', () => this.toggleSessionsPanel(true));
    this.closeSessionsBtn.addEventListener('click', () => this.toggleSessionsPanel(false));
    this.overlay.addEventListener('click', () => this.toggleSessionsPanel(false));

    // New session
    this.newSessionBtn.addEventListener('click', () => this.createSession());
    this.panelNewSession.addEventListener('click', () => {
      this.createSession();
      this.toggleSessionsPanel(false);
    });
    this.createFirstSession.addEventListener('click', () => this.createSession());

    // Quick keyboard - use event delegation with action mapping
    this.quickKeyboard?.addEventListener('click', (e) => {
      const btn = e.target.closest('.key-btn');
      if (btn) {
        const action = btn.dataset.action;
        console.log('Key button clicked:', action);
        if (action && this.currentSessionId) {
          this.handleAction(action);
          this.vibrate();
        }
      }
    });

    // Layout toggle
    this.layoutToggle?.addEventListener('click', () => this.cycleLayout());

    // Keyboard collapse
    this.keyboardCollapse?.addEventListener('click', () => this.toggleKeyboardCollapse());

    // Scroll buttons
    this.scrollTopBtn?.addEventListener('click', () => this.scrollTerminalToTop());
    this.scrollBottomBtn?.addEventListener('click', () => this.scrollTerminalToBottom());

    // Command input
    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.sendCommand();
      }
    });
    this.sendBtn.addEventListener('click', () => this.sendCommand());

    // Voice button
    this.voiceBtn?.addEventListener('click', () => this.toggleVoiceInput());

    // TTS button
    this.ttsBtn?.addEventListener('click', () => this.toggleTTS());

    // Auto-enter button - use both click and touchend for Safari compatibility
    if (this.autoEnterBtn) {
      // Use touchend for mobile Safari (more reliable)
      let touchHandled = false;
      this.autoEnterBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchHandled = true;
        this.toggleAutoEnter();
        // Reset flag after short delay
        setTimeout(() => { touchHandled = false; }, 300);
      }, { passive: false });
      // Click for desktop
      this.autoEnterBtn.addEventListener('click', (e) => {
        if (!touchHandled) {
          this.toggleAutoEnter();
        }
      });
    }

    // Handle visibility change for reconnection
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected()) {
        this.connect();
      }
    });

    // Kanban toggle
    this.kanbanBtn?.addEventListener('click', () => this.toggleKanban());

    // Kanban controls
    this.kanbanConnectBtn?.addEventListener('click', () => this.connectKanban());
    this.kanbanSettingsBtn?.addEventListener('click', () => this.showKanbanSettings());
    this.kanbanRefreshBtn?.addEventListener('click', () => this.refreshKanban());
    this.kanbanExternalBtn?.addEventListener('click', () => this.openKanbanExternal());

    // Kanban URL input enter key
    this.kanbanUrlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.connectKanban();
      }
    });

    // Split divider drag (desktop)
    this.initSplitDividerDrag();

    // Vibe-Claude events
    this.vibeEnableBtn?.addEventListener('click', () => this.toggleVibeClaudeEnabled());
    this.vibeToggleBtn?.addEventListener('click', () => this.hideVibeClaudeBar());

    // Vibe-Claude command buttons (event delegation)
    this.vibeClaudeBar?.addEventListener('click', (e) => {
      const btn = e.target.closest('.vibe-cmd');
      if (btn) {
        const cmd = btn.dataset.cmd;
        if (cmd) {
          this.executeVibeCommand(cmd);
        }
      }
    });

    // Claude Code modal events
    this.claudeCodeBtn?.addEventListener('click', () => this.showClaudeCodeModal());
    this.claudeCancelBtn?.addEventListener('click', () => this.hideClaudeCodeModal());
    this.claudeStartBtn?.addEventListener('click', () => this.startClaudeCode());

    // Claude Code quick action buttons (event delegation)
    this.claudeCodeModal?.addEventListener('click', (e) => {
      const btn = e.target.closest('.claude-quick-btn');
      if (btn) {
        const prompt = btn.dataset.prompt;
        if (prompt) {
          this.selectClaudeQuickAction(btn, prompt);
        }
      }
    });

    // Close modal on background click
    this.claudeCodeModal?.addEventListener('click', (e) => {
      if (e.target === this.claudeCodeModal) {
        this.hideClaudeCodeModal();
      }
    });

    // Snippets modal events
    this.snippetsBtn?.addEventListener('click', () => this.showSnippetsModal());
    this.snippetsCloseBtn?.addEventListener('click', () => this.hideSnippetsModal());
    this.snippetsModal?.addEventListener('click', (e) => {
      if (e.target === this.snippetsModal) this.hideSnippetsModal();
    });
    this.snippetsSearchInput?.addEventListener('input', () => this.filterSnippets());
    this.snippetAddBtn?.addEventListener('click', () => this.addCustomSnippet());
    this.snippetNewInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addCustomSnippet();
    });

    // Snippet tabs
    document.querySelectorAll('.snippet-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchSnippetTab(tab.dataset.tab));
    });

    // Settings modal events
    this.settingsBtn?.addEventListener('click', () => this.showSettingsModal());
    this.settingsCloseBtn?.addEventListener('click', () => this.hideSettingsModal());
    this.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.hideSettingsModal();
    });

    // Font size controls
    this.fontDecrease?.addEventListener('click', () => this.changeFontSize(-1));
    this.fontIncrease?.addEventListener('click', () => this.changeFontSize(1));

    // Theme selector
    this.themeSelector?.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-btn');
      if (btn) this.setTheme(btn.dataset.theme);
    });

    // Toggle buttons
    this.notifyToggle?.addEventListener('click', () => this.toggleSetting('notify'));
    this.soundToggle?.addEventListener('click', () => this.toggleSetting('sound'));
    this.hapticToggle?.addEventListener('click', () => this.toggleSetting('haptic'));
  }

  // Handle action button click
  handleAction(action) {
    const sequence = this.actionMap[action];
    if (sequence) {
      console.log('Sending action:', action, 'sequence:', JSON.stringify(sequence),
                  'char codes:', [...sequence].map(c => c.charCodeAt(0)));
      this.sendInput(sequence);
      this.hideSmartPrompt();
    } else {
      console.warn('Unknown action:', action);
    }
  }

  toggleVoiceInput() {
    if (!this.speechSupported) {
      // Show specific message based on browser
      if (this.isIOSChrome) {
        this.showVoiceError('Voice input not supported in Chrome on iOS. Please use Safari for voice input.');
      } else if (this.isIOSFirefox) {
        this.showVoiceError('Voice input not supported in Firefox on iOS. Please use Safari for voice input.');
      } else if (this.isIOS) {
        this.showVoiceError('Voice input requires Safari on iOS. Please open this app in Safari.');
      } else {
        this.showVoiceError('Voice input not supported in this browser. Try Chrome or Edge on desktop.');
      }
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
        this.showVoiceError('Failed to start voice input. Please try again.');
      }
    }
    this.updateVoiceButton();
  }

  updateVoiceButton() {
    if (this.voiceBtn) {
      if (!this.speechSupported) {
        this.voiceBtn.classList.add('unsupported');
        if (this.isIOS) {
          this.voiceBtn.title = 'Voice input requires Safari on iOS';
        } else {
          this.voiceBtn.title = 'Voice input not supported';
        }
      } else if (this.isListening) {
        this.voiceBtn.classList.add('active', 'listening');
        this.voiceBtn.classList.remove('unsupported');
        this.voiceBtn.title = 'Stop listening';
      } else {
        this.voiceBtn.classList.remove('active', 'listening', 'unsupported');
        this.voiceBtn.title = 'Start voice input';
      }
    }
  }

  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    this.setSafeStorage('tts-enabled', this.ttsEnabled ? 'true' : 'false');
    this.updateTTSButton();
    if (this.ttsEnabled) {
      this.speak('Text to speech enabled');
    }
  }

  toggleAutoEnter() {
    this.autoEnter = !this.autoEnter;
    this.setSafeStorage('auto-enter', this.autoEnter ? 'true' : 'false');
    this.updateAutoEnterButton();
    // Vibrate for feedback
    this.vibrate();
    console.log('Auto-enter toggled:', this.autoEnter);
  }

  updateAutoEnterButton() {
    if (this.autoEnterBtn) {
      if (this.autoEnter) {
        this.autoEnterBtn.classList.add('active');
        this.autoEnterBtn.title = 'Auto-enter ON (click to send without Enter)';
      } else {
        this.autoEnterBtn.classList.remove('active');
        this.autoEnterBtn.title = 'Auto-enter OFF (click to send with Enter)';
      }
    }
  }

  // Cycle through keyboard layouts
  cycleLayout() {
    const layouts = ['default', 'compact', 'minimal'];
    const currentIndex = layouts.indexOf(this.currentLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    this.currentLayout = layouts[nextIndex];
    this.setSafeStorage('keyboard-layout', this.currentLayout);
    this.applyLayout();
    this.vibrate();
  }

  // Apply the current layout
  applyLayout() {
    // Hide all layouts
    if (this.keyboardGrid) this.keyboardGrid.classList.add('hidden');
    if (this.keyboardCompact) this.keyboardCompact.classList.add('hidden');
    if (this.keyboardMinimal) this.keyboardMinimal.classList.add('hidden');

    // Show the current layout
    switch (this.currentLayout) {
      case 'compact':
        if (this.keyboardCompact) this.keyboardCompact.classList.remove('hidden');
        break;
      case 'minimal':
        if (this.keyboardMinimal) this.keyboardMinimal.classList.remove('hidden');
        break;
      default:
        if (this.keyboardGrid) this.keyboardGrid.classList.remove('hidden');
        break;
    }

    // Resize terminal to fit new space
    this.resizeTerminal();
  }

  // Toggle keyboard collapse
  toggleKeyboardCollapse() {
    if (this.quickKeyboard) {
      this.quickKeyboard.classList.toggle('collapsed');
      this.vibrate();
      // Resize terminal to fit new space
      this.resizeTerminal();
    }
  }

  // Initialize keyboard layout on app start
  initKeyboardLayout() {
    this.applyLayout();
  }

  // Scroll terminal to top
  scrollTerminalToTop() {
    if (this.terminal && this.terminal.term) {
      this.terminal.term.scrollToTop();
    }
    this.vibrate();
  }

  // Scroll terminal to bottom
  scrollTerminalToBottom() {
    if (this.terminal && this.terminal.term) {
      this.terminal.term.scrollToBottom();
    }
    this.vibrate();
  }

  // Resize terminal after layout changes
  resizeTerminal() {
    if (this.terminal) {
      setTimeout(() => {
        this.terminal.fit();
      }, 100);
    }
  }

  updateTTSButton() {
    if (this.ttsBtn) {
      if (this.ttsEnabled) {
        this.ttsBtn.classList.add('active');
        this.ttsBtn.title = 'Disable text-to-speech';
      } else {
        this.ttsBtn.classList.remove('active');
        this.ttsBtn.title = 'Enable text-to-speech';
      }
    }
  }

  speak(text) {
    if (!this.ttsEnabled || !this.synthesis) return;
    this.synthesis.cancel();

    const cleanText = text
      .replace(/\x1b\[[0-9;]*m/g, '')
      .replace(/[^\w\s.,?!'\-:;()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText.length > 0 && cleanText.length < 500) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Visual feedback when speaking
      utterance.onstart = () => {
        if (this.ttsBtn) {
          this.ttsBtn.classList.add('speaking');
        }
      };

      utterance.onend = () => {
        if (this.ttsBtn) {
          this.ttsBtn.classList.remove('speaking');
        }
      };

      utterance.onerror = () => {
        if (this.ttsBtn) {
          this.ttsBtn.classList.remove('speaking');
        }
      };

      this.synthesis.speak(utterance);
    }
  }

  detectPrompts(text) {
    this.outputBuffer += text;
    this.lastActivityTime = Date.now();

    // Track last lines for TTS
    const newLines = text.split('\n').filter(line => line.trim().length > 0);
    this.lastOutputLines.push(...newLines);
    if (this.lastOutputLines.length > 50) {
      this.lastOutputLines = this.lastOutputLines.slice(-50);
    }

    // Check if Claude is working
    for (const pattern of this.workingPatterns) {
      if (pattern.test(text)) {
        this.isProcessing = true;
        break;
      }
    }

    // Check for completion
    this.checkForCompletion(text);

    if (this.outputBuffer.length > 2000) {
      this.outputBuffer = this.outputBuffer.slice(-1000);
    }

    // Check for prompt patterns (y/n questions, etc.)
    for (const { pattern, type } of this.promptPatterns) {
      if (pattern.test(this.outputBuffer)) {
        this.showSmartPrompt(type);
        this.playNotificationSound();
        if (this.ttsEnabled) {
          const match = this.outputBuffer.match(/[^\n]*\?[^\n]*/);
          if (match) {
            this.speak(match[0]);
          }
        }
        this.outputBuffer = '';
        return;
      }
    }

    // Set timeout to check for completion after activity stops
    if (this.outputTimeout) {
      clearTimeout(this.outputTimeout);
    }
    this.outputTimeout = setTimeout(() => {
      this.onOutputComplete();
    }, 1500); // Wait 1.5 seconds of no output
  }

  checkForCompletion(text) {
    // Only trigger TTS for clear completion messages
    const completionMessages = [
      /\b(done|completed|finished|success|succeeded)\b[.!]?\s*$/i,
      /\bfailed\b[.!:]/i,
      /\berror\b[.!:]/i,
      /\bcreated\s+\d+\s+files?\b/i,
      /\bupdated\s+\d+\s+files?\b/i,
    ];

    for (const pattern of completionMessages) {
      if (pattern.test(text)) {
        if (this.isProcessing) {
          this.isProcessing = false;
          // Delay TTS to make sure output is finished
          setTimeout(() => {
            if (!this.isProcessing && this.ttsEnabled) {
              this.speakLastResult();
            }
          }, 800);
        }
        return;
      }
    }

    // Check for shell prompt return (task finished)
    for (const pattern of this.completionPatterns) {
      if (pattern.test(text)) {
        this.isProcessing = false;
        return;
      }
    }
  }

  onOutputComplete() {
    // Called when output stops for a while - be more selective
    if (this.isProcessing) {
      this.isProcessing = false;

      // Check for long command notification
      this.checkLongCommand();

      // Only speak if TTS enabled and we have meaningful content
      if (this.ttsEnabled) {
        const meaningfulCount = this.lastOutputLines.filter(l => this.isLineWorthSpeaking(l)).length;
        if (meaningfulCount >= 1) {
          this.speakLastResult();
        } else {
          this.lastOutputLines = [];
        }
      }
    }
  }

  speakLastResult() {
    if (!this.ttsEnabled || this.lastOutputLines.length === 0) return;

    // Get the last meaningful lines (skip garbage)
    const meaningfulLines = this.lastOutputLines
      .slice(-15)
      .filter(line => this.isLineWorthSpeaking(line));

    if (meaningfulLines.length === 0) {
      this.lastOutputLines = [];
      return;
    }

    // Get last 2 meaningful lines only
    const linesToSpeak = meaningfulLines.slice(-2);
    const textToSpeak = linesToSpeak.join('. ');

    // Clean and speak
    const cleanText = this.cleanTextForSpeech(textToSpeak);
    if (cleanText.length > 8 && this.isTextWorthSpeaking(cleanText)) {
      console.log('TTS speaking:', cleanText);
      this.speak(cleanText);
    }

    // Clear the buffer after speaking
    this.lastOutputLines = [];
  }

  // Check if a line is worth speaking
  isLineWorthSpeaking(line) {
    const trimmed = line.trim();

    // Skip empty or very short lines
    if (trimmed.length < 5) return false;

    // Skip lines that are mostly non-alphanumeric
    const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, '');
    if (alphanumeric.length < trimmed.length * 0.3) return false;

    // Skip shell prompts
    if (/^[$>❯%#→⟩]\s*$/.test(trimmed)) return false;
    if (/^[\w-]+@[\w-]+[:%~]/.test(trimmed)) return false; // user@host prompts
    if (/^\([\w-]+\)\s*[$>]/.test(trimmed)) return false; // (env) $ prompts

    // Skip spinner/progress characters
    if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣾⣽⣻⢿⡿⣟⣯⣷\s.…─━│┃]+$/.test(trimmed)) return false;

    // Skip progress bars
    if (/[█▓▒░■□◼◻●○◉◎]+/.test(trimmed)) return false;
    if (/\[[\s=#-]+\]/.test(trimmed)) return false; // [====    ] style
    if (/\d+%\s*[|│]/.test(trimmed)) return false;

    // Skip file paths (but not sentences about files)
    if (/^[\/~.][\w\-\/\.]+$/.test(trimmed)) return false;
    if (/^[A-Z]:\\[\w\\]+$/.test(trimmed)) return false;

    // Skip git hashes and UUIDs
    if (/^[a-f0-9]{7,40}$/i.test(trimmed)) return false;
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) return false;

    // Skip lines with too many special chars or numbers
    const specialChars = trimmed.replace(/[a-zA-Z\s]/g, '').length;
    if (specialChars > trimmed.length * 0.5) return false;

    // Skip timestamps and technical logs
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(trimmed)) return false;
    if (/^\[\d{2}:\d{2}:\d{2}\]/.test(trimmed)) return false;

    // Skip npm/yarn/build output noise
    if (/^(added|removed|updated|audited)\s+\d+\s+packages?/i.test(trimmed)) return false;
    if (/^\s*(WARN|INFO|DEBUG|TRACE)\s/i.test(trimmed)) return false;
    if (/^npm\s+(WARN|ERR!)/i.test(trimmed)) return false;

    // Skip repeated characters (like ========)
    if (/^(.)\1{5,}$/.test(trimmed)) return false;

    // Skip ANSI remnants
    if (/\[\d+m/.test(trimmed)) return false;
    if (/\\x1b/.test(trimmed)) return false;

    // Skip lines that are just commands being echoed
    if (/^\+\s/.test(trimmed)) return false; // set -x output

    return true;
  }

  // Check if cleaned text is worth speaking
  isTextWorthSpeaking(text) {
    // Must have actual words
    const words = text.split(/\s+/).filter(w => w.length > 2);
    if (words.length < 2) return false;

    // Must have some recognizable English words
    const commonWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'has', 'have', 'had',
      'be', 'been', 'being', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'can', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'for', 'on', 'with',
      'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
      'file', 'files', 'error', 'warning', 'success', 'failed', 'complete', 'done',
      'created', 'updated', 'deleted', 'found', 'not', 'no', 'yes', 'ok', 'okay',
      'running', 'starting', 'stopping', 'finished', 'processing', 'loading'];

    const lowerText = text.toLowerCase();
    const hasCommonWord = commonWords.some(word =>
      lowerText.includes(word + ' ') || lowerText.includes(' ' + word) || lowerText === word
    );

    return hasCommonWord;
  }

  cleanTextForSpeech(text) {
    return text
      // Remove ANSI escape codes
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\x1b\][^\x07]*\x07/g, '') // OSC sequences
      // Remove box drawing and special chars
      .replace(/[│┌┐└┘├┤┬┴┼─━┃║╔╗╚╝╠╣╦╩╬▀▄█▌▐░▒▓■□◼◻●○◉◎⬤⬜⬛]/g, '')
      // Remove emoji and special unicode
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      // Remove brackets with technical content
      .replace(/\[[^\]]*\d+[^\]]*\]/g, '') // [123], [0m], etc
      .replace(/\([^)]*\d{3,}[^)]*\)/g, '') // (12345), etc
      // Simplify file paths - just say "file" or extract filename
      .replace(/[\/~][^\s]+\/([^\s\/]+)/g, 'file $1')
      .replace(/[A-Z]:\\[^\s]+\\([^\s\\]+)/g, 'file $1')
      // Remove URLs but say "link"
      .replace(/https?:\/\/[^\s]+/g, 'link')
      // Remove remaining special characters
      .replace(/[^\w\s.,?!'":\-()]/g, ' ')
      // Clean up multiple spaces/punctuation
      .replace(/\s+/g, ' ')
      .replace(/\.{2,}/g, '.')
      .replace(/\s+([.,!?])/g, '$1')
      // Limit length
      .substring(0, 200)
      .trim();
  }

  showSmartPrompt(type) {
    if (!this.smartPromptBar) return;

    let buttons = '';
    switch (type) {
      case 'yesno':
        buttons = `
          <button class="smart-btn yes" onclick="app.handleAction('yes'); app.hideSmartPrompt();">
            <span class="btn-icon">✓</span> Yes
          </button>
          <button class="smart-btn no" onclick="app.handleAction('no'); app.hideSmartPrompt();">
            <span class="btn-icon">✗</span> No
          </button>
          <button class="smart-btn enter" onclick="app.handleAction('enter'); app.hideSmartPrompt();">
            <span class="btn-icon">↵</span> Enter
          </button>
        `;
        break;
      case 'enter':
        buttons = `
          <button class="smart-btn enter" onclick="app.handleAction('enter'); app.hideSmartPrompt();">
            <span class="btn-icon">↵</span> Press Enter
          </button>
        `;
        break;
      case 'password':
        buttons = `
          <span class="prompt-label">Password required - type in input box</span>
        `;
        break;
    }
    this.smartPromptBar.innerHTML = buttons;
    this.smartPromptBar.classList.add('visible');
    this.vibrate();
  }

  hideSmartPrompt() {
    if (this.smartPromptBar) {
      this.smartPromptBar.classList.remove('visible');
    }
  }

  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {}
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('Service Worker registered:', registration.scope);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async login() {
    const pin = this.pinInput.value.trim();
    if (pin.length < 4) {
      this.showLoginError('PIN must be at least 4 characters');
      return;
    }

    this.loginBtn.disabled = true;
    this.loginBtn.textContent = 'Connecting...';
    this.hideLoginError();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        this.token = data.token;
        localStorage.setItem('terminal-remote-token', this.token);
        this.pinInput.value = '';
        this.showAppScreen();
        this.connect();
      } else {
        this.showLoginError(data.error || 'Authentication failed');
      }
    } catch (error) {
      this.showLoginError('Connection failed. Is the server running?');
    } finally {
      this.loginBtn.disabled = false;
      this.loginBtn.textContent = 'Connect';
    }
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.updateConnectionStatus('connecting');

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.ws.send(JSON.stringify({ type: 'auth', token: this.token }));
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.authenticated = false;
      this.stopSessionPolling();
      this.updateConnectionStatus('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('disconnected');
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'auth_success':
        console.log('Authentication successful');
        this.authenticated = true;
        this.updateConnectionStatus('connected');
        this.loadSessions();
        this.startSessionPolling();
        break;

      case 'auth_error':
        this.logout();
        this.showLoginError(data.message);
        break;

      case 'output':
        if (this.terminal) {
          this.terminal.write(data.data);
          this.terminal.scrollToBottom();
          this.detectPrompts(data.data);
        }
        break;

      case 'session_created':
        console.log('Session created:', data.session);
        this.sessions.push(data.session);
        this.updateSessionsList();
        this.attachToSession(data.session.id);
        // Clear terminal for fresh session
        if (this.terminal) {
          this.terminal.clear();
        }
        break;

      case 'session_ended':
        this.sessions = this.sessions.filter(s => s.id !== data.sessionId);
        this.updateSessionsList();
        if (this.currentSessionId === data.sessionId) {
          this.currentSessionId = null;
          this.showNoSession();
        }
        break;

      case 'sessions_update':
        console.log('Sessions update received:', data.sessions);
        this.sessions = data.sessions || [];
        this.updateSessionsList();
        if (this.sessions.length > 0 && !this.currentSessionId) {
          this.attachToSession(this.sessions[0].id);
        } else if (this.sessions.length === 0 && this.currentSessionId) {
          this.currentSessionId = null;
          this.showNoSession();
        }
        break;

      case 'attached':
        console.log('Attached to session:', data.sessionId);
        this.currentSessionId = data.sessionId;
        this.showTerminal();
        const attachedSession = this.sessions.find(s => s.id === data.sessionId);
        if (attachedSession) {
          this.sessionTitle.textContent = attachedSession.name;
        }
        if (this.terminal) {
          // Clear terminal before receiving history
          this.terminal.clear();
          setTimeout(() => {
            this.terminal.fit();
            this.terminal.focus();
            const dims = this.terminal.getDimensions();
            if (dims.cols !== data.cols || dims.rows !== data.rows) {
              this.sendResize(dims.cols, dims.rows);
            }
          }, 100);
        }
        break;

      case 'history':
        // Received terminal history - write it to sync the terminal
        console.log('Received terminal history, length:', data.data?.length);
        if (this.terminal && data.data) {
          this.terminal.write(data.data);
          this.terminal.scrollToBottom();
        }
        break;

      case 'detached':
        this.currentSessionId = null;
        break;

      case 'error':
        console.error('Server error:', data.message);
        break;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionStatus('failed');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => {
      if (this.token && !this.isConnected()) {
        this.connect();
      }
    }, delay);
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  async loadSessions() {
    try {
      console.log('Loading sessions...');
      const response = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await response.json();
      console.log('Sessions loaded:', data);
      this.sessions = data.sessions || [];
      this.updateSessionsList();

      if (this.sessions.length > 0 && !this.currentSessionId) {
        console.log('Attaching to first session:', this.sessions[0].id);
        this.attachToSession(this.sessions[0].id);
      } else if (this.sessions.length === 0) {
        console.log('No sessions found');
        this.showNoSession();
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  startSessionPolling() {
    this.sessionPollInterval = setInterval(() => {
      if (this.authenticated && this.isConnected()) {
        this.loadSessions();
      }
    }, 5000);
  }

  stopSessionPolling() {
    if (this.sessionPollInterval) {
      clearInterval(this.sessionPollInterval);
      this.sessionPollInterval = null;
    }
  }

  createSession() {
    console.log('Creating session, connected:', this.isConnected(), 'authenticated:', this.authenticated);
    if (this.isConnected()) {
      if (!this.authenticated) {
        setTimeout(() => this.createSession(), 500);
        return;
      }
      // Clear terminal before creating new session
      if (this.terminal) {
        this.terminal.clear();
      }
      this.ws.send(JSON.stringify({
        type: 'create_session',
        name: `Session ${this.sessions.length + 1}`
      }));
    } else {
      this.connect();
      setTimeout(() => this.createSession(), 1000);
    }
  }

  attachToSession(sessionId) {
    if (this.isConnected()) {
      // Clear terminal when switching sessions
      if (this.terminal && this.currentSessionId !== sessionId) {
        this.terminal.clear();
      }
      this.ws.send(JSON.stringify({ type: 'attach', sessionId }));
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        this.sessionTitle.textContent = session.name;
      }
    }
  }

  killSession(sessionId) {
    if (this.isConnected()) {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      }).then(() => {
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.updateSessionsList();
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
          if (this.sessions.length > 0) {
            this.attachToSession(this.sessions[0].id);
          } else {
            this.showNoSession();
          }
        }
      });
    }
  }

  sendInput(data) {
    if (this.isConnected() && this.currentSessionId) {
      console.log('Sending input:', JSON.stringify(data), 'to session:', this.currentSessionId);
      this.ws.send(JSON.stringify({ type: 'input', data }));
      this.hideSmartPrompt();
    }
  }

  sendCommand() {
    const command = this.commandInput.value;
    if (command && this.currentSessionId) {
      // Add to history
      if (command.trim()) {
        this.addToHistory(command.trim());
      }
      // Track command start time for notifications
      this.trackCommandStart();
      // Send with or without Enter based on autoEnter setting
      this.sendInput(this.autoEnter ? command + '\r' : command);
      this.commandInput.value = '';
    }
  }

  sendResize(cols, rows) {
    if (this.isConnected() && this.currentSessionId) {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  updateSessionsList() {
    this.sessionCount.textContent = this.sessions.length;
    if (this.sessions.length === 0) {
      this.sessionsList.innerHTML = '<p class="no-sessions">No sessions</p>';
      return;
    }
    this.sessionsList.innerHTML = this.sessions.map(session => `
      <div class="session-item ${session.id === this.currentSessionId ? 'active' : ''}" data-id="${session.id}">
        <div class="session-info" onclick="app.attachToSession('${session.id}'); app.toggleSessionsPanel(false);">
          <span class="session-name">${this.escapeHtml(session.name)}</span>
          <span class="session-shell">${session.shell}</span>
        </div>
        <button class="session-kill" onclick="app.killSession('${session.id}')" title="Kill session">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `).join('');
  }

  toggleSessionsPanel(show) {
    if (show) {
      this.sessionsPanel.classList.remove('hidden');
      this.overlay.classList.remove('hidden');
    } else {
      this.sessionsPanel.classList.add('hidden');
      this.overlay.classList.add('hidden');
    }
  }

  showLoginScreen() {
    this.loginScreen.classList.add('active');
    this.appScreen.classList.remove('active');
  }

  showAppScreen() {
    this.loginScreen.classList.remove('active');
    this.appScreen.classList.add('active');

    if (!this.terminal) {
      this.terminal = new TerminalWrapper(this.terminalContainer);
      this.terminal.init();
      this.terminal.onInput = (data) => {
        this.sendInput(data);
      };
      this.terminal.onResize = (cols, rows) => {
        this.sendResize(cols, rows);
      };
    }
    this.updateTTSButton();
    this.updateAutoEnterButton();
    this.updateVoiceButton();
    this.initKeyboardLayout();
    this.initVibeClaudeUI();
    this.initWakeLock();
    this.initSettings();
  }

  showTerminal() {
    console.log('Showing terminal');
    this.terminalContainer.classList.add('active');
    this.terminalContainer.style.display = 'block';
    this.noSession.style.display = 'none';
    if (this.terminal) {
      setTimeout(() => {
        this.terminal.fit();
        this.terminal.focus();
      }, 100);
    }
  }

  showNoSession() {
    console.log('Showing no session');
    this.terminalContainer.classList.remove('active');
    this.terminalContainer.style.display = 'none';
    this.noSession.style.display = 'flex';
    this.sessionTitle.textContent = 'Terminal';
  }

  logout() {
    this.token = null;
    localStorage.removeItem('terminal-remote-token');
    if (this.ws) {
      this.ws.close();
    }
    this.showLoginScreen();
  }

  showLoginError(message) {
    this.loginError.textContent = message;
    this.loginError.classList.remove('hidden');
  }

  hideLoginError() {
    this.loginError.classList.add('hidden');
  }

  updateConnectionStatus(status) {
    const statusText = this.connectionStatus.querySelector('.status-text');
    this.connectionStatus.className = `connection-status ${status}`;

    switch (status) {
      case 'connected':
        statusText.textContent = 'Connected';
        setTimeout(() => {
          this.connectionStatus.classList.add('hidden');
        }, 2000);
        break;
      case 'connecting':
        statusText.textContent = 'Connecting...';
        this.connectionStatus.classList.remove('hidden');
        break;
      case 'disconnected':
        statusText.textContent = 'Disconnected';
        this.connectionStatus.classList.remove('hidden');
        break;
      case 'failed':
        statusText.textContent = 'Connection failed';
        this.connectionStatus.classList.remove('hidden');
        break;
    }
  }

  vibrate() {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== KANBAN INTEGRATION ====================

  toggleKanban() {
    this.kanbanVisible = !this.kanbanVisible;

    if (this.kanbanVisible) {
      this.showKanbanPanel();
    } else {
      this.hideKanbanPanel();
    }

    this.vibrate();
  }

  showKanbanPanel() {
    this.kanbanPanel?.classList.remove('hidden');
    this.splitDivider?.classList.remove('hidden');
    this.mainContent?.classList.add('split-view');
    this.kanbanBtn?.classList.add('active');

    // Set stored URL
    if (this.kanbanUrlInput && this.kanbanUrl) {
      this.kanbanUrlInput.value = this.kanbanUrl;
    }

    // Auto-connect if URL is set and not connected
    if (this.kanbanUrl && !this.kanbanConnected) {
      // Check if we should auto-connect
      const autoConnect = this.getSafeStorage('kanban-auto-connect', 'true') === 'true';
      if (autoConnect) {
        this.connectKanban();
      }
    }

    // Resize terminal after layout change
    this.resizeTerminal();
  }

  hideKanbanPanel() {
    this.kanbanPanel?.classList.add('hidden');
    this.splitDivider?.classList.add('hidden');
    this.mainContent?.classList.remove('split-view');
    this.kanbanBtn?.classList.remove('active');

    // Resize terminal after layout change
    this.resizeTerminal();
  }

  connectKanban() {
    const url = this.kanbanUrlInput?.value?.trim();

    if (!url) {
      this.showVoiceError('Please enter a Kanban URL');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      this.showVoiceError('Invalid URL format');
      return;
    }

    this.kanbanUrl = url;
    this.setSafeStorage('kanban-url', url);
    this.setSafeStorage('kanban-auto-connect', 'true');

    // Show iframe, hide placeholder
    if (this.kanbanIframe) {
      this.kanbanIframe.src = url;
      this.kanbanConnected = true;
    }

    if (this.kanbanPlaceholder) {
      this.kanbanPlaceholder.classList.add('hidden');
    }

    console.log('Connecting to Kanban:', url);
  }

  showKanbanSettings() {
    // Show placeholder to change URL
    this.kanbanConnected = false;

    if (this.kanbanIframe) {
      this.kanbanIframe.src = '';
    }

    if (this.kanbanPlaceholder) {
      this.kanbanPlaceholder.classList.remove('hidden');
    }

    // Focus URL input
    setTimeout(() => {
      this.kanbanUrlInput?.focus();
      this.kanbanUrlInput?.select();
    }, 100);
  }

  refreshKanban() {
    if (this.kanbanIframe && this.kanbanConnected) {
      // Reload iframe
      const currentSrc = this.kanbanIframe.src;
      this.kanbanIframe.src = '';
      setTimeout(() => {
        this.kanbanIframe.src = currentSrc;
      }, 100);
    }
    this.vibrate();
  }

  openKanbanExternal() {
    if (this.kanbanUrl) {
      window.open(this.kanbanUrl, '_blank');
    }
    this.vibrate();
  }

  // Initialize split divider dragging
  initSplitDividerDrag() {
    if (!this.splitDivider) return;

    let isDragging = false;
    let startX, startY;
    let terminalFlex, kanbanFlex;

    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX || e.touches?.[0]?.clientX;
      startY = e.clientY || e.touches?.[0]?.clientY;

      // Get current flex values
      const terminalSide = document.querySelector('.terminal-side');
      const kanbanSide = this.kanbanPanel;

      if (terminalSide && kanbanSide) {
        const rect = this.mainContent.getBoundingClientRect();
        const terminalRect = terminalSide.getBoundingClientRect();

        // Calculate percentages
        const isVertical = window.innerWidth < 768;
        if (isVertical) {
          terminalFlex = terminalRect.height / rect.height;
        } else {
          terminalFlex = terminalRect.width / rect.width;
        }
        kanbanFlex = 1 - terminalFlex;
      }

      document.body.style.cursor = window.innerWidth < 768 ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const clientX = e.clientX || e.touches?.[0]?.clientX;
      const clientY = e.clientY || e.touches?.[0]?.clientY;

      const terminalSide = document.querySelector('.terminal-side');
      const kanbanSide = this.kanbanPanel;
      const rect = this.mainContent.getBoundingClientRect();

      const isVertical = window.innerWidth < 768;

      if (terminalSide && kanbanSide) {
        let newTerminalFlex;

        if (isVertical) {
          newTerminalFlex = (clientY - rect.top) / rect.height;
        } else {
          newTerminalFlex = (clientX - rect.left) / rect.width;
        }

        // Clamp between 20% and 80%
        newTerminalFlex = Math.max(0.2, Math.min(0.8, newTerminalFlex));
        const newKanbanFlex = 1 - newTerminalFlex;

        terminalSide.style.flex = newTerminalFlex;
        kanbanSide.style.flex = newKanbanFlex;

        // Resize terminal
        this.resizeTerminal();
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Mouse events
    this.splitDivider.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Touch events
    this.splitDivider.addEventListener('touchstart', onMouseDown, { passive: true });
    document.addEventListener('touchmove', onMouseMove, { passive: true });
    document.addEventListener('touchend', onMouseUp);
  }

  // ==================== VIBE-CLAUDE INTEGRATION ====================

  toggleVibeClaudeEnabled() {
    this.vibeClaudeEnabled = !this.vibeClaudeEnabled;
    this.setSafeStorage('vibe-claude-enabled', this.vibeClaudeEnabled ? 'true' : 'false');
    this.updateVibeClaudeUI();
    this.vibrate();
  }

  updateVibeClaudeUI() {
    if (this.vibeClaudeEnabled) {
      this.vibeClaudeBar?.classList.remove('hidden');
      this.vibeEnableBtn?.classList.add('active');
      this.vibeEnableBtn.title = 'Disable Vibe-Claude commands';
    } else {
      this.vibeClaudeBar?.classList.add('hidden');
      this.vibeEnableBtn?.classList.remove('active');
      this.vibeEnableBtn.title = 'Enable Vibe-Claude commands';
    }
    // Resize terminal after layout change
    this.resizeTerminal();
  }

  hideVibeClaudeBar() {
    this.vibeClaudeEnabled = false;
    this.setSafeStorage('vibe-claude-enabled', 'false');
    this.updateVibeClaudeUI();
    this.vibrate();
  }

  executeVibeCommand(cmd) {
    if (!this.currentSessionId) {
      this.showVoiceError('No active terminal session');
      return;
    }

    // If command ends with space, put it in input for user to complete
    if (cmd.endsWith(' ')) {
      if (this.commandInput) {
        this.commandInput.value = cmd;
        this.commandInput.focus();
      }
    } else {
      // Execute command directly
      this.sendInput(cmd + '\r');
    }

    this.vibrate();
  }

  // Initialize Vibe-Claude on app start
  initVibeClaudeUI() {
    this.updateVibeClaudeUI();
  }

  // ==================== WAKE LOCK (Keep Screen Active) ====================

  async requestWakeLock() {
    if (!this.wakeLockEnabled) return;

    // Check if Wake Lock API is supported
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activated - screen will stay on');

        // Re-acquire wake lock if released (e.g., when tab becomes visible again)
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake Lock released');
          this.wakeLock = null;
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err.message);
      }
    } else {
      console.log('Wake Lock API not supported in this browser');
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake Lock released');
      } catch (err) {
        console.warn('Wake Lock release failed:', err.message);
      }
    }
  }

  toggleWakeLock() {
    this.wakeLockEnabled = !this.wakeLockEnabled;
    this.setSafeStorage('wake-lock-enabled', this.wakeLockEnabled ? 'true' : 'false');

    if (this.wakeLockEnabled) {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  // Initialize wake lock when app becomes active
  initWakeLock() {
    if (this.wakeLockEnabled) {
      this.requestWakeLock();
    }

    // Re-acquire wake lock when page becomes visible
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.wakeLockEnabled && !this.wakeLock) {
        await this.requestWakeLock();
      }
    });
  }

  // ==================== CLAUDE CODE INTEGRATION ====================

  showClaudeCodeModal() {
    if (this.claudeCodeModal) {
      this.claudeCodeModal.classList.remove('hidden');
      // Reset state
      this.selectedClaudePrompt = null;
      if (this.claudePromptInput) {
        this.claudePromptInput.value = '';
      }
      // Clear all selected states
      document.querySelectorAll('.claude-quick-btn').forEach(btn => {
        btn.classList.remove('selected');
      });
      // Focus textarea
      setTimeout(() => {
        this.claudePromptInput?.focus();
      }, 100);
    }
    this.vibrate();
  }

  hideClaudeCodeModal() {
    if (this.claudeCodeModal) {
      this.claudeCodeModal.classList.add('hidden');
    }
    this.vibrate();
  }

  selectClaudeQuickAction(btn, prompt) {
    // Toggle selection
    const wasSelected = btn.classList.contains('selected');

    // Clear all selected states
    document.querySelectorAll('.claude-quick-btn').forEach(b => {
      b.classList.remove('selected');
    });

    if (!wasSelected) {
      btn.classList.add('selected');
      this.selectedClaudePrompt = prompt;
      // Also put in textarea for editing
      if (this.claudePromptInput) {
        this.claudePromptInput.value = prompt;
      }
    } else {
      this.selectedClaudePrompt = null;
      if (this.claudePromptInput) {
        this.claudePromptInput.value = '';
      }
    }
    this.vibrate();
  }

  startClaudeCode() {
    // Get prompt from textarea or selected quick action
    let prompt = this.claudePromptInput?.value?.trim() || this.selectedClaudePrompt;

    if (!prompt) {
      this.showVoiceError('Please select an action or enter a prompt');
      return;
    }

    // Store the prompt to send after session is ready
    this.pendingClaudePrompt = prompt;

    // If no active session, create one first
    if (!this.currentSessionId) {
      this.hideClaudeCodeModal();
      this.createSession();
      // Wait for session to be ready, then send command
      this.waitForSessionAndRunClaude();
      return;
    }

    // Session exists, send command directly
    this.sendClaudeCommand(prompt);
  }

  waitForSessionAndRunClaude() {
    // Poll for session to be ready
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max

    const checkSession = () => {
      attempts++;
      if (this.currentSessionId && this.pendingClaudePrompt) {
        // Session is ready, send the claude command
        setTimeout(() => {
          this.sendClaudeCommand(this.pendingClaudePrompt);
          this.pendingClaudePrompt = null;
        }, 500); // Small delay to let terminal initialize
      } else if (attempts < maxAttempts) {
        setTimeout(checkSession, 500);
      } else {
        this.showVoiceError('Failed to create session');
        this.pendingClaudePrompt = null;
      }
    };

    checkSession();
  }

  sendClaudeCommand(prompt) {
    // Build the claude command
    const claudeCommand = `claude "${prompt.replace(/"/g, '\\"')}"`;

    // Send to terminal
    this.sendInput(claudeCommand + '\r');

    // Hide modal if still open
    this.hideClaudeCodeModal();

    // Focus terminal
    if (this.terminal) {
      this.terminal.focus();
    }
  }

  // ==================== SNIPPETS/QUICK COMMANDS ====================

  showSnippetsModal() {
    if (this.snippetsModal) {
      this.snippetsModal.classList.remove('hidden');
      this.renderSnippets();
      setTimeout(() => this.snippetsSearchInput?.focus(), 100);
    }
    this.vibrate();
  }

  hideSnippetsModal() {
    if (this.snippetsModal) {
      this.snippetsModal.classList.add('hidden');
    }
  }

  switchSnippetTab(tab) {
    this.currentSnippetTab = tab;
    document.querySelectorAll('.snippet-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    this.renderSnippets();
    this.vibrate();
  }

  renderSnippets() {
    if (!this.snippetsList) return;

    let snippets = [];
    const searchTerm = this.snippetsSearchInput?.value?.toLowerCase() || '';

    switch (this.currentSnippetTab) {
      case 'favorites':
        snippets = this.favoriteCommands.map(cmd => ({ cmd, desc: 'Favorite', fav: true }));
        break;
      case 'history':
        snippets = this.commandHistory.slice(-20).reverse().map(cmd => ({ cmd, desc: 'Recent' }));
        break;
      case 'git':
      case 'npm':
      case 'system':
        snippets = this.defaultSnippets[this.currentSnippetTab] || [];
        break;
    }

    // Filter by search
    if (searchTerm) {
      snippets = snippets.filter(s =>
        s.cmd.toLowerCase().includes(searchTerm) ||
        s.desc.toLowerCase().includes(searchTerm)
      );
    }

    if (snippets.length === 0) {
      this.snippetsList.innerHTML = '<p class="no-snippets">No commands found</p>';
      return;
    }

    this.snippetsList.innerHTML = snippets.map((s, i) => `
      <div class="snippet-item" data-cmd="${this.escapeHtml(s.cmd)}">
        <div class="snippet-info">
          <code class="snippet-cmd">${this.escapeHtml(s.cmd)}</code>
          <span class="snippet-desc">${this.escapeHtml(s.desc)}</span>
        </div>
        <div class="snippet-actions">
          <button class="snippet-fav-btn ${s.fav ? 'active' : ''}" data-fav="${this.escapeHtml(s.cmd)}" title="Favorite">
            ${s.fav ? '★' : '☆'}
          </button>
          <button class="snippet-run-btn" data-run="${this.escapeHtml(s.cmd)}" title="Run">▶</button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    this.snippetsList.querySelectorAll('.snippet-run-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.runSnippet(btn.dataset.run);
      });
    });

    this.snippetsList.querySelectorAll('.snippet-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.fav);
      });
    });

    this.snippetsList.querySelectorAll('.snippet-item').forEach(item => {
      item.addEventListener('click', () => {
        this.runSnippet(item.dataset.cmd);
      });
    });
  }

  filterSnippets() {
    this.renderSnippets();
  }

  runSnippet(cmd) {
    if (!cmd) return;

    // Add to history
    this.addToHistory(cmd);

    // Check if command needs cursor positioning (ends with space or has "")
    if (cmd.endsWith(' ') || cmd.includes('""')) {
      // Put in input for user to complete
      if (this.commandInput) {
        this.commandInput.value = cmd.replace('""', '');
        this.commandInput.focus();
        // Position cursor before closing quote if applicable
        const quotePos = cmd.indexOf('""');
        if (quotePos > -1) {
          this.commandInput.setSelectionRange(quotePos + 1, quotePos + 1);
        }
      }
    } else {
      // Run directly
      this.sendInput(cmd + '\r');
    }

    this.hideSnippetsModal();
    this.vibrate();
  }

  toggleFavorite(cmd) {
    const index = this.favoriteCommands.indexOf(cmd);
    if (index > -1) {
      this.favoriteCommands.splice(index, 1);
    } else {
      this.favoriteCommands.push(cmd);
    }
    this.setSafeStorage('favorite-commands', JSON.stringify(this.favoriteCommands));
    this.renderSnippets();
    this.vibrate();
  }

  addCustomSnippet() {
    const cmd = this.snippetNewInput?.value?.trim();
    if (!cmd) return;

    if (!this.favoriteCommands.includes(cmd)) {
      this.favoriteCommands.push(cmd);
      this.setSafeStorage('favorite-commands', JSON.stringify(this.favoriteCommands));
    }

    this.snippetNewInput.value = '';
    this.switchSnippetTab('favorites');
    this.vibrate();
  }

  addToHistory(cmd) {
    // Remove duplicates
    this.commandHistory = this.commandHistory.filter(c => c !== cmd);
    this.commandHistory.push(cmd);
    // Keep last 50
    if (this.commandHistory.length > 50) {
      this.commandHistory = this.commandHistory.slice(-50);
    }
    this.setSafeStorage('command-history', JSON.stringify(this.commandHistory));
  }

  // ==================== SETTINGS ====================

  showSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.remove('hidden');
      this.updateSettingsUI();
    }
    this.vibrate();
  }

  hideSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.add('hidden');
    }
  }

  updateSettingsUI() {
    // Font size
    if (this.fontSizeDisplay) {
      this.fontSizeDisplay.textContent = `${this.fontSize}px`;
    }

    // Theme
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
    });

    // Toggles
    this.notifyToggle?.classList.toggle('active', this.notifyEnabled);
    this.soundToggle?.classList.toggle('active', this.soundEnabled);
    this.hapticToggle?.classList.toggle('active', this.hapticEnabled);
  }

  changeFontSize(delta) {
    this.fontSize = Math.max(10, Math.min(24, this.fontSize + delta));
    this.setSafeStorage('font-size', this.fontSize.toString());
    this.updateSettingsUI();
    this.applyFontSize();
    this.vibrate();
  }

  applyFontSize() {
    if (this.terminal && this.terminal.term) {
      this.terminal.term.options.fontSize = this.fontSize;
      this.terminal.fit();
    }
  }

  setTheme(themeName) {
    this.currentTheme = themeName;
    this.setSafeStorage('terminal-theme', themeName);
    this.applyTheme();
    this.updateSettingsUI();
    this.vibrate();
  }

  applyTheme() {
    if (!this.terminal || !this.terminal.term) return;

    const themes = {
      dark: {
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
      },
      light: {
        background: '#ffffff',
        foreground: '#24292f',
        cursor: '#0969da',
        cursorAccent: '#ffffff',
        selection: 'rgba(9, 105, 218, 0.2)',
        black: '#24292f',
        red: '#cf222e',
        green: '#1a7f37',
        yellow: '#9a6700',
        blue: '#0969da',
        magenta: '#8250df',
        cyan: '#1b7c83',
        white: '#6e7781',
        brightBlack: '#57606a',
        brightRed: '#a40e26',
        brightGreen: '#2da44e',
        brightYellow: '#bf8700',
        brightBlue: '#218bff',
        brightMagenta: '#a475f9',
        brightCyan: '#3192aa',
        brightWhite: '#8c959f'
      },
      monokai: {
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f0',
        cursorAccent: '#272822',
        selection: 'rgba(73, 72, 62, 0.8)',
        black: '#272822',
        red: '#f92672',
        green: '#a6e22e',
        yellow: '#f4bf75',
        blue: '#66d9ef',
        magenta: '#ae81ff',
        cyan: '#a1efe4',
        white: '#f8f8f2',
        brightBlack: '#75715e',
        brightRed: '#f92672',
        brightGreen: '#a6e22e',
        brightYellow: '#f4bf75',
        brightBlue: '#66d9ef',
        brightMagenta: '#ae81ff',
        brightCyan: '#a1efe4',
        brightWhite: '#f9f8f5'
      },
      dracula: {
        background: '#282a36',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        cursorAccent: '#282a36',
        selection: 'rgba(68, 71, 90, 0.8)',
        black: '#21222c',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff'
      }
    };

    const theme = themes[this.currentTheme] || themes.dark;
    this.terminal.term.options.theme = theme;
  }

  toggleSetting(setting) {
    switch (setting) {
      case 'notify':
        this.notifyEnabled = !this.notifyEnabled;
        this.setSafeStorage('notify-enabled', this.notifyEnabled.toString());
        if (this.notifyEnabled) {
          this.requestNotificationPermission();
        }
        break;
      case 'sound':
        this.soundEnabled = !this.soundEnabled;
        this.setSafeStorage('sound-enabled', this.soundEnabled.toString());
        break;
      case 'haptic':
        this.hapticEnabled = !this.hapticEnabled;
        this.setSafeStorage('haptic-enabled', this.hapticEnabled.toString());
        break;
    }
    this.updateSettingsUI();
    this.vibrate();
  }

  // ==================== NOTIFICATIONS ====================

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  sendNotification(title, body) {
    if (!this.notifyEnabled) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'couchcode-notification',
        renotify: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }

  // Track command start time
  trackCommandStart() {
    this.commandStartTime = Date.now();
  }

  // Check if command was long-running and notify
  checkLongCommand() {
    if (!this.commandStartTime) return;

    const duration = Date.now() - this.commandStartTime;
    if (duration > this.longCommandThreshold) {
      this.sendNotification('Command Complete', `Your command finished after ${Math.round(duration / 1000)}s`);
    }
    this.commandStartTime = null;
  }

  // Override vibrate to respect settings
  vibrate() {
    if (this.hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  // Initialize settings on app start
  initSettings() {
    this.applyFontSize();
    this.applyTheme();
    if (this.notifyEnabled) {
      this.requestNotificationPermission();
    }
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new TerminalRemoteApp();
});
