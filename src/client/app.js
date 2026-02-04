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
    this.aiResult = document.getElementById('ai-result');
    this.aiCommand = document.getElementById('ai-command');
    this.aiUseBtn = document.getElementById('ai-use-btn');
    this.commandTabs = document.querySelectorAll('.command-tab');

    // Settings
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsCloseBtn = document.getElementById('settings-close-btn');
    this.fontDecrease = document.getElementById('font-decrease');
    this.fontIncrease = document.getElementById('font-increase');
    this.fontSizeDisplay = document.getElementById('font-size-display');
    this.themeSelector = document.getElementById('theme-selector');
    this.ttsToggle = document.getElementById('tts-toggle');
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

    // Smart snippets - 150+ commands organized by category
    this.smartSnippets = [
      // GIT
      { name: 'Git Status', description: 'Show working tree status', command: 'git status', category: 'git', icon: '📊' },
      { name: 'Git Diff', description: 'Show changes not yet staged', command: 'git diff', category: 'git', icon: '📝' },
      { name: 'Git Log', description: 'Show commit history', command: 'git log --oneline -10', category: 'git', icon: '📜' },
      { name: 'Git Branch', description: 'List all branches', command: 'git branch -a', category: 'git', icon: '🌿' },
      { name: 'Git New Branch', description: 'Create and switch to new branch', command: 'git checkout -b feature/', category: 'git', icon: '🌱' },
      { name: 'Git Pull', description: 'Pull latest changes', command: 'git pull', category: 'git', icon: '⬇️' },
      { name: 'Git Push', description: 'Push commits to remote', command: 'git push', category: 'git', icon: '⬆️' },
      { name: 'Git Stash', description: 'Stash current changes', command: 'git stash', category: 'git', icon: '📦' },
      { name: 'Git Stash Pop', description: 'Apply and remove stash', command: 'git stash pop', category: 'git', icon: '📤' },
      { name: 'Git Add All', description: 'Stage all changes', command: 'git add .', category: 'git', icon: '➕' },
      { name: 'Git Commit', description: 'Commit with message', command: 'git commit -m ""', category: 'git', icon: '✅' },
      { name: 'Git Reset', description: 'Unstage all changes', command: 'git reset HEAD', category: 'git', icon: '🔄' },
      { name: 'Git Fetch', description: 'Fetch from remote', command: 'git fetch --all', category: 'git', icon: '📥' },
      { name: 'Git Merge', description: 'Merge branch', command: 'git merge ', category: 'git', icon: '🔀' },
      { name: 'Git Cherry Pick', description: 'Apply specific commit', command: 'git cherry-pick ', category: 'git', icon: '🍒' },
      // FILES
      { name: 'List Files', description: 'List all files including hidden', command: 'ls -la', category: 'files', icon: '📁' },
      { name: 'List Tree', description: 'Show directory tree', command: 'tree -L 2', category: 'files', icon: '🌲' },
      { name: 'Find Files', description: 'Find files by name', command: 'find . -name "*.js" -type f', category: 'files', icon: '🔍' },
      { name: 'Search Content', description: 'Search text in files', command: 'grep -rn "" .', category: 'files', icon: '🔎' },
      { name: 'File Size', description: 'Show file sizes', command: 'du -sh *', category: 'files', icon: '📏' },
      { name: 'Create Directory', description: 'Create a new directory', command: 'mkdir -p ', category: 'files', icon: '📂' },
      { name: 'Create File', description: 'Create empty file', command: 'touch ', category: 'files', icon: '📄' },
      { name: 'Copy Files', description: 'Copy files', command: 'cp -r ', category: 'files', icon: '📋' },
      { name: 'Move Files', description: 'Move or rename files', command: 'mv ', category: 'files', icon: '➡️' },
      { name: 'Remove Files', description: 'Remove files', command: 'rm -i ', category: 'files', icon: '🗑️' },
      { name: 'Compress', description: 'Create tar.gz archive', command: 'tar -czvf archive.tar.gz ', category: 'files', icon: '📦' },
      { name: 'Extract', description: 'Extract archive', command: 'tar -xzvf ', category: 'files', icon: '📂' },
      { name: 'Watch File', description: 'Monitor file changes', command: 'tail -f ', category: 'files', icon: '👁️' },
      // NPM
      { name: 'NPM Install', description: 'Install dependencies', command: 'npm install', category: 'npm', icon: '📦' },
      { name: 'NPM Install Pkg', description: 'Install specific package', command: 'npm install ', category: 'npm', icon: '➕' },
      { name: 'NPM Install Dev', description: 'Install as dev dependency', command: 'npm install -D ', category: 'npm', icon: '🔧' },
      { name: 'NPM Start', description: 'Run start script', command: 'npm start', category: 'npm', icon: '▶️' },
      { name: 'NPM Run Dev', description: 'Run development server', command: 'npm run dev', category: 'npm', icon: '🔧' },
      { name: 'NPM Run Build', description: 'Build project', command: 'npm run build', category: 'npm', icon: '🔨' },
      { name: 'NPM Test', description: 'Run tests', command: 'npm test', category: 'npm', icon: '🧪' },
      { name: 'NPM Outdated', description: 'Check outdated packages', command: 'npm outdated', category: 'npm', icon: '📋' },
      { name: 'NPM Audit', description: 'Security audit', command: 'npm audit', category: 'npm', icon: '🔒' },
      { name: 'NPM List', description: 'List installed packages', command: 'npm list --depth=0', category: 'npm', icon: '📋' },
      { name: 'Node Version', description: 'Check Node.js version', command: 'node -v && npm -v', category: 'npm', icon: '📦' },
      { name: 'NPX Create Vite', description: 'Create Vite project', command: 'npm create vite@latest', category: 'npm', icon: '⚡' },
      // DOCKER
      { name: 'Docker PS', description: 'List running containers', command: 'docker ps', category: 'docker', icon: '🐳' },
      { name: 'Docker PS All', description: 'List all containers', command: 'docker ps -a', category: 'docker', icon: '🐳' },
      { name: 'Docker Images', description: 'List Docker images', command: 'docker images', category: 'docker', icon: '📦' },
      { name: 'Docker Logs', description: 'Show container logs', command: 'docker logs -f ', category: 'docker', icon: '📜' },
      { name: 'Docker Compose Up', description: 'Start services', command: 'docker-compose up -d', category: 'docker', icon: '🚀' },
      { name: 'Docker Compose Down', description: 'Stop services', command: 'docker-compose down', category: 'docker', icon: '🛑' },
      { name: 'Docker Stop All', description: 'Stop all containers', command: 'docker stop $(docker ps -q)', category: 'docker', icon: '🛑' },
      { name: 'Docker Prune', description: 'Clean up resources', command: 'docker system prune -a', category: 'docker', icon: '🧹' },
      { name: 'Docker Exec', description: 'Execute in container', command: 'docker exec -it  bash', category: 'docker', icon: '⚡' },
      { name: 'Docker Build', description: 'Build image', command: 'docker build -t  .', category: 'docker', icon: '🔨' },
      { name: 'Docker Run', description: 'Run container', command: 'docker run -it --rm ', category: 'docker', icon: '▶️' },
      { name: 'Docker Stats', description: 'Show container stats', command: 'docker stats', category: 'docker', icon: '📊' },
      // SYSTEM
      { name: 'Disk Usage', description: 'Show disk space usage', command: 'df -h', category: 'system', icon: '💾' },
      { name: 'Memory Usage', description: 'Show memory info', command: 'free -h 2>/dev/null || vm_stat', category: 'system', icon: '🧠' },
      { name: 'Process List', description: 'List all processes', command: 'ps aux | head -20', category: 'system', icon: '📋' },
      { name: 'Find Process', description: 'Find process by name', command: 'ps aux | grep ', category: 'system', icon: '🔍' },
      { name: 'Kill Process', description: 'Kill process by PID', command: 'kill -9 ', category: 'system', icon: '💀' },
      { name: 'System Info', description: 'Show system information', command: 'uname -a', category: 'system', icon: '💻' },
      { name: 'Environment', description: 'Show environment variables', command: 'env | sort', category: 'system', icon: '⚙️' },
      { name: 'Path Variable', description: 'Show PATH', command: 'echo $PATH | tr ":" "\\n"', category: 'system', icon: '🛤️' },
      { name: 'Uptime', description: 'Show system uptime', command: 'uptime', category: 'system', icon: '⏱️' },
      { name: 'History', description: 'Show command history', command: 'history | tail -30', category: 'system', icon: '📜' },
      { name: 'Clear Screen', description: 'Clear terminal', command: 'clear', category: 'system', icon: '🧹' },
      // NETWORK
      { name: 'IP Address', description: 'Show local IP', command: 'ifconfig 2>/dev/null || ip addr', category: 'network', icon: '🌐' },
      { name: 'Public IP', description: 'Show public IP', command: 'curl -s ifconfig.me', category: 'network', icon: '🌍' },
      { name: 'Ping Test', description: 'Test connectivity', command: 'ping -c 4 google.com', category: 'network', icon: '📡' },
      { name: 'Port Check', description: 'Check listening ports', command: 'netstat -tuln 2>/dev/null || ss -tuln', category: 'network', icon: '🔌' },
      { name: 'DNS Lookup', description: 'Lookup DNS records', command: 'nslookup ', category: 'network', icon: '🔎' },
      { name: 'Curl GET', description: 'Make GET request', command: 'curl -X GET ', category: 'network', icon: '🌍' },
      { name: 'Curl POST', description: 'Make POST request', command: 'curl -X POST -H "Content-Type: application/json" -d \'{}\' ', category: 'network', icon: '📤' },
      { name: 'Download', description: 'Download file', command: 'curl -O ', category: 'network', icon: '⬇️' },
      { name: 'SSH Connect', description: 'Connect via SSH', command: 'ssh user@', category: 'network', icon: '🔐' },
      { name: 'SSH Key Gen', description: 'Generate SSH key', command: 'ssh-keygen -t ed25519 -C ""', category: 'network', icon: '🔑' },
      // PYTHON
      { name: 'Python Version', description: 'Check Python version', command: 'python3 --version', category: 'python', icon: '🐍' },
      { name: 'Pip Install', description: 'Install package', command: 'pip3 install ', category: 'python', icon: '📦' },
      { name: 'Pip Install Req', description: 'Install from requirements', command: 'pip3 install -r requirements.txt', category: 'python', icon: '📋' },
      { name: 'Pip Freeze', description: 'Export requirements', command: 'pip3 freeze > requirements.txt', category: 'python', icon: '❄️' },
      { name: 'Create Venv', description: 'Create virtual environment', command: 'python3 -m venv venv', category: 'python', icon: '🔧' },
      { name: 'Activate Venv', description: 'Activate virtual env', command: 'source venv/bin/activate', category: 'python', icon: '▶️' },
      { name: 'Python Run', description: 'Run Python script', command: 'python3 ', category: 'python', icon: '▶️' },
      { name: 'Pytest', description: 'Run pytest tests', command: 'pytest', category: 'python', icon: '🧪' },
      { name: 'Django Server', description: 'Run Django server', command: 'python manage.py runserver', category: 'python', icon: '🌐' },
      { name: 'Flask Run', description: 'Run Flask app', command: 'flask run', category: 'python', icon: '🌐' },
      // KUBERNETES
      { name: 'K8s Get Pods', description: 'List all pods', command: 'kubectl get pods', category: 'k8s', icon: '☸️' },
      { name: 'K8s Get All', description: 'List all resources', command: 'kubectl get all', category: 'k8s', icon: '☸️' },
      { name: 'K8s Get Services', description: 'List services', command: 'kubectl get services', category: 'k8s', icon: '🔗' },
      { name: 'K8s Logs', description: 'View pod logs', command: 'kubectl logs -f ', category: 'k8s', icon: '📜' },
      { name: 'K8s Exec', description: 'Execute in pod', command: 'kubectl exec -it  -- /bin/bash', category: 'k8s', icon: '⚡' },
      { name: 'K8s Apply', description: 'Apply configuration', command: 'kubectl apply -f ', category: 'k8s', icon: '✅' },
      { name: 'K8s Describe', description: 'Describe pod', command: 'kubectl describe pod ', category: 'k8s', icon: '🔍' },
      { name: 'K8s Scale', description: 'Scale deployment', command: 'kubectl scale deployment/ --replicas=', category: 'k8s', icon: '📈' },
      { name: 'K8s Port Forward', description: 'Forward local port', command: 'kubectl port-forward  8080:80', category: 'k8s', icon: '🔌' },
      // DATABASE
      { name: 'MySQL Connect', description: 'Connect to MySQL', command: 'mysql -u root -p', category: 'database', icon: '🐬' },
      { name: 'PostgreSQL Connect', description: 'Connect to PostgreSQL', command: 'psql -U postgres', category: 'database', icon: '🐘' },
      { name: 'MongoDB Shell', description: 'Start MongoDB shell', command: 'mongosh', category: 'database', icon: '🍃' },
      { name: 'Redis CLI', description: 'Connect to Redis', command: 'redis-cli', category: 'database', icon: '🔴' },
      { name: 'SQLite Open', description: 'Open SQLite database', command: 'sqlite3 ', category: 'database', icon: '💾' },
      { name: 'MySQL Dump', description: 'Export MySQL database', command: 'mysqldump -u root -p  > backup.sql', category: 'database', icon: '💾' },
      { name: 'PG Dump', description: 'Export PostgreSQL database', command: 'pg_dump -U postgres  > backup.sql', category: 'database', icon: '💾' },
    ];

    // Natural language to command mapping
    this.nlToCommand = {
      'list': 'ls -la', 'list files': 'ls -la', 'show files': 'ls -la',
      'find': 'find . -name', 'search files': 'find . -name',
      'disk usage': 'du -sh *', 'disk space': 'df -h',
      'create folder': 'mkdir -p', 'new folder': 'mkdir -p',
      'git status': 'git status', 'check git': 'git status',
      'git changes': 'git diff', 'show changes': 'git diff',
      'git history': 'git log --oneline -10', 'commit history': 'git log --oneline -10',
      'git branches': 'git branch -a', 'list branches': 'git branch -a',
      'create branch': 'git checkout -b', 'new branch': 'git checkout -b',
      'git pull': 'git pull', 'pull changes': 'git pull',
      'git push': 'git push', 'push changes': 'git push',
      'stage all': 'git add .', 'add all': 'git add .',
      'system info': 'uname -a', 'memory': 'free -h 2>/dev/null || vm_stat',
      'processes': 'ps aux | head -20', 'uptime': 'uptime',
      'ip address': 'ifconfig 2>/dev/null || ip addr', 'my ip': 'ifconfig',
      'ping': 'ping -c 4', 'test connection': 'ping -c 4 google.com',
      'docker containers': 'docker ps -a', 'running containers': 'docker ps',
      'docker images': 'docker images', 'docker up': 'docker-compose up -d',
      'docker down': 'docker-compose down', 'clear': 'clear', 'history': 'history | tail -20',
    };

    this.currentSnippetCategory = 'all';
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

    // Auto-enter button - enhanced for Chrome & Safari compatibility
    if (this.autoEnterBtn) {
      this.setupAutoEnterButton();
    }

    // Handle visibility change for reconnection (debounced)
    let lastVisibilityChange = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Debounce: ignore if less than 1 second since last change
        if (now - lastVisibilityChange < 1000) {
          return;
        }
        lastVisibilityChange = now;

        if (!this.isConnected()) {
          // WebSocket disconnected, reconnect
          this.connect();
        } else if (this.authenticated && this.currentSessionId) {
          // Still connected but was in background, re-attach to ensure session is active
          console.log('App visible again, re-attaching to session:', this.currentSessionId);
          this.attachToSession(this.currentSessionId);
        }
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

    // Command Center modal events
    this.snippetsBtn?.addEventListener('click', () => this.showSnippetsModal());
    this.snippetsCloseBtn?.addEventListener('click', () => this.hideSnippetsModal());
    this.snippetsModal?.addEventListener('click', (e) => {
      if (e.target === this.snippetsModal) this.hideSnippetsModal();
    });
    this.snippetsSearchInput?.addEventListener('input', () => this.filterSnippets());

    // AI Use button
    this.aiUseBtn?.addEventListener('click', () => {
      if (this.aiCommand?.textContent) {
        this.runSnippet(this.aiCommand.textContent);
      }
    });

    // Command Center category tabs
    document.querySelectorAll('.command-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchSnippetCategory(tab.dataset.category));
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
    this.ttsToggle?.addEventListener('click', () => this.toggleSetting('tts'));
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

  // Setup auto-enter button with cross-browser support
  setupAutoEnterButton() {
    const btn = this.autoEnterBtn;
    if (!btn) return;

    let isPressed = false;
    let touchStartTime = 0;

    // Prevent context menu on long press
    btn.addEventListener('contextmenu', (e) => e.preventDefault());

    // Handle touch start - for visual feedback
    btn.addEventListener('touchstart', (e) => {
      isPressed = true;
      touchStartTime = Date.now();
      btn.classList.add('pressing');
    }, { passive: true });

    // Handle touch end - main action for mobile
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isPressed) {
        const touchDuration = Date.now() - touchStartTime;
        // Only trigger if it was a quick tap (not a long press)
        if (touchDuration < 500) {
          this.toggleAutoEnter();
        }
      }

      isPressed = false;
      btn.classList.remove('pressing');
    }, { passive: false });

    // Handle touch cancel
    btn.addEventListener('touchcancel', () => {
      isPressed = false;
      btn.classList.remove('pressing');
    }, { passive: true });

    // Handle pointer events (works for mouse & touch on modern browsers)
    if (window.PointerEvent) {
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') {
          isPressed = true;
          btn.classList.add('pressing');
        }
      });

      btn.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse' && isPressed) {
          this.toggleAutoEnter();
        }
        isPressed = false;
        btn.classList.remove('pressing');
      });
    } else {
      // Fallback for older browsers - use click
      btn.addEventListener('click', (e) => {
        // Only handle if not from touch (touch already handled above)
        if (!e.sourceCapabilities?.firesTouchEvents) {
          this.toggleAutoEnter();
        }
      });
    }

    // Keyboard accessibility
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleAutoEnter();
      }
    });
  }

  toggleAutoEnter() {
    this.autoEnter = !this.autoEnter;
    this.setSafeStorage('auto-enter', this.autoEnter ? 'true' : 'false');
    this.updateAutoEnterButton();
    // Vibrate for feedback
    this.vibrate();
    // Visual flash feedback
    this.autoEnterBtn?.classList.add('toggled');
    setTimeout(() => this.autoEnterBtn?.classList.remove('toggled'), 200);
    console.log('Auto-enter toggled:', this.autoEnter);
  }

  updateAutoEnterButton() {
    if (this.autoEnterBtn) {
      if (this.autoEnter) {
        this.autoEnterBtn.classList.add('active');
        this.autoEnterBtn.setAttribute('aria-pressed', 'true');
        this.autoEnterBtn.title = 'Auto-enter ON - tap to turn OFF';
      } else {
        this.autoEnterBtn.classList.remove('active');
        this.autoEnterBtn.setAttribute('aria-pressed', 'false');
        this.autoEnterBtn.title = 'Auto-enter OFF - tap to turn ON';
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

    // Clear existing content safely
    this.smartPromptBar.textContent = '';

    switch (type) {
      case 'yesno':
        this.smartPromptBar.appendChild(this.createSmartButton('yes', '✓', 'Yes'));
        this.smartPromptBar.appendChild(this.createSmartButton('no', '✗', 'No'));
        this.smartPromptBar.appendChild(this.createSmartButton('enter', '↵', 'Enter'));
        break;
      case 'enter':
        this.smartPromptBar.appendChild(this.createSmartButton('enter', '↵', 'Press Enter'));
        break;
      case 'password':
        const label = document.createElement('span');
        label.className = 'prompt-label';
        label.textContent = 'Password required - type in input box';
        this.smartPromptBar.appendChild(label);
        break;
    }
    this.smartPromptBar.classList.add('visible');
    this.vibrate();
  }

  createSmartButton(action, icon, text) {
    const btn = document.createElement('button');
    btn.className = `smart-btn ${action}`;
    btn.dataset.action = action;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'btn-icon';
    iconSpan.textContent = icon;

    btn.appendChild(iconSpan);
    btn.appendChild(document.createTextNode(' ' + text));

    btn.addEventListener('click', () => {
      this.handleAction(action);
      this.hideSmartPrompt();
    });

    return btn;
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
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
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
        if (this.sessions.length > 0) {
          if (!this.currentSessionId) {
            this.attachToSession(this.sessions[0].id);
          } else if (!this.sessions.some(s => s.id === this.currentSessionId)) {
            // Current session was deleted, switch to first available
            console.log('Current session deleted, switching to:', this.sessions[0].id);
            this.currentSessionId = null;
            this.attachToSession(this.sessions[0].id);
          }
        } else if (this.currentSessionId) {
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

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Token expired or invalid, logging out');
          this.logout();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse sessions response:', parseError);
        return;
      }
      console.log('Sessions loaded:', data);
      this.sessions = data.sessions || [];
      this.updateSessionsList();

      if (this.sessions.length > 0) {
        // Check if we have a current session that still exists
        const currentSessionExists = this.currentSessionId &&
          this.sessions.some(s => s.id === this.currentSessionId);

        if (currentSessionExists) {
          // Re-attach to current session after reconnection
          console.log('Re-attaching to current session:', this.currentSessionId);
          this.attachToSession(this.currentSessionId);
        } else if (!this.currentSessionId) {
          // No current session, attach to first available
          console.log('Attaching to first session:', this.sessions[0].id);
          this.attachToSession(this.sessions[0].id);
        } else {
          // Current session no longer exists, attach to first available
          console.log('Current session no longer exists, attaching to:', this.sessions[0].id);
          this.currentSessionId = null;
          this.attachToSession(this.sessions[0].id);
        }
      } else {
        console.log('No sessions found');
        this.currentSessionId = null;
        this.showNoSession();
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  startSessionPolling() {
    // Guard against duplicate polling intervals
    if (this.sessionPollInterval) {
      console.log('Session polling already active');
      return;
    }
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
    // Validate connection state
    if (!this.isConnected() || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('sendInput: WebSocket not open, attempting reconnect');
      this.connect();
      return false;
    }
    if (!this.currentSessionId) {
      console.warn('sendInput: no session attached, attempting to load sessions');
      this.loadSessions();
      return false;
    }
    if (!this.authenticated) {
      console.warn('sendInput: not authenticated');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ type: 'input', data }));
      this.hideSmartPrompt();
      return true;
    } catch (error) {
      console.error('sendInput error:', error);
      return false;
    }
  }

  sendCommand() {
    const command = this.commandInput.value;
    if (!command) return;

    // Check if we can send
    if (!this.isConnected()) {
      console.warn('Cannot send command: not connected');
      // Try to reconnect
      this.connect();
      return;
    }

    if (!this.currentSessionId) {
      console.warn('Cannot send command: no session attached');
      // Try to load sessions and attach
      this.loadSessions();
      return;
    }

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

  sendResize(cols, rows) {
    if (this.isConnected() && this.currentSessionId) {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }

  updateSessionsList() {
    this.sessionCount.textContent = this.sessions.length;

    // Clear existing content safely
    this.sessionsList.textContent = '';

    if (this.sessions.length === 0) {
      const noSessions = document.createElement('p');
      noSessions.className = 'no-sessions';
      noSessions.textContent = 'No sessions';
      this.sessionsList.appendChild(noSessions);
      return;
    }

    this.sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = `session-item ${session.id === this.currentSessionId ? 'active' : ''}`;
      item.dataset.id = session.id;

      const info = document.createElement('div');
      info.className = 'session-info';

      const name = document.createElement('span');
      name.className = 'session-name';
      name.textContent = session.name;

      const shell = document.createElement('span');
      shell.className = 'session-shell';
      shell.textContent = session.shell;

      info.appendChild(name);
      info.appendChild(shell);

      // Use event delegation via dataset
      info.addEventListener('click', () => {
        this.attachToSession(session.id);
        this.toggleSessionsPanel(false);
      });

      const killBtn = document.createElement('button');
      killBtn.className = 'session-kill';
      killBtn.title = 'Kill session';
      killBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
      killBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.killSession(session.id);
      });

      item.appendChild(info);
      item.appendChild(killBtn);
      this.sessionsList.appendChild(item);
    });
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
    // Clear sensitive data
    this.token = null;
    this.authenticated = false;
    this.currentSessionId = null;
    this.sessions = [];

    // Remove token from storage
    localStorage.removeItem('terminal-remote-token');

    // Stop polling
    this.stopSessionPolling();

    // Close WebSocket connection
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      this.ws = null;
    }

    // Clear terminal
    if (this.terminal) {
      this.terminal.clear();
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

    // Handle special escape sequences
    if (cmd.includes('\\x')) {
      // Convert escape sequences like \x03 to actual characters
      const parsed = cmd.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
      this.sendInput(parsed);
      this.vibrate();
      return;
    }

    // Handle commands with \r (already includes enter)
    if (cmd.includes('\\r')) {
      const parsed = cmd.replace(/\\r/g, '\r');
      this.sendInput(parsed);
      this.vibrate();
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
      if (this.snippetsSearchInput) {
        this.snippetsSearchInput.value = '';
      }
      if (this.aiResult) {
        this.aiResult.classList.add('hidden');
      }
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

  switchSnippetCategory(category) {
    this.currentSnippetCategory = category;
    document.querySelectorAll('.command-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.category === category);
    });
    this.renderSnippets();
    this.vibrate();
  }

  renderSnippets() {
    if (!this.snippetsList) return;

    const searchTerm = this.snippetsSearchInput?.value?.toLowerCase() || '';
    let filtered = this.smartSnippets;

    // Filter by category
    if (this.currentSnippetCategory !== 'all') {
      filtered = filtered.filter(s => s.category === this.currentSnippetCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm) ||
        s.description.toLowerCase().includes(searchTerm) ||
        s.command.toLowerCase().includes(searchTerm)
      );

      // Also check for AI suggestion
      this.checkAISuggestion(searchTerm);
    } else {
      if (this.aiResult) {
        this.aiResult.classList.add('hidden');
      }
    }

    if (filtered.length === 0) {
      this.snippetsList.innerHTML = '<p class="no-snippets">No commands found. Try a different search term.</p>';
      return;
    }

    this.snippetsList.innerHTML = filtered.map(s => `
      <div class="snippet-item" data-cmd="${this.escapeHtml(s.command)}">
        <div class="snippet-icon">${s.icon || '📋'}</div>
        <div class="snippet-info">
          <span class="snippet-name">${this.escapeHtml(s.name)}</span>
          <code class="snippet-cmd">${this.escapeHtml(s.command)}</code>
          <span class="snippet-desc">${this.escapeHtml(s.description)}</span>
        </div>
        <button class="snippet-run-btn" data-run="${this.escapeHtml(s.command)}" title="Run">▶</button>
      </div>
    `).join('');

    // Add event listeners
    this.snippetsList.querySelectorAll('.snippet-run-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.runSnippet(btn.dataset.run);
      });
    });

    this.snippetsList.querySelectorAll('.snippet-item').forEach(item => {
      item.addEventListener('click', () => {
        this.runSnippet(item.dataset.cmd);
      });
    });
  }

  checkAISuggestion(searchTerm) {
    if (!this.aiResult || !this.aiCommand) return;

    // Check for natural language match
    const normalizedSearch = searchTerm.toLowerCase().trim();
    let suggestion = null;

    // Check direct matches first
    if (this.nlToCommand[normalizedSearch]) {
      suggestion = this.nlToCommand[normalizedSearch];
    } else {
      // Check partial matches
      for (const [key, cmd] of Object.entries(this.nlToCommand)) {
        if (normalizedSearch.includes(key) || key.includes(normalizedSearch)) {
          suggestion = cmd;
          break;
        }
      }
    }

    if (suggestion) {
      this.aiCommand.textContent = suggestion;
      this.aiResult.classList.remove('hidden');
    } else {
      this.aiResult.classList.add('hidden');
    }
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
    this.ttsToggle?.classList.toggle('active', this.ttsEnabled);
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
    if (this.terminal) {
      // Access the xterm instance (term property of TerminalWrapper)
      const term = this.terminal.term;
      if (term) {
        term.options.fontSize = this.fontSize;
        // Force refit after font change
        setTimeout(() => {
          this.terminal.fit();
        }, 50);
      }
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
    if (!this.terminal) return;

    const term = this.terminal.term;
    if (!term) return;

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
    term.options.theme = theme;
    // Force refresh to apply theme
    term.refresh(0, term.rows - 1);
  }

  toggleSetting(setting) {
    switch (setting) {
      case 'tts':
        this.ttsEnabled = !this.ttsEnabled;
        this.setSafeStorage('tts-enabled', this.ttsEnabled.toString());
        if (this.ttsEnabled) {
          this.speak('Text to speech enabled');
        }
        break;
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
