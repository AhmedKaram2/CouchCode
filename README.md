<div align="center">

# 🛋️ CouchCode

### Code From Your Couch - Control Your Terminal From Anywhere

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/AhmedKaram2/CouchCode)](https://github.com/AhmedKaram2/CouchCode/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#installation)
[![Electron](https://img.shields.io/badge/Electron-28.x-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![VSCode Extension](https://img.shields.io/badge/VSCode-Extension-blue.svg?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=AhmedMahmoudKaram.couchcode-vscode)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/AhmedKaram2/CouchCode/pulls)

<p align="center">
  <strong>Access your computer's terminal remotely from any device with a web browser.</strong>
</p>

<p align="center">
  <em>Because the best code is written from the comfort of your couch.</em> 🛋️
</p>

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [IDE Integration](#-ide-integration) • [Auto-Approve](#-auto-approve) • [CLI Tool](#-cli-tool) • [FAQ](#-faq--troubleshooting) • [Contributing](#-contributing) • [Roadmap](#-roadmap)

---

</div>

## 🎯 Why CouchCode?

Ever wanted to run a quick terminal command but your laptop is across the room? Or check on a long-running process without getting up? **CouchCode** lets you control your computer's terminal from your phone, tablet, or any device with a browser.

Perfect for:
- 🏠 **Remote developers** - Access your dev machine from anywhere in your home
- 📱 **Mobile monitoring** - Check build status, logs, or server health from your phone
- 🤖 **AI pair programming** - Use with Claude Code, Copilot, or other AI coding assistants
- 💻 **Multi-device workflows** - Seamlessly switch between devices
- 🔌 **IDE power users** - Connect from VSCode, JetBrains, Vim/Neovim, or Sublime Text

## ✨ Features

> **🎉 New:** Auto-approve for trusted devices, universal IDE support (VSCode, JetBrains, Vim, Sublime), CLI connector, and API token authentication!

### 🔐 Auto-Approve & Trusted Devices *(New!)*
- **Skip PIN on trusted devices** - Check "Trust this device" when logging in
- **Localhost auto-approve** - IDE and CLI connections from localhost authenticate automatically
- **API tokens** - Generate long-lived tokens for IDE plugins (no PIN needed)
- **Device management** - View, remove, and expire trusted devices from settings
- **Configurable expiry** - Set how long devices stay trusted (1-365 days)

### 🔌 Universal IDE Integration *(New!)*
- **VSCode** - Native terminal provider, API token auth, auto-reconnect, `Ctrl+Shift+C` keybinding
- **JetBrains** - Full plugin for IntelliJ, WebStorm, PyCharm, GoLand (tool window, settings, status bar)
- **Vim/Neovim** - `:CouchCode` command with full terminal support
- **Sublime Text** - Command palette integration
- **Any editor** - Universal CLI tool works from any terminal

### 🖥️ CLI Connector *(New!)*
```bash
couchcode connect                        # Interactive terminal
couchcode exec "git status"              # Run a command
couchcode sessions                       # List active sessions
couchcode config set apiToken YOUR_TOKEN # Save credentials
```

### 🎨 Full App Theming
- 8 beautiful themes: Dark, Light, Monokai, Dracula, Nord, Solarized, Gruvbox, Tokyo Night
- Theme applies to entire app UI, not just terminal
- Instant theme switching in settings

### 🧠 AI Command Center
- Natural language to terminal command conversion
- 150+ smart snippets organized by category
- Quick access to Git, Docker, Kubernetes, NPM, Python commands
- Intelligent command search and filtering
- One-click copy and execute

### 🌐 Remote Access
- Browser-based interface with PWA support for mobile
- Real-time sync via WebSocket
- Session persistence across reconnects

### 🔒 Security
- PIN authentication with JWT tokens
- Rate limiting (5 attempts, 30s lockout)
- Local network only - your data stays private
- No cloud or third-party servers required
- Input validation and security headers

### 📱 Mobile Optimized
- Calculator-style keyboard with quick actions (Ctrl+C, Tab, arrows)
- Voice input and text-to-speech
- Smart yes/no prompt detection
- Screen wake-lock to keep device active

### 🖥️ Cross-Platform
- **Windows:** PowerShell, CMD, Git Bash, WSL
- **macOS:** Zsh, Bash, Fish
- **Linux:** All major shells supported
- **Universal CLI Support:** Login shells load user profiles automatically - Claude CLI, pipx, cargo, and other tools work out of the box

### 🤖 AI Integration
- Split view with Vibe-Kanban task board
- Quick commands for AI coding assistants
- Perfect companion for Claude Code

## 📦 Installation

### Download Installer

| Platform | Download | Size |
|----------|----------|------|
| **macOS (Apple Silicon)** | [CouchCode-1.6.0-mac-arm64.dmg](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.6.0/CouchCode-1.6.0-mac-arm64.dmg) | ~93 MB |
| **macOS (Intel)** | [CouchCode-1.6.0-mac-x64.dmg](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.6.0/CouchCode-1.6.0-mac-x64.dmg) | ~99 MB |
| **Windows (64-bit)** | [CouchCode-1.6.0-win-x64.exe](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.6.0/CouchCode-1.6.0-win-x64.exe) | ~77 MB |
| **Windows (32-bit)** | [CouchCode-1.6.0-win-ia32.exe](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.6.0/CouchCode-1.6.0-win-ia32.exe) | ~68 MB |
| **Linux (Universal)** | [CouchCode-1.6.0-linux-x86_64.AppImage](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.6.0/CouchCode-1.6.0-linux-x86_64.AppImage) | ~102 MB |
| **Linux (Debian/Ubuntu)** | [CouchCode-1.6.0-linux-amd64.deb](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.6.0/CouchCode-1.6.0-linux-amd64.deb) | ~71 MB |

> **[View all releases](https://github.com/AhmedKaram2/CouchCode/releases)**

### macOS Installation Notes

**⚠️ Important: Choose the Correct Architecture**
- **Apple Silicon** (M1/M2/M3/M4): Download `arm64` version
- **Intel Mac**: Download `x64` version
- Using the wrong version will cause session creation to fail

**🔓 Fix Security Warnings**

Since the app is not code-signed, macOS will show security warnings:

**If you see "app is damaged and can't be opened":**
```bash
xattr -cr /Applications/CouchCode.app
```

**If you see "unidentified developer":**
1. Open **System Preferences** → **Security & Privacy**
2. Click **Open Anyway** next to the CouchCode message

### Build From Source

Want to contribute or customize? See [Contributing](#-contributing) for development setup instructions.

## 🚀 Quick Start

1. **Launch CouchCode** - The app starts a server on your local network
2. **Connect from any device** - Scan the QR code or enter the URL (e.g., `http://192.168.1.100:3847`)
3. **Set your PIN** - Create a 4-8 character PIN for authentication
4. **Start coding!** - Create terminal sessions and run commands remotely 🎉

**Install as PWA:** Add to home screen on mobile for the best experience ([instructions below](#-install-as-mobile-app))

## 🔐 Auto-Approve

Auto-approve lets you skip PIN authentication for trusted connections. This is especially useful for IDE integrations and frequent use.

### Trusted Devices

When logging in from a mobile device or browser, check **"Trust this device"** to skip PIN next time. Manage trusted devices from **Settings > Auto-Approve** in the desktop app.

### Localhost Auto-Approve

Connections from `localhost` (127.0.0.1) are auto-approved by default. This means IDE extensions and the CLI tool running on the same machine connect instantly without a PIN. Toggle this in **Settings > Auto-Approve > Auto-approve localhost connections**.

### API Tokens

For IDE plugins and automation, generate API tokens that never expire (until revoked):

1. Open **Settings > IDE Integration** in the desktop app
2. Enter a name (e.g., "VSCode", "JetBrains") and click **Generate**
3. The token is copied to your clipboard - save it securely
4. Use it in your IDE settings or CLI config

## 🖥️ CLI Tool

The CouchCode CLI lets you connect from any terminal or IDE. It works standalone - no desktop app UI needed.

### Install

```bash
# From the CouchCode repo
cd cli && npm install -g .

# Or use npx (no install needed)
npx couchcode-cli connect
```

### Usage

```bash
# Interactive terminal session
couchcode connect

# Connect to a remote machine
couchcode connect --url http://192.168.1.100:3847

# Execute a single command
couchcode exec "git status"
couchcode exec "docker ps"

# List active sessions
couchcode sessions
couchcode sessions --json

# Check server status
couchcode status

# Save configuration
couchcode config set serverUrl http://192.168.1.100:3847
couchcode config set apiToken YOUR_TOKEN_HERE
```

Config is stored in `~/.couchcode/config.json`.

## 🔌 IDE Integration

CouchCode works with all major IDEs and editors. Each integration supports API token auth and auto-approve for a seamless experience.

### VSCode

**Install:** Search "CouchCode" in the Extensions Marketplace

**Features:**
- Embedded terminal panel (iframe-based)
- Native remote terminal (`Ctrl+Shift+C` / `Cmd+Shift+C`)
- Session tree view in sidebar
- Status bar with connection indicator
- Auto-connect on startup
- Auto-reconnect with exponential backoff

**Settings** (`settings.json`):
```json
{
  "couchcode.serverUrl": "http://localhost:3847",
  "couchcode.apiToken": "your-token-here",
  "couchcode.autoConnect": true,
  "couchcode.autoApprove": true
}
```

**Commands:**
| Command | Shortcut | Description |
|---------|----------|-------------|
| CouchCode: Open Remote Terminal Panel | `Ctrl+Shift+C` | Open terminal in panel |
| CouchCode: Open Native Remote Terminal | - | Native VS Code terminal backed by CouchCode |
| CouchCode: Connect to Server | - | Configure and connect |
| CouchCode: Open in Browser | - | Open in default browser |

### JetBrains (IntelliJ, WebStorm, PyCharm, GoLand, etc.)

**Status:** Plugin scaffold available in `jetbrains-plugin/`

**Features:**
- Tool window with embedded CouchCode web UI
- Settings panel (Tools > CouchCode)
- WebSocket-based terminal client
- Status bar widget
- `Ctrl+Shift+C` keyboard shortcut

**Setup:**
1. Build: `cd jetbrains-plugin && ./gradlew buildPlugin`
2. Install: Settings > Plugins > Install from Disk
3. Configure: Settings > Tools > CouchCode > Enter server URL and API token

### Vim / Neovim

**Install:**
```vim
" Add to your .vimrc or init.vim
source /path/to/CouchCode/editor-plugins/vim/couchcode.vim

" Or with a plugin manager (vim-plug):
Plug '/path/to/CouchCode/editor-plugins/vim'
```

**Configuration:**
```vim
let g:couchcode_server_url = 'http://localhost:3847'
let g:couchcode_token = 'your-api-token'
```

**Commands:**
| Command | Description |
|---------|-------------|
| `:CouchCode` | Open interactive remote terminal |
| `:CouchCodeExec <cmd>` | Execute a command |
| `:CouchCodeSessions` | List active sessions |
| `:CouchCodeStatus` | Show server status |

**Suggested keybindings:**
```vim
nnoremap <leader>cc :CouchCode<CR>
nnoremap <leader>ce :CouchCodeExec<Space>
nnoremap <leader>cs :CouchCodeSessions<CR>
```

### Sublime Text

**Install:** Copy files from `editor-plugins/sublime/` to your Sublime `Packages/User/` directory.

**Commands (Command Palette):**
- `CouchCode: Open Remote Terminal`
- `CouchCode: Execute Command`
- `CouchCode: List Sessions`
- `CouchCode: Show Status`
- `CouchCode: Open in Browser`

**Settings** (`CouchCode.sublime-settings`):
```json
{
  "server_url": "http://localhost:3847",
  "api_token": "your-api-token"
}
```

### Any Other Editor

Use the [CLI tool](#-cli-tool) from any editor's built-in terminal:
```bash
couchcode connect --token YOUR_TOKEN
```

## 📱 Install as Mobile App

Add to your home screen for a native-like experience:
- **iOS:** Safari → Share → "Add to Home Screen"
- **Android:** Chrome → Menu → "Add to Home screen"

## 🎹 Quick Actions

The mobile keyboard includes these shortcuts:

| Button | Action | Description |
|--------|--------|-------------|
| ✓ Yes | `y` + Enter | Confirm prompts |
| ✗ No | `n` + Enter | Decline prompts |
| ↵ | Enter | Execute command |
| ^C | Ctrl+C | Cancel/Interrupt |
| ^D | Ctrl+D | EOF/Exit |
| ^Z | Ctrl+Z | Suspend process |
| Tab | Tab | Auto-complete |
| ⌫ | Backspace | Delete character |
| ↑↓←→ | Arrows | Navigate history/cursor |

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop App | Electron 28 |
| Terminal | node-pty + xterm.js |
| Server | Express + WebSocket |
| Frontend | Vanilla JS + PWA |
| Auth | JWT + bcrypt |
| CLI | Node.js |
| VSCode Extension | VS Code API + WebView |
| JetBrains Plugin | Kotlin + IntelliJ Platform SDK |

## 📁 Project Structure

```
CouchCode/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.js        # App entry point + IPC handlers
│   │   ├── server.js      # Express + WebSocket server
│   │   ├── auth.js        # PIN, JWT, auto-approve, API tokens
│   │   ├── config.js      # Settings persistence (electron-store)
│   │   ├── pty-manager.js # Terminal session management
│   │   └── tray.js        # System tray integration
│   ├── renderer/          # Desktop UI
│   │   ├── index.html     # Desktop window (settings, themes, IDE integration)
│   │   ├── app.js         # Desktop UI logic
│   │   └── styles.css     # Desktop styles
│   └── client/            # PWA web interface
│       ├── index.html     # Mobile/web UI
│       ├── app.js         # Main PWA logic (auto-approve, URL auth)
│       ├── terminal.js    # xterm.js wrapper
│       └── styles.css     # Mobile-first responsive styles
├── cli/                   # Universal CLI connector
│   ├── couchcode          # CLI entry point
│   └── package.json       # CLI package
├── vscode-extension/      # VSCode IDE extension
│   └── src/
│       ├── extension.js   # Extension entry point
│       ├── couchCodePanel.js      # WebView panel
│       ├── couchCodeTerminal.js   # Native terminal provider
│       └── sessionsTreeProvider.js # Sidebar tree view
├── jetbrains-plugin/      # JetBrains IDE plugin (Kotlin)
│   └── src/main/kotlin/com/couchcode/plugin/
│       ├── CouchCodeClient.kt     # WebSocket client
│       ├── CouchCodeSettings.kt   # Plugin settings
│       ├── CouchCodeToolWindowFactory.kt # Tool window
│       └── actions/               # IDE actions
├── editor-plugins/        # Other editor integrations
│   ├── vim/couchcode.vim  # Vim/Neovim plugin
│   └── sublime/           # Sublime Text plugin
├── build/                 # App icons and assets
├── scripts/               # Build automation
└── dist/                  # Generated installers
```

## 📸 Screenshots

<div align="center">

### Desktop App
<img src="screenshots/desktop-main.png" alt="Desktop Main Window" width="700"/>
<p><em>Main desktop window with QR code for easy mobile connection</em></p>

### Mobile Terminal
<table>
  <tr>
    <td align="center">
      <img src="screenshots/mobile-terminal.png" alt="Mobile Terminal" width="280"/>
      <p><em>Full terminal access from your phone</em></p>
    </td>
    <td align="center">
      <img src="screenshots/mobile-keyboard.png" alt="Quick Keyboard" width="280"/>
      <p><em>Calculator-style quick action keyboard</em></p>
    </td>
  </tr>
</table>

### AI Command Center
<img src="screenshots/command-center.png" alt="AI Command Center" width="700"/>
<p><em>150+ smart snippets with natural language search</em></p>

### Claude Code Integration
<img src="screenshots/claude-code.png" alt="Claude Code Integration" width="350"/>
<p><em>Quick access to AI coding assistant</em></p>

### Split View with Kanban
<img src="screenshots/split-kanban.png" alt="Split View Kanban" width="700"/>
<p><em>Terminal + Vibe-Kanban side by side</em></p>

</div>

> **Note:** To add your own screenshots, save images to the `screenshots/` folder and they'll appear here.

## ❓ FAQ / Troubleshooting

**Cannot connect from mobile?**
- Ensure both devices are on the **same WiFi network**
- Check firewall allows connections on **port 3847**
- Use computer's IP address (not localhost)

**"Command not found" for CLI tools?**
- ✅ **Fixed in v1.3.0!** All CLI tools now work automatically
- Update to latest version for login shell initialization

**VSCode extension can't connect?**
- Verify CouchCode desktop app is **running**
- Check `couchcode.serverUrl` in VS Code settings (default: `http://localhost:3847`)
- Try setting an API token: Settings > IDE Integration > Generate token, then set `couchcode.apiToken`

**Auto-approve not working?**
- **Localhost:** Ensure "Auto-approve localhost connections" is checked in Settings > Auto-Approve
- **Trusted devices:** The device must have been trusted via the "Trust this device" checkbox during a previous successful PIN login
- **API tokens:** Generate a token in Settings > IDE Integration, then configure it in your IDE

**JetBrains plugin can't connect?**
- Build the plugin: `cd jetbrains-plugin && ./gradlew buildPlugin`
- Configure server URL and API token in Settings > Tools > CouchCode
- Ensure the CouchCode desktop app is running

**macOS security warnings?**
- **"App is damaged":** Run `xattr -cr /Applications/CouchCode.app`
- **"Unidentified developer":** System Preferences → Security & Privacy → Open Anyway
- **Session creation fails:** Download correct architecture (M1/M2/M3 = `arm64`, Intel = `x64`)

## 🤝 Contributing

Contributions welcome! Here's how to help:

- 🐛 **Report bugs** - [Open an issue](https://github.com/AhmedKaram2/CouchCode/issues)
- 💡 **Suggest features** - [Start a discussion](https://github.com/AhmedKaram2/CouchCode/discussions)
- 📝 **Improve docs** - Fix typos, add examples
- 🔧 **Submit PRs** - Bug fixes, new features, improvements

**Development Setup:**
```bash
git clone https://github.com/AhmedKaram2/CouchCode.git
cd CouchCode
npm install
npm start                # Development mode
npm run installer        # Build installers
```

**VSCode Extension:**
```bash
cd vscode-extension && npm install && code .
# Press F5 to launch Extension Development Host
```

**JetBrains Plugin:**
```bash
cd jetbrains-plugin
./gradlew buildPlugin    # Build
./gradlew runIde         # Run in sandbox IDE
```

**CLI Tool:**
```bash
cd cli && npm install -g .
couchcode status         # Verify it works
```

## 🗺️ Roadmap

**✅ Completed**
- Full app theming with 8 themes (v1.6.0)
- AI Command Center with 150+ smart snippets
- Natural language to terminal command conversion
- Universal CLI tool support with login shells
- VSCode extension with embedded terminal
- Auto-approve & trusted devices
- API token authentication for IDEs
- Universal CLI connector
- JetBrains plugin scaffold
- Vim/Neovim and Sublime Text plugins

**🚧 In Progress**
- Terminal recording/playback
- Enhanced session management
- Cloud relay for external network access

**📋 Planned**
- Multi-user support & team collaboration
- SSH tunneling for remote access
- Command history search
- Vim mode & file transfer
- Terminal multiplexing (tmux-like)
- Emacs integration

💡 **Have ideas?** [Open a discussion](https://github.com/AhmedKaram2/CouchCode/discussions)

## 📝 Changelog

**Latest:** v1.6.0 - [Release Notes](https://github.com/AhmedKaram2/CouchCode/releases/tag/v1.6.0) • [Full History](CHANGELOG.md)

### v1.6.0 Highlights
- 🎨 **Full App Theming** - 8 themes that apply to the entire UI
- 🌈 **New Themes** - Nord, Solarized, Gruvbox, Tokyo Night added
- 🔧 **UI Improvements** - Better light theme button contrast

### Unreleased (Current Branch)
- 🔐 **Auto-Approve** - Trusted devices, localhost auto-auth, API tokens
- 🔌 **IDE Integration** - VSCode native terminal, JetBrains plugin, Vim/Neovim, Sublime Text
- 🖥️ **CLI Tool** - Universal connector for any terminal or editor
- 📱 **Trust Device** - "Trust this device" checkbox on mobile login

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [xterm.js](https://xtermjs.org/) - Terminal emulator for the web
- [node-pty](https://github.com/microsoft/node-pty) - Native terminal bindings

---

<div align="center">

**[⬆ Back to Top](#-couchcode)**

Made with ❤️ and ☕ from the couch

<sub>Star ⭐ this repo if you find it useful!</sub>

</div>
