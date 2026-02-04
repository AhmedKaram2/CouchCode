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

// Terminal settings
let fontSize = parseInt(localStorage.getItem('desktop-font-size') || '15');
let currentTheme = localStorage.getItem('desktop-theme') || 'dark';

// Theme definitions
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
    brightWhite: '#f0f6fc',
    isLight: false
  },
  light: {
    background: '#f6f8fa',
    foreground: '#24292f',
    cursor: '#0969da',
    cursorAccent: '#f6f8fa',
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
    brightWhite: '#8c959f',
    isLight: true
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
    brightWhite: '#f9f8f5',
    isLight: false
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
    brightWhite: '#ffffff',
    isLight: false
  },
  nord: {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    cursorAccent: '#2e3440',
    selection: 'rgba(67, 76, 94, 0.8)',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
    isLight: false
  },
  solarized: {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    cursorAccent: '#002b36',
    selection: 'rgba(7, 54, 66, 0.8)',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
    isLight: false
  },
  gruvbox: {
    background: '#282828',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    cursorAccent: '#282828',
    selection: 'rgba(60, 56, 54, 0.8)',
    black: '#282828',
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#a89984',
    brightBlack: '#928374',
    brightRed: '#fb4934',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2',
    isLight: false
  },
  tokyo: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selection: 'rgba(41, 46, 66, 0.8)',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
    isLight: false
  }
};

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

// Tmux session sharing elements
const tmuxEnabledCheckbox = document.getElementById('tmux-enabled');
const tmuxUnavailable = document.getElementById('tmux-unavailable');
const tmuxInstalling = document.getElementById('tmux-installing');
const installTmuxBtn = document.getElementById('install-tmux-btn');

const toast = document.getElementById('toast');

// Update banner elements
const updateBanner = document.getElementById('update-banner');
const bannerMessage = document.getElementById('banner-message');
const bannerInstall = document.getElementById('banner-install');
const bannerDismiss = document.getElementById('banner-dismiss');

// Available shells
let availableShells = [];

// Terminal elements
const terminalContainer = document.getElementById('terminal');
const terminalContainerDiv = document.getElementById('terminal-container');
const noSessionMsg = document.getElementById('no-session-msg');
const sessionTitle = document.getElementById('session-title');
const connectedClients = document.getElementById('connected-clients');
const createSessionBtn = document.getElementById('create-session-btn');
const qrPlaceholder = document.getElementById('qr-placeholder');
const commandInput = document.getElementById('command-input');
const sendBtn = document.getElementById('send-btn');
const autoEnterBtn = document.getElementById('auto-enter-btn');
const quickActions = document.querySelector('.quick-actions');

// Claude Code elements
const claudeCodeBtn = document.getElementById('claude-code-btn');
const claudeCodeModal = document.getElementById('claude-code-modal');
const claudePromptInput = document.getElementById('claude-prompt-input');
const claudeCancelBtn = document.getElementById('claude-cancel-btn');
const claudeStartBtn = document.getElementById('claude-start-btn');
let selectedClaudePrompt = null;

// Command Center elements (combined AI + Snippets)
const commandCenterBtn = document.getElementById('command-center-btn');
const commandCenterModal = document.getElementById('ai-command-center');
const commandSearchInput = document.getElementById('command-search-input');
const closeCommandCenterBtn = document.getElementById('close-command-center');
const aiResult = document.getElementById('ai-result');
const aiCommandOutput = document.getElementById('ai-command-output');
const aiGenerateBtn = document.getElementById('ai-generate-btn');
const aiRunBtn = document.getElementById('ai-run-btn');
const copyAiResultBtn = document.getElementById('copy-ai-result');
const snippetsList = document.getElementById('snippets-list');

// Smart suggestions elements
const smartSuggestions = document.getElementById('smart-suggestions');
const closeSuggestionsBtn = document.getElementById('close-suggestions');

// Smart Snippets Database
const smartSnippets = [
  // ==================== GIT COMMANDS ====================
  { name: 'Git Status', description: 'Show working tree status', command: 'git status', category: 'git', icon: '📊' },
  { name: 'Git Diff', description: 'Show changes not yet staged', command: 'git diff', category: 'git', icon: '📝' },
  { name: 'Git Diff Staged', description: 'Show staged changes', command: 'git diff --staged', category: 'git', icon: '📝' },
  { name: 'Git Log', description: 'Show commit history', command: 'git log --oneline -10', category: 'git', icon: '📜' },
  { name: 'Git Log Graph', description: 'Visual commit history', command: 'git log --oneline --graph --all -15', category: 'git', icon: '🌳' },
  { name: 'Git Branch', description: 'List all branches', command: 'git branch -a', category: 'git', icon: '🌿' },
  { name: 'Git New Branch', description: 'Create and switch to new branch', command: 'git checkout -b feature/new-feature', category: 'git', icon: '🌱' },
  { name: 'Git Pull', description: 'Pull latest changes', command: 'git pull', category: 'git', icon: '⬇️' },
  { name: 'Git Pull Rebase', description: 'Pull with rebase', command: 'git pull --rebase', category: 'git', icon: '⬇️' },
  { name: 'Git Push', description: 'Push commits to remote', command: 'git push', category: 'git', icon: '⬆️' },
  { name: 'Git Push New Branch', description: 'Push new branch to remote', command: 'git push -u origin HEAD', category: 'git', icon: '⬆️' },
  { name: 'Git Stash', description: 'Stash current changes', command: 'git stash', category: 'git', icon: '📦' },
  { name: 'Git Stash Pop', description: 'Apply and remove stash', command: 'git stash pop', category: 'git', icon: '📤' },
  { name: 'Git Stash List', description: 'List all stashes', command: 'git stash list', category: 'git', icon: '📋' },
  { name: 'Git Reset', description: 'Unstage all changes', command: 'git reset HEAD', category: 'git', icon: '🔄' },
  { name: 'Git Reset Hard', description: 'Discard all changes (careful!)', command: 'git reset --hard HEAD', category: 'git', icon: '⚠️' },
  { name: 'Git Add All', description: 'Stage all changes', command: 'git add .', category: 'git', icon: '➕' },
  { name: 'Git Commit', description: 'Commit with message', command: 'git commit -m "Your message"', category: 'git', icon: '✅' },
  { name: 'Git Amend', description: 'Amend last commit', command: 'git commit --amend', category: 'git', icon: '✏️' },
  { name: 'Git Cherry Pick', description: 'Apply specific commit', command: 'git cherry-pick <commit-hash>', category: 'git', icon: '🍒' },
  { name: 'Git Revert', description: 'Revert a commit', command: 'git revert <commit-hash>', category: 'git', icon: '↩️' },
  { name: 'Git Remote', description: 'Show remote URLs', command: 'git remote -v', category: 'git', icon: '🔗' },
  { name: 'Git Fetch', description: 'Fetch from remote', command: 'git fetch --all', category: 'git', icon: '📥' },
  { name: 'Git Merge', description: 'Merge branch into current', command: 'git merge branch-name', category: 'git', icon: '🔀' },
  { name: 'Git Rebase', description: 'Rebase onto branch', command: 'git rebase main', category: 'git', icon: '📐' },
  { name: 'Git Clean', description: 'Remove untracked files', command: 'git clean -fd', category: 'git', icon: '🧹' },
  { name: 'Git Blame', description: 'Show who changed each line', command: 'git blame filename', category: 'git', icon: '👀' },
  { name: 'Git Show', description: 'Show commit details', command: 'git show HEAD', category: 'git', icon: '🔍' },
  { name: 'Git Tag', description: 'Create new tag', command: 'git tag -a v1.0.0 -m "Version 1.0.0"', category: 'git', icon: '🏷️' },
  { name: 'Git Tags List', description: 'List all tags', command: 'git tag -l', category: 'git', icon: '📋' },

  // ==================== FILE OPERATIONS ====================
  { name: 'List Files', description: 'List all files including hidden', command: 'ls -la', category: 'files', icon: '📁' },
  { name: 'List Files Tree', description: 'Show directory tree', command: 'tree -L 2 || find . -maxdepth 2 -type d', category: 'files', icon: '🌲' },
  { name: 'Find Files', description: 'Find files by name', command: 'find . -name "*.js" -type f', category: 'files', icon: '🔍' },
  { name: 'Find Recent Files', description: 'Files modified in last 24h', command: 'find . -type f -mtime -1', category: 'files', icon: '🕐' },
  { name: 'Find Large Files', description: 'Find files larger than 100MB', command: 'find . -type f -size +100M', category: 'files', icon: '📦' },
  { name: 'Find Empty Files', description: 'Find empty files', command: 'find . -type f -empty', category: 'files', icon: '📄' },
  { name: 'Search Content', description: 'Search text in files', command: 'grep -rn "search_term" .', category: 'files', icon: '🔎' },
  { name: 'Search TODO', description: 'Find all TODOs in code', command: 'grep -rn "TODO\\|FIXME\\|HACK" .', category: 'files', icon: '📌' },
  { name: 'File Size', description: 'Show file sizes in human readable format', command: 'du -sh *', category: 'files', icon: '📏' },
  { name: 'Folder Size', description: 'Total size of current folder', command: 'du -sh .', category: 'files', icon: '📊' },
  { name: 'Word Count', description: 'Count lines in files', command: 'wc -l *.js', category: 'files', icon: '🔢' },
  { name: 'Line Count Project', description: 'Count all lines in project', command: 'find . -name "*.js" -o -name "*.ts" | xargs wc -l', category: 'files', icon: '📈' },
  { name: 'Create Directory', description: 'Create a new directory', command: 'mkdir -p new_folder', category: 'files', icon: '📂' },
  { name: 'Create File', description: 'Create empty file', command: 'touch newfile.txt', category: 'files', icon: '📄' },
  { name: 'Remove Files', description: 'Remove files (careful!)', command: 'rm -i filename', category: 'files', icon: '🗑️' },
  { name: 'Remove Directory', description: 'Remove directory recursively', command: 'rm -rf directory_name', category: 'files', icon: '🗑️' },
  { name: 'Copy Files', description: 'Copy files or directories', command: 'cp -r source dest', category: 'files', icon: '📋' },
  { name: 'Move Files', description: 'Move or rename files', command: 'mv source dest', category: 'files', icon: '➡️' },
  { name: 'Change Permissions', description: 'Make file executable', command: 'chmod +x script.sh', category: 'files', icon: '🔐' },
  { name: 'Change Owner', description: 'Change file ownership', command: 'chown user:group filename', category: 'files', icon: '👤' },
  { name: 'Create Symlink', description: 'Create symbolic link', command: 'ln -s /path/to/target linkname', category: 'files', icon: '🔗' },
  { name: 'Compress Folder', description: 'Create tar.gz archive', command: 'tar -czvf archive.tar.gz folder/', category: 'files', icon: '📦' },
  { name: 'Extract Archive', description: 'Extract tar.gz archive', command: 'tar -xzvf archive.tar.gz', category: 'files', icon: '📂' },
  { name: 'Create Zip', description: 'Create zip archive', command: 'zip -r archive.zip folder/', category: 'files', icon: '🗜️' },
  { name: 'Extract Zip', description: 'Extract zip archive', command: 'unzip archive.zip', category: 'files', icon: '📂' },
  { name: 'Compare Files', description: 'Show differences between files', command: 'diff file1 file2', category: 'files', icon: '⚖️' },
  { name: 'File Type', description: 'Determine file type', command: 'file filename', category: 'files', icon: '❓' },
  { name: 'Head File', description: 'Show first 10 lines', command: 'head -10 filename', category: 'files', icon: '⬆️' },
  { name: 'Tail File', description: 'Show last 10 lines', command: 'tail -10 filename', category: 'files', icon: '⬇️' },
  { name: 'Watch File', description: 'Monitor file changes', command: 'tail -f logfile.log', category: 'files', icon: '👁️' },

  // ==================== SYSTEM COMMANDS ====================
  { name: 'Disk Usage', description: 'Show disk space usage', command: 'df -h', category: 'system', icon: '💾' },
  { name: 'Memory Usage', description: 'Show memory information', command: 'free -h 2>/dev/null || vm_stat', category: 'system', icon: '🧠' },
  { name: 'Top Processes', description: 'Show running processes', command: 'top -l 1 | head -20 2>/dev/null || top -bn1 | head -20', category: 'system', icon: '📊' },
  { name: 'Process List', description: 'List all processes', command: 'ps aux | head -20', category: 'system', icon: '📋' },
  { name: 'Find Process', description: 'Find process by name', command: 'ps aux | grep process_name', category: 'system', icon: '🔍' },
  { name: 'Kill Process', description: 'Kill process by PID', command: 'kill -9 PID', category: 'system', icon: '💀' },
  { name: 'Kill by Name', description: 'Kill process by name', command: 'pkill -f process_name', category: 'system', icon: '💀' },
  { name: 'System Info', description: 'Show system information', command: 'uname -a', category: 'system', icon: '💻' },
  { name: 'OS Version', description: 'Show OS version', command: 'sw_vers 2>/dev/null || cat /etc/os-release', category: 'system', icon: '🖥️' },
  { name: 'CPU Info', description: 'Show CPU information', command: 'sysctl -n machdep.cpu.brand_string 2>/dev/null || lscpu', category: 'system', icon: '⚡' },
  { name: 'Environment', description: 'Show environment variables', command: 'env | sort', category: 'system', icon: '⚙️' },
  { name: 'Path Variable', description: 'Show PATH variable', command: 'echo $PATH | tr ":" "\\n"', category: 'system', icon: '🛤️' },
  { name: 'User Info', description: 'Show current user', command: 'whoami && id', category: 'system', icon: '👤' },
  { name: 'Uptime', description: 'Show system uptime', command: 'uptime', category: 'system', icon: '⏱️' },
  { name: 'Date Time', description: 'Show current date and time', command: 'date', category: 'system', icon: '📅' },
  { name: 'Calendar', description: 'Show calendar', command: 'cal', category: 'system', icon: '🗓️' },
  { name: 'History', description: 'Show command history', command: 'history | tail -30', category: 'system', icon: '📜' },
  { name: 'Clear History', description: 'Clear command history', command: 'history -c', category: 'system', icon: '🧹' },
  { name: 'Hostname', description: 'Show hostname', command: 'hostname', category: 'system', icon: '🏠' },
  { name: 'Shutdown', description: 'Shutdown system', command: 'sudo shutdown -h now', category: 'system', icon: '🔌' },
  { name: 'Restart', description: 'Restart system', command: 'sudo reboot', category: 'system', icon: '🔄' },
  { name: 'Sleep Mac', description: 'Put Mac to sleep', command: 'pmset sleepnow', category: 'system', icon: '😴' },

  // ==================== NETWORK COMMANDS ====================
  { name: 'IP Address', description: 'Show local IP addresses', command: 'ifconfig 2>/dev/null || ip addr', category: 'network', icon: '🌐' },
  { name: 'Public IP', description: 'Show public IP address', command: 'curl -s ifconfig.me', category: 'network', icon: '🌍' },
  { name: 'Ping Test', description: 'Test network connectivity', command: 'ping -c 4 google.com', category: 'network', icon: '📡' },
  { name: 'Port Check', description: 'Check listening ports', command: 'netstat -tuln 2>/dev/null || ss -tuln', category: 'network', icon: '🔌' },
  { name: 'Port Scan', description: 'Check if port is open', command: 'nc -zv localhost 3000', category: 'network', icon: '🔍' },
  { name: 'DNS Lookup', description: 'Lookup DNS records', command: 'nslookup google.com', category: 'network', icon: '🔎' },
  { name: 'DNS Dig', description: 'Detailed DNS lookup', command: 'dig google.com', category: 'network', icon: '🔎' },
  { name: 'Traceroute', description: 'Trace packet route', command: 'traceroute google.com', category: 'network', icon: '🛤️' },
  { name: 'Curl GET', description: 'Make GET request', command: 'curl -X GET https://api.example.com', category: 'network', icon: '🌍' },
  { name: 'Curl POST', description: 'Make POST request with JSON', command: 'curl -X POST -H "Content-Type: application/json" -d \'{"key":"value"}\' https://api.example.com', category: 'network', icon: '📤' },
  { name: 'Curl Headers', description: 'Show response headers', command: 'curl -I https://example.com', category: 'network', icon: '📋' },
  { name: 'Download File', description: 'Download a file', command: 'curl -O https://example.com/file', category: 'network', icon: '⬇️' },
  { name: 'Download wget', description: 'Download with wget', command: 'wget https://example.com/file', category: 'network', icon: '⬇️' },
  { name: 'SSH Connect', description: 'Connect via SSH', command: 'ssh user@hostname', category: 'network', icon: '🔐' },
  { name: 'SSH Key Gen', description: 'Generate SSH key pair', command: 'ssh-keygen -t ed25519 -C "your_email@example.com"', category: 'network', icon: '🔑' },
  { name: 'SCP Upload', description: 'Upload file via SCP', command: 'scp file.txt user@host:/path/', category: 'network', icon: '⬆️' },
  { name: 'SCP Download', description: 'Download file via SCP', command: 'scp user@host:/path/file.txt .', category: 'network', icon: '⬇️' },
  { name: 'WiFi Networks', description: 'List WiFi networks (macOS)', command: '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s', category: 'network', icon: '📶' },
  { name: 'Flush DNS', description: 'Flush DNS cache (macOS)', command: 'sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder', category: 'network', icon: '🧹' },

  // ==================== DOCKER COMMANDS ====================
  { name: 'Docker PS', description: 'List running containers', command: 'docker ps', category: 'docker', icon: '🐳' },
  { name: 'Docker PS All', description: 'List all containers', command: 'docker ps -a', category: 'docker', icon: '🐳' },
  { name: 'Docker Images', description: 'List Docker images', command: 'docker images', category: 'docker', icon: '📦' },
  { name: 'Docker Logs', description: 'Show container logs', command: 'docker logs -f container_name', category: 'docker', icon: '📜' },
  { name: 'Docker Logs Tail', description: 'Show last 100 log lines', command: 'docker logs --tail 100 container_name', category: 'docker', icon: '📜' },
  { name: 'Docker Compose Up', description: 'Start Docker Compose services', command: 'docker-compose up -d', category: 'docker', icon: '🚀' },
  { name: 'Docker Compose Down', description: 'Stop Docker Compose services', command: 'docker-compose down', category: 'docker', icon: '🛑' },
  { name: 'Docker Compose Logs', description: 'View compose logs', command: 'docker-compose logs -f', category: 'docker', icon: '📜' },
  { name: 'Docker Stop All', description: 'Stop all containers', command: 'docker stop $(docker ps -q)', category: 'docker', icon: '🛑' },
  { name: 'Docker Remove All', description: 'Remove all containers', command: 'docker rm $(docker ps -aq)', category: 'docker', icon: '🗑️' },
  { name: 'Docker Prune', description: 'Clean up Docker resources', command: 'docker system prune -a', category: 'docker', icon: '🧹' },
  { name: 'Docker Exec', description: 'Execute command in container', command: 'docker exec -it container_name bash', category: 'docker', icon: '⚡' },
  { name: 'Docker Build', description: 'Build Docker image', command: 'docker build -t myimage .', category: 'docker', icon: '🔨' },
  { name: 'Docker Run', description: 'Run container interactively', command: 'docker run -it --rm image_name', category: 'docker', icon: '▶️' },
  { name: 'Docker Run Detached', description: 'Run container in background', command: 'docker run -d -p 8080:80 image_name', category: 'docker', icon: '▶️' },
  { name: 'Docker Pull', description: 'Pull image from registry', command: 'docker pull image_name', category: 'docker', icon: '⬇️' },
  { name: 'Docker Push', description: 'Push image to registry', command: 'docker push image_name', category: 'docker', icon: '⬆️' },
  { name: 'Docker Stats', description: 'Show container stats', command: 'docker stats', category: 'docker', icon: '📊' },
  { name: 'Docker Network', description: 'List Docker networks', command: 'docker network ls', category: 'docker', icon: '🌐' },
  { name: 'Docker Volumes', description: 'List Docker volumes', command: 'docker volume ls', category: 'docker', icon: '💾' },

  // ==================== NPM/NODE COMMANDS ====================
  { name: 'NPM Install', description: 'Install dependencies', command: 'npm install', category: 'npm', icon: '📦' },
  { name: 'NPM Install Package', description: 'Install specific package', command: 'npm install package-name', category: 'npm', icon: '➕' },
  { name: 'NPM Install Dev', description: 'Install as dev dependency', command: 'npm install -D package-name', category: 'npm', icon: '🔧' },
  { name: 'NPM Install Global', description: 'Install globally', command: 'npm install -g package-name', category: 'npm', icon: '🌍' },
  { name: 'NPM Start', description: 'Run start script', command: 'npm start', category: 'npm', icon: '▶️' },
  { name: 'NPM Run Dev', description: 'Run development server', command: 'npm run dev', category: 'npm', icon: '🔧' },
  { name: 'NPM Run Build', description: 'Build project', command: 'npm run build', category: 'npm', icon: '🔨' },
  { name: 'NPM Test', description: 'Run tests', command: 'npm test', category: 'npm', icon: '🧪' },
  { name: 'NPM Outdated', description: 'Check outdated packages', command: 'npm outdated', category: 'npm', icon: '📋' },
  { name: 'NPM Update', description: 'Update packages', command: 'npm update', category: 'npm', icon: '⬆️' },
  { name: 'NPM Audit', description: 'Security audit', command: 'npm audit', category: 'npm', icon: '🔒' },
  { name: 'NPM Audit Fix', description: 'Fix vulnerabilities', command: 'npm audit fix', category: 'npm', icon: '🔧' },
  { name: 'NPM List', description: 'List installed packages', command: 'npm list --depth=0', category: 'npm', icon: '📋' },
  { name: 'NPM Cache Clean', description: 'Clear NPM cache', command: 'npm cache clean --force', category: 'npm', icon: '🧹' },
  { name: 'NPM Init', description: 'Initialize new project', command: 'npm init -y', category: 'npm', icon: '🆕' },
  { name: 'NPX Create React', description: 'Create React app', command: 'npx create-react-app my-app', category: 'npm', icon: '⚛️' },
  { name: 'NPX Create Next', description: 'Create Next.js app', command: 'npx create-next-app@latest my-app', category: 'npm', icon: '▲' },
  { name: 'NPX Create Vite', description: 'Create Vite project', command: 'npm create vite@latest my-app', category: 'npm', icon: '⚡' },
  { name: 'Node Version', description: 'Check Node.js version', command: 'node -v && npm -v', category: 'npm', icon: '📦' },
  { name: 'Yarn Install', description: 'Install with Yarn', command: 'yarn install', category: 'npm', icon: '🧶' },
  { name: 'PNPM Install', description: 'Install with PNPM', command: 'pnpm install', category: 'npm', icon: '📦' },

  // ==================== PYTHON COMMANDS ====================
  { name: 'Python Version', description: 'Check Python version', command: 'python3 --version', category: 'python', icon: '🐍' },
  { name: 'Pip Install', description: 'Install package', command: 'pip3 install package-name', category: 'python', icon: '📦' },
  { name: 'Pip Install Req', description: 'Install from requirements', command: 'pip3 install -r requirements.txt', category: 'python', icon: '📋' },
  { name: 'Pip Freeze', description: 'Export requirements', command: 'pip3 freeze > requirements.txt', category: 'python', icon: '❄️' },
  { name: 'Pip List', description: 'List installed packages', command: 'pip3 list', category: 'python', icon: '📋' },
  { name: 'Pip Outdated', description: 'Check outdated packages', command: 'pip3 list --outdated', category: 'python', icon: '📋' },
  { name: 'Create Venv', description: 'Create virtual environment', command: 'python3 -m venv venv', category: 'python', icon: '🔧' },
  { name: 'Activate Venv', description: 'Activate virtual environment', command: 'source venv/bin/activate', category: 'python', icon: '▶️' },
  { name: 'Deactivate Venv', description: 'Deactivate virtual environment', command: 'deactivate', category: 'python', icon: '⏹️' },
  { name: 'Python Run', description: 'Run Python script', command: 'python3 script.py', category: 'python', icon: '▶️' },
  { name: 'Python REPL', description: 'Start Python shell', command: 'python3', category: 'python', icon: '💻' },
  { name: 'Pytest', description: 'Run pytest tests', command: 'pytest', category: 'python', icon: '🧪' },
  { name: 'Django Server', description: 'Run Django dev server', command: 'python manage.py runserver', category: 'python', icon: '🌐' },
  { name: 'Django Migrate', description: 'Run Django migrations', command: 'python manage.py migrate', category: 'python', icon: '🔄' },
  { name: 'Flask Run', description: 'Run Flask app', command: 'flask run', category: 'python', icon: '🌐' },
  { name: 'Jupyter Notebook', description: 'Start Jupyter notebook', command: 'jupyter notebook', category: 'python', icon: '📓' },

  // ==================== KUBERNETES COMMANDS ====================
  { name: 'K8s Get Pods', description: 'List all pods', command: 'kubectl get pods', category: 'k8s', icon: '☸️' },
  { name: 'K8s Get All', description: 'List all resources', command: 'kubectl get all', category: 'k8s', icon: '☸️' },
  { name: 'K8s Get Services', description: 'List services', command: 'kubectl get services', category: 'k8s', icon: '🔗' },
  { name: 'K8s Get Deployments', description: 'List deployments', command: 'kubectl get deployments', category: 'k8s', icon: '📦' },
  { name: 'K8s Describe Pod', description: 'Describe pod details', command: 'kubectl describe pod pod-name', category: 'k8s', icon: '🔍' },
  { name: 'K8s Logs', description: 'View pod logs', command: 'kubectl logs -f pod-name', category: 'k8s', icon: '📜' },
  { name: 'K8s Exec', description: 'Execute in pod', command: 'kubectl exec -it pod-name -- /bin/bash', category: 'k8s', icon: '⚡' },
  { name: 'K8s Apply', description: 'Apply configuration', command: 'kubectl apply -f config.yaml', category: 'k8s', icon: '✅' },
  { name: 'K8s Delete', description: 'Delete resource', command: 'kubectl delete -f config.yaml', category: 'k8s', icon: '🗑️' },
  { name: 'K8s Scale', description: 'Scale deployment', command: 'kubectl scale deployment/name --replicas=3', category: 'k8s', icon: '📈' },
  { name: 'K8s Port Forward', description: 'Forward local port', command: 'kubectl port-forward pod-name 8080:80', category: 'k8s', icon: '🔌' },
  { name: 'K8s Contexts', description: 'List contexts', command: 'kubectl config get-contexts', category: 'k8s', icon: '📋' },
  { name: 'K8s Use Context', description: 'Switch context', command: 'kubectl config use-context context-name', category: 'k8s', icon: '🔀' },
  { name: 'K8s Namespaces', description: 'List namespaces', command: 'kubectl get namespaces', category: 'k8s', icon: '📂' },

  // ==================== DATABASE COMMANDS ====================
  { name: 'MySQL Connect', description: 'Connect to MySQL', command: 'mysql -u root -p', category: 'database', icon: '🐬' },
  { name: 'PostgreSQL Connect', description: 'Connect to PostgreSQL', command: 'psql -U postgres', category: 'database', icon: '🐘' },
  { name: 'MongoDB Shell', description: 'Start MongoDB shell', command: 'mongosh', category: 'database', icon: '🍃' },
  { name: 'Redis CLI', description: 'Connect to Redis', command: 'redis-cli', category: 'database', icon: '🔴' },
  { name: 'SQLite Open', description: 'Open SQLite database', command: 'sqlite3 database.db', category: 'database', icon: '💾' },
  { name: 'MySQL Dump', description: 'Export MySQL database', command: 'mysqldump -u root -p database > backup.sql', category: 'database', icon: '💾' },
  { name: 'PG Dump', description: 'Export PostgreSQL database', command: 'pg_dump -U postgres database > backup.sql', category: 'database', icon: '💾' },
  { name: 'MongoDB Dump', description: 'Export MongoDB database', command: 'mongodump --db database --out backup/', category: 'database', icon: '💾' },
];

// Natural Language to Command mappings
const nlToCommand = {
  // File operations
  'list': 'ls -la',
  'list files': 'ls -la',
  'list all files': 'ls -la',
  'show files': 'ls -la',
  'directory contents': 'ls -la',
  'what files': 'ls -la',
  'find': 'find . -name',
  'search files': 'find . -name',
  'find files': 'find . -type f -name',
  'find javascript': 'find . -name "*.js" -type f',
  'find js files': 'find . -name "*.js" -type f',
  'find python': 'find . -name "*.py" -type f',
  'disk usage': 'du -sh *',
  'folder size': 'du -sh',
  'disk space': 'df -h',
  'create folder': 'mkdir -p',
  'create directory': 'mkdir -p',
  'new folder': 'mkdir -p',
  'delete file': 'rm -i',
  'remove file': 'rm -i',
  'copy file': 'cp',
  'move file': 'mv',
  'rename file': 'mv',

  // Git operations
  'git status': 'git status',
  'check git': 'git status',
  'git changes': 'git diff',
  'show changes': 'git diff',
  'git history': 'git log --oneline -10',
  'commit history': 'git log --oneline -10',
  'git branches': 'git branch -a',
  'list branches': 'git branch -a',
  'create branch': 'git checkout -b',
  'new branch': 'git checkout -b',
  'switch branch': 'git checkout',
  'git pull': 'git pull',
  'pull changes': 'git pull',
  'git push': 'git push',
  'push changes': 'git push',
  'stage all': 'git add .',
  'add all': 'git add .',
  'commit': 'git commit -m',
  'git commit': 'git commit -m',
  'stash': 'git stash',
  'save changes': 'git stash',
  'unstage': 'git reset HEAD',

  // System info
  'system info': 'uname -a',
  'system information': 'uname -a && sw_vers 2>/dev/null || cat /etc/os-release 2>/dev/null',
  'memory': 'free -h 2>/dev/null || vm_stat',
  'memory usage': 'free -h 2>/dev/null || vm_stat',
  'ram': 'free -h 2>/dev/null || vm_stat',
  'cpu': 'top -l 1 | head -12 2>/dev/null || top -bn1 | head -12',
  'processes': 'ps aux | head -20',
  'running processes': 'ps aux | head -20',
  'top processes': 'top -l 1 | head -20 2>/dev/null || top -bn1 | head -20',
  'uptime': 'uptime',
  'who am i': 'whoami && id',
  'current user': 'whoami',
  'environment': 'env | sort',
  'env vars': 'env | sort',

  // Network
  'ip address': 'ifconfig 2>/dev/null || ip addr',
  'my ip': 'ifconfig 2>/dev/null || ip addr',
  'network': 'ifconfig 2>/dev/null || ip addr',
  'ping': 'ping -c 4',
  'test connection': 'ping -c 4 google.com',
  'check network': 'ping -c 4 google.com',
  'ports': 'netstat -tuln 2>/dev/null || ss -tuln',
  'listening ports': 'netstat -tuln 2>/dev/null || ss -tuln',
  'dns': 'nslookup',
  'curl': 'curl -I',
  'http request': 'curl -I',
  'download': 'curl -O',

  // Docker
  'docker containers': 'docker ps -a',
  'running containers': 'docker ps',
  'docker images': 'docker images',
  'container logs': 'docker logs -f',
  'docker up': 'docker-compose up -d',
  'docker down': 'docker-compose down',
  'stop containers': 'docker stop $(docker ps -q)',
  'docker clean': 'docker system prune -a',
  'docker shell': 'docker exec -it',

  // Misc
  'clear': 'clear',
  'clear screen': 'clear',
  'history': 'history | tail -20',
  'command history': 'history | tail -20',
  'date': 'date',
  'time': 'date',
  'calendar': 'cal',
  'compress': 'tar -czvf archive.tar.gz',
  'zip': 'zip -r archive.zip',
  'extract': 'tar -xzvf',
  'unzip': 'unzip',
};

// Terminal settings elements
const fontDecrease = document.getElementById('font-decrease');
const fontIncrease = document.getElementById('font-increase');
const fontSizeDisplay = document.getElementById('font-size-display');
const themeSelector = document.getElementById('theme-selector');

// Initialize
async function init() {
  await loadSettings();
  await updateServerStatus();

  // Wait a moment for server to be fully ready, then fetch QR code
  setTimeout(async () => {
    await updateServerStatus();
    await updateQRCode();
  }, 500);

  await loadSessions();
  initTerminal();
  applyTheme(); // Apply theme to full app
  setupEventListeners();
  updateSettingsUI();

  // Load tmux status
  if (typeof loadTmuxStatus === 'function') {
    loadTmuxStatus();
  }

  // Poll for updates
  setInterval(async () => {
    await updateServerStatus();
    await loadSessions();
    // Also refresh QR code if server is running but QR not showing
    if (isServerRunning && (!qrCode.src || qrCode.src === '')) {
      await updateQRCode();
    }
  }, 3000);
}

// Initialize terminal
function initTerminal() {
  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: fontSize,
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
    theme: themes[currentTheme] || themes.dark
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
  console.log('updateQRCode called, isServerRunning:', isServerRunning);

  if (!isServerRunning) {
    qrCode.src = '';
    qrCode.alt = 'Start server to generate QR code';
    if (qrPlaceholder) qrPlaceholder.textContent = 'Server stopped';
    return;
  }

  // Show loading state
  if (qrPlaceholder) qrPlaceholder.textContent = 'Loading...';

  try {
    console.log('Invoking get-qr-code...');
    const result = await ipcRenderer.invoke('get-qr-code');
    console.log('QR code result:', result);

    if (result && result.qrCode) {
      console.log('Setting QR code image, data length:', result.qrCode.length);
      qrCode.src = result.qrCode;
      qrCode.alt = 'Scan to connect';
      if (qrPlaceholder) qrPlaceholder.style.display = 'none';
      urlDisplay.value = result.url;
    } else if (result && result.error) {
      console.error('QR code error:', result.error);
      qrCode.src = '';
      qrCode.alt = 'QR code generation failed';
      if (qrPlaceholder) {
        qrPlaceholder.style.display = 'flex';
        qrPlaceholder.textContent = 'Error: ' + result.error;
      }
    } else {
      console.error('QR code result is empty or invalid:', result);
      qrCode.src = '';
      qrCode.alt = 'QR code unavailable';
      if (qrPlaceholder) {
        qrPlaceholder.style.display = 'flex';
        qrPlaceholder.textContent = 'Unavailable';
      }
    }
  } catch (error) {
    console.error('Failed to get QR code:', error);
    qrCode.src = '';
    qrCode.alt = 'QR code error';
    if (qrPlaceholder) {
      qrPlaceholder.style.display = 'flex';
      qrPlaceholder.textContent = 'Error';
    }
  }
}

// Load sessions
async function loadSessions() {
  try {
    sessions = await ipcRenderer.invoke('get-sessions');
  } catch (error) {
    console.error('Failed to load sessions:', error);
    showToast('Failed to load sessions', 'error');
    sessions = [];
  }

  if (!sessions || sessions.length === 0) {
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
  try {
    const session = await ipcRenderer.invoke('create-session', {
      name: `Session ${sessions.length + 1}`
    });
    if (session) {
      await loadSessions();
      attachToSession(session.id);
      showToast('Session created', 'success');
    } else {
      showToast('Failed to create session', 'error');
    }
  } catch (error) {
    console.error('Failed to create session:', error);
    showToast('Failed to create session: ' + (error.message || 'Unknown error'), 'error');
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
  try {
    await ipcRenderer.invoke('kill-session', sessionId);
    await loadSessions();
    showToast('Session terminated', 'success');
  } catch (error) {
    console.error('Failed to kill session:', error);
    showToast('Failed to terminate session', 'error');
  }
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

  // Font size controls
  fontDecrease?.addEventListener('click', decreaseFontSize);
  fontIncrease?.addEventListener('click', increaseFontSize);

  // Theme selector
  themeSelector?.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (btn && btn.dataset.theme) {
      setTheme(btn.dataset.theme);
    }
  });

  // Listen for server status changes from main process
  ipcRenderer.on('server-status-changed', async (event, running) => {
    isServerRunning = running;
    await updateServerStatus();
    await updateQRCode();
  });

  // Claude Code button
  if (claudeCodeBtn) {
    claudeCodeBtn.addEventListener('click', showClaudeCodeModal);
  }

  // Claude Code cancel
  if (claudeCancelBtn) {
    claudeCancelBtn.addEventListener('click', hideClaudeCodeModal);
  }

  // Claude Code start
  if (claudeStartBtn) {
    claudeStartBtn.addEventListener('click', startClaudeCode);
  }

  // Claude Code quick action buttons (event delegation)
  if (claudeCodeModal) {
    claudeCodeModal.addEventListener('click', (e) => {
      const btn = e.target.closest('.claude-quick-btn');
      if (btn) {
        const prompt = btn.dataset.prompt;
        if (prompt) {
          selectClaudeQuickAction(btn, prompt);
        }
      }
      // Close modal on background click
      if (e.target === claudeCodeModal) {
        hideClaudeCodeModal();
      }
    });
  }

  // Update banner handling
  ipcRenderer.on('update-downloaded', (event, info) => {
    if (updateBanner && bannerMessage) {
      bannerMessage.textContent = `Version ${info.version} is ready to install`;
      updateBanner.classList.remove('hidden');
    }
  });

  // Install button
  if (bannerInstall) {
    bannerInstall.addEventListener('click', async () => {
      await ipcRenderer.invoke('install-update');
    });
  }

  // Dismiss button
  if (bannerDismiss) {
    bannerDismiss.addEventListener('click', () => {
      if (updateBanner) {
        updateBanner.classList.add('hidden');
      }
    });
  }

  // Command Center button
  if (commandCenterBtn) {
    commandCenterBtn.addEventListener('click', showCommandCenter);
  }

  // Command Center close button
  if (closeCommandCenterBtn) {
    closeCommandCenterBtn.addEventListener('click', hideCommandCenter);
  }

  // Generate button
  if (aiGenerateBtn) {
    aiGenerateBtn.addEventListener('click', generateCommand);
  }

  // Run generated command button
  if (aiRunBtn) {
    aiRunBtn.addEventListener('click', runGeneratedCommand);
  }

  // Copy AI result
  if (copyAiResultBtn) {
    copyAiResultBtn.addEventListener('click', copyAiResult);
  }

  // Command Center modal background click
  if (commandCenterModal) {
    commandCenterModal.addEventListener('click', (e) => {
      if (e.target === commandCenterModal) {
        hideCommandCenter();
      }
    });
  }

  // Command search input - search and AI generation
  if (commandSearchInput) {
    let searchTimer;
    commandSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const value = commandSearchInput.value.trim();
      const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';

      // Hide AI result when typing
      if (aiResult) aiResult.classList.add('hidden');

      // Filter snippets
      searchTimer = setTimeout(() => {
        renderSnippets(activeCategory, value);
      }, 150);
    });

    // Enter key to generate
    commandSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        generateCommand();
      }
    });
  }

  // Smart suggestions close button
  if (closeSuggestionsBtn) {
    closeSuggestionsBtn.addEventListener('click', hideSmartSuggestions);
  }

  // Category buttons
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSnippets(btn.dataset.category, commandSearchInput?.value || '');
    });
  });

  // Snippets list click
  if (snippetsList) {
    snippetsList.addEventListener('click', (e) => {
      const item = e.target.closest('.snippet-item');
      if (item && item.dataset.command) {
        executeSnippet(item.dataset.command);
        hideCommandCenter();
      }
    });
  }

  // Smart input detection - show suggestions as user types in terminal input
  if (commandInput) {
    let typingTimer;
    commandInput.addEventListener('input', () => {
      clearTimeout(typingTimer);
      const value = commandInput.value.trim();

      // Only show suggestions for longer inputs that look like natural language
      if (value.length > 5 && value.includes(' ') && !value.startsWith('/') && !value.startsWith('cd ')) {
        typingTimer = setTimeout(() => {
          const command = naturalLanguageToCommand(value);
          if (command) {
            showSmartSuggestions([{
              icon: '✨',
              text: 'Suggested command',
              command: command
            }]);
          }
        }, 500);
      } else {
        hideSmartSuggestions();
      }
    });
  }
}

// Claude Code functions
function showClaudeCodeModal() {
  if (claudeCodeModal) {
    claudeCodeModal.classList.remove('hidden');
    selectedClaudePrompt = null;
    if (claudePromptInput) {
      claudePromptInput.value = '';
    }
    // Clear all selected states
    document.querySelectorAll('.claude-quick-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    // Focus textarea
    setTimeout(() => {
      claudePromptInput?.focus();
    }, 100);
  }
}

function hideClaudeCodeModal() {
  if (claudeCodeModal) {
    claudeCodeModal.classList.add('hidden');
  }
}

function selectClaudeQuickAction(btn, prompt) {
  // Toggle selection
  const wasSelected = btn.classList.contains('selected');

  // Clear all selected states
  document.querySelectorAll('.claude-quick-btn').forEach(b => {
    b.classList.remove('selected');
  });

  if (!wasSelected) {
    btn.classList.add('selected');
    selectedClaudePrompt = prompt;
    if (claudePromptInput) {
      claudePromptInput.value = prompt;
    }
  } else {
    selectedClaudePrompt = null;
    if (claudePromptInput) {
      claudePromptInput.value = '';
    }
  }
}

let pendingClaudePrompt = null;

function startClaudeCode() {
  // Get prompt from textarea or selected quick action
  let prompt = claudePromptInput?.value?.trim() || selectedClaudePrompt;

  if (!prompt) {
    showToast('Please select an action or enter a prompt', 'error');
    return;
  }

  // Store the prompt to send after session is ready
  pendingClaudePrompt = prompt;

  // If no active session, create one first
  if (!currentSessionId) {
    hideClaudeCodeModal();
    createSession();
    // Wait for session to be ready, then send command
    waitForSessionAndRunClaude();
    return;
  }

  // Session exists, send command directly
  sendClaudeCommand(prompt);
}

function waitForSessionAndRunClaude() {
  // Poll for session to be ready
  let attempts = 0;
  const maxAttempts = 20; // 10 seconds max

  const checkSession = () => {
    attempts++;
    if (currentSessionId && pendingClaudePrompt) {
      // Session is ready, send the claude command
      setTimeout(() => {
        sendClaudeCommand(pendingClaudePrompt);
        pendingClaudePrompt = null;
      }, 500); // Small delay to let terminal initialize
    } else if (attempts < maxAttempts) {
      setTimeout(checkSession, 500);
    } else {
      showToast('Failed to create session', 'error');
      pendingClaudePrompt = null;
    }
  };

  checkSession();
}

function sendClaudeCommand(prompt) {
  // Build the claude command
  const claudeCommand = `claude "${prompt.replace(/"/g, '\\"')}"`;

  // Send to terminal
  ipcRenderer.invoke('terminal-input', currentSessionId, claudeCommand + '\r');

  // Hide modal if still open
  hideClaudeCodeModal();

  // Focus terminal
  if (terminal) {
    terminal.focus();
  }
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

// Font size functions
function decreaseFontSize() {
  if (fontSize > 10) {
    fontSize--;
    applyFontSize();
    localStorage.setItem('desktop-font-size', fontSize.toString());
    updateSettingsUI();
  }
}

function increaseFontSize() {
  if (fontSize < 24) {
    fontSize++;
    applyFontSize();
    localStorage.setItem('desktop-font-size', fontSize.toString());
    updateSettingsUI();
  }
}

function applyFontSize() {
  if (terminal) {
    terminal.options.fontSize = fontSize;
    setTimeout(() => {
      if (fitAddon) {
        fitAddon.fit();
      }
    }, 50);
  }
}

// Theme functions
function setTheme(themeName) {
  if (themes[themeName]) {
    currentTheme = themeName;
    localStorage.setItem('desktop-theme', themeName);
    applyTheme();
    updateSettingsUI();
  }
}

function applyTheme() {
  const theme = themes[currentTheme];
  if (!theme) return;

  // Apply to terminal
  if (terminal) {
    terminal.options.theme = theme;
    terminal.refresh(0, terminal.rows - 1);
  }

  // Apply to full app via CSS variables
  const root = document.documentElement;
  const isLight = theme.isLight;
  const adjust = isLight ? -10 : 10; // Darken for light themes, lighten for dark

  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--surface', adjustColor(theme.background, adjust));
  root.style.setProperty('--surface-light', adjustColor(theme.background, adjust * 2));
  root.style.setProperty('--surface-elevated', adjustColor(theme.background, adjust * 1.5));
  root.style.setProperty('--text-primary', theme.foreground);
  root.style.setProperty('--text-secondary', isLight ? theme.brightBlack : (theme.white || theme.foreground));
  root.style.setProperty('--text-muted', isLight ? theme.white : (theme.brightBlack || theme.white));
  root.style.setProperty('--border-color', adjustColor(theme.background, adjust * 2.5));
  root.style.setProperty('--primary-color', theme.green);
  root.style.setProperty('--primary-hover', theme.brightGreen || theme.green);
  root.style.setProperty('--primary-glow', isLight ? 'rgba(26, 127, 55, 0.1)' : 'rgba(63, 185, 80, 0.15)');
  root.style.setProperty('--info-color', theme.blue);
  root.style.setProperty('--danger-color', theme.red);
  root.style.setProperty('--warning-color', theme.yellow);

  // Set button text colors for proper contrast
  root.style.setProperty('--btn-primary-text', '#ffffff');
  root.style.setProperty('--btn-secondary-bg', isLight ? '#e1e4e8' : adjustColor(theme.background, 20));
  root.style.setProperty('--btn-secondary-text', theme.foreground);
  root.style.setProperty('--btn-secondary-border', adjustColor(theme.background, adjust * 3));
}

// Helper to lighten/darken a hex color
function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Update settings UI
function updateSettingsUI() {
  if (fontSizeDisplay) {
    fontSizeDisplay.textContent = `${fontSize}px`;
  }
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
  });
}

// ==================== TMUX SESSION SHARING ====================

// Load tmux status and update UI
async function loadTmuxStatus() {
  try {
    const status = await ipcRenderer.invoke('get-tmux-status');

    if (tmuxUnavailable) {
      tmuxUnavailable.classList.toggle('hidden', status.available);
    }

    if (tmuxEnabledCheckbox) {
      tmuxEnabledCheckbox.checked = status.enabled;
      tmuxEnabledCheckbox.disabled = !status.available;
    }

  } catch (e) {
    console.error('Failed to load tmux status:', e);
  }
}

// Toggle tmux mode
async function toggleTmuxMode() {
  if (!tmuxEnabledCheckbox) return;

  try {
    const result = await ipcRenderer.invoke('toggle-tmux-mode', tmuxEnabledCheckbox.checked);
    if (result.success) {
      showToast(result.enabled ? 'tmux session sharing enabled' : 'tmux session sharing disabled');
      loadTmuxStatus();
    }
  } catch (e) {
    console.error('Failed to toggle tmux mode:', e);
    tmuxEnabledCheckbox.checked = !tmuxEnabledCheckbox.checked; // Revert
  }
}

// Install tmux
async function installTmux() {
  if (!installTmuxBtn) return;

  // Show installing state
  if (tmuxUnavailable) tmuxUnavailable.classList.add('hidden');
  if (tmuxInstalling) tmuxInstalling.classList.remove('hidden');

  try {
    const result = await ipcRenderer.invoke('install-tmux');

    if (result.success) {
      showToast('tmux installed successfully!', 'success');
      // Reload tmux status
      setTimeout(() => loadTmuxStatus(), 1000);
    } else {
      showToast(result.error || 'Failed to install tmux', 'error');
      // Show the unavailable notice again
      if (tmuxUnavailable) tmuxUnavailable.classList.remove('hidden');
    }
  } catch (e) {
    console.error('Failed to install tmux:', e);
    showToast('Failed to install tmux: ' + e.message, 'error');
    if (tmuxUnavailable) tmuxUnavailable.classList.remove('hidden');
  } finally {
    if (tmuxInstalling) tmuxInstalling.classList.add('hidden');
  }
}

// Setup tmux event listeners
if (tmuxEnabledCheckbox) {
  tmuxEnabledCheckbox.addEventListener('change', toggleTmuxMode);
}

if (installTmuxBtn) {
  installTmuxBtn.addEventListener('click', installTmux);
}

// QR code image load handler
qrCode.onload = () => {
  console.log('QR code image loaded successfully');
  if (qrPlaceholder) qrPlaceholder.style.display = 'none';
  qrCode.style.display = 'block';
};

qrCode.onerror = (e) => {
  console.error('QR code image failed to load:', e);
  if (qrPlaceholder) {
    qrPlaceholder.style.display = 'flex';
    qrPlaceholder.textContent = 'Failed to load';
  }
};

// ==================== AI ASSIST FUNCTIONS ====================

// Convert natural language to command
function naturalLanguageToCommand(input) {
  const lowerInput = input.toLowerCase().trim();

  // Check for exact matches first
  if (nlToCommand[lowerInput]) {
    return nlToCommand[lowerInput];
  }

  // Check for partial matches
  for (const [key, command] of Object.entries(nlToCommand)) {
    if (lowerInput.includes(key)) {
      return command;
    }
  }

  // Smart pattern matching
  if (lowerInput.includes('find') && lowerInput.includes('file')) {
    const match = lowerInput.match(/find.*?(\*?\.\w+|\w+\.\w+)/);
    if (match) {
      return `find . -name "${match[1]}" -type f`;
    }
    return 'find . -type f -name';
  }

  if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
    return 'rm -i';
  }

  if (lowerInput.includes('create') && lowerInput.includes('file')) {
    return 'touch';
  }

  if (lowerInput.includes('modified') && lowerInput.includes('today')) {
    return 'find . -type f -mtime 0';
  }

  if (lowerInput.includes('modified') && (lowerInput.includes('24 hour') || lowerInput.includes('yesterday'))) {
    return 'find . -type f -mtime -1';
  }

  if (lowerInput.includes('grep') || lowerInput.includes('search') && lowerInput.includes('content')) {
    return 'grep -r';
  }

  if (lowerInput.includes('todo') || lowerInput.includes('TODO')) {
    return 'grep -rn "TODO" .';
  }

  if (lowerInput.includes('npm') && lowerInput.includes('install')) {
    return 'npm install';
  }

  if (lowerInput.includes('npm') && lowerInput.includes('start')) {
    return 'npm start';
  }

  if (lowerInput.includes('npm') && lowerInput.includes('test')) {
    return 'npm test';
  }

  if (lowerInput.includes('npm') && lowerInput.includes('build')) {
    return 'npm run build';
  }

  // Default: use Claude for complex queries
  return null;
}

// Show Command Center modal
function showCommandCenter() {
  if (commandCenterModal) {
    commandCenterModal.classList.remove('hidden');
    if (commandSearchInput) {
      commandSearchInput.value = '';
      commandSearchInput.focus();
    }
    if (aiResult) aiResult.classList.add('hidden');
    renderSnippets('all', '');
  }
}

// Hide Command Center modal
function hideCommandCenter() {
  if (commandCenterModal) {
    commandCenterModal.classList.add('hidden');
  }
}

// Generate command from natural language
function generateCommand() {
  const input = commandSearchInput?.value?.trim();
  if (!input) {
    showToast('Please enter a description', 'error');
    return;
  }

  const command = naturalLanguageToCommand(input);

  if (command) {
    if (aiCommandOutput) aiCommandOutput.textContent = command;
    if (aiResult) aiResult.classList.remove('hidden');
  } else {
    // For complex queries, suggest using Claude
    showToast('Try Claude Code for complex requests', 'info');
    hideCommandCenter();
    showClaudeCodeModal();
    if (claudePromptInput) {
      claudePromptInput.value = `Help me with: ${input}`;
    }
  }
}

// Run the generated command
function runGeneratedCommand() {
  const command = aiCommandOutput?.textContent;
  if (command && currentSessionId) {
    ipcRenderer.invoke('terminal-input', currentSessionId, command + '\r');
    hideAiAssistModal();
    if (terminal) terminal.focus();
    showToast('Command executed', 'success');
  } else if (!currentSessionId) {
    showToast('Create a session first', 'error');
  }
}

// Copy AI result to clipboard
function copyAiResult() {
  const command = aiCommandOutput?.textContent;
  if (command) {
    navigator.clipboard.writeText(command);
    showToast('Command copied', 'success');
  }
}

// Show smart suggestions
function showSmartSuggestions(suggestions) {
  if (!smartSuggestions || !suggestionsList) return;

  suggestionsList.innerHTML = suggestions.map(s => `
    <div class="suggestion-item" data-command="${escapeHtml(s.command)}">
      <span class="suggestion-icon">${s.icon}</span>
      <span class="suggestion-text">${escapeHtml(s.text)}</span>
      <span class="suggestion-command">${escapeHtml(s.command)}</span>
    </div>
  `).join('');

  smartSuggestions.classList.remove('hidden');
}

// Hide smart suggestions
function hideSmartSuggestions() {
  if (smartSuggestions) {
    smartSuggestions.classList.add('hidden');
  }
}


// Render snippets by category
function renderSnippets(category, searchTerm = '') {
  if (!snippetsList) return;

  let filtered = smartSnippets;

  if (category !== 'all') {
    filtered = filtered.filter(s => s.category === category);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.command.toLowerCase().includes(term)
    );
  }

  snippetsList.innerHTML = filtered.map(s => `
    <div class="snippet-item" data-command="${escapeHtml(s.command)}">
      <span class="snippet-icon">${s.icon}</span>
      <div class="snippet-content">
        <div class="snippet-name">${escapeHtml(s.name)}</div>
        <div class="snippet-description">${escapeHtml(s.description)}</div>
        <div class="snippet-command">${escapeHtml(s.command)}</div>
      </div>
    </div>
  `).join('');
}

// Execute snippet command
function executeSnippet(command) {
  if (command && currentSessionId) {
    ipcRenderer.invoke('terminal-input', currentSessionId, command + '\r');
    hideSnippetsModal();
    if (terminal) terminal.focus();
    showToast('Command executed', 'success');
  } else if (!currentSessionId) {
    showToast('Create a session first', 'error');
  }
}

// Analyze terminal output for suggestions
function analyzeTerminalOutput(output) {
  const suggestions = [];

  // Error detection
  if (output.includes('command not found') || output.includes('not recognized')) {
    suggestions.push({
      icon: '❓',
      text: 'Command not found - check spelling or install package',
      command: 'which'
    });
  }

  if (output.includes('permission denied')) {
    suggestions.push({
      icon: '🔐',
      text: 'Permission denied - try with sudo',
      command: 'sudo !!'
    });
  }

  if (output.includes('No such file or directory')) {
    suggestions.push({
      icon: '📁',
      text: 'File not found - list available files',
      command: 'ls -la'
    });
  }

  if (output.includes('fatal: not a git repository')) {
    suggestions.push({
      icon: '🌿',
      text: 'Not a git repo - initialize one',
      command: 'git init'
    });
  }

  return suggestions;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
