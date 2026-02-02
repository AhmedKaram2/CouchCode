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

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Screenshots](#-screenshots) • [FAQ](#-faq--troubleshooting) • [Contributing](#-contributing) • [Roadmap](#-roadmap)

---

</div>

## 🎯 Why CouchCode?

Ever wanted to run a quick terminal command but your laptop is across the room? Or check on a long-running process without getting up? **CouchCode** lets you control your computer's terminal from your phone, tablet, or any device with a browser.

Perfect for:
- 🏠 **Remote developers** - Access your dev machine from anywhere in your home
- 📱 **Mobile monitoring** - Check build status, logs, or server health from your phone
- 🤖 **AI pair programming** - Use with Claude Code, Copilot, or other AI coding assistants
- 💻 **Multi-device workflows** - Seamlessly switch between devices

## ✨ Features

> **🎉 New in v1.3.0:** Universal CLI tool support! All user-installed CLI tools (Claude, pipx, cargo, etc.) now work automatically across all platforms.

**🌐 Remote Access**
- Browser-based interface with PWA support for mobile
- Real-time sync via WebSocket
- Session persistence across reconnects

**🔒 Security**
- PIN authentication with JWT tokens
- Local network only - your data stays private
- No cloud or third-party servers required

**📱 Mobile Optimized**
- Calculator-style keyboard with quick actions (Ctrl+C, Tab, arrows)
- Voice input and text-to-speech
- Smart yes/no prompt detection

**🖥️ Cross-Platform**
- **Windows:** PowerShell, CMD, Git Bash, WSL
- **macOS:** Zsh, Bash, Fish
- **Linux:** All major shells supported
- **Universal CLI Support:** Login shells load user profiles automatically - Claude CLI, pipx, cargo, and other tools work out of the box

**🔌 IDE Integration**
- **VSCode Extension** with embedded terminal panel and sidebar
- **Status bar** integration for quick access
- Command palette control

> Install VSCode Extension: Search "CouchCode" in Extensions Marketplace

**🤖 AI Integration**
- Split view with Vibe-Kanban task board
- Quick commands for AI coding assistants
- Perfect companion for Claude Code

## 📦 Installation

### Download Installer

| Platform | Download | Size |
|----------|----------|------|
| **macOS (Apple Silicon)** | [CouchCode-1.3.0-mac-arm64.dmg](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-mac-arm64.dmg) | 93 MB |
| **macOS (Intel)** | [CouchCode-1.3.0-mac-x64.dmg](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-mac-x64.dmg) | 99 MB |
| **Windows (64-bit)** | [CouchCode-1.3.0-win-x64.exe](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-win-x64.exe) | 77 MB |
| **Windows (32-bit)** | [CouchCode-1.3.0-win-ia32.exe](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-win-ia32.exe) | 68 MB |
| **Linux (Universal)** | [CouchCode-1.3.0-linux-x86_64.AppImage](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-linux-x86_64.AppImage) | 102 MB |
| **Linux (Debian/Ubuntu)** | [CouchCode-1.3.0-linux-amd64.deb](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-linux-amd64.deb) | 71 MB |

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

## 📁 Project Structure

```
CouchCode/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js     # App entry point
│   │   ├── server.js   # Express + WebSocket server
│   │   ├── pty-manager.js  # Terminal session management
│   │   └── tray.js     # System tray integration
│   ├── renderer/       # Desktop UI
│   └── client/         # PWA web interface
│       ├── app.js      # Main application logic
│       ├── terminal.js # xterm.js wrapper
│       └── styles.css  # Mobile-first responsive styles
├── build/              # App icons and assets
├── scripts/            # Build automation
└── dist/               # Generated installers
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
- Check settings URL matches app (default: `http://localhost:3847`)

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

## 🗺️ Roadmap

**✅ Completed (v1.3.0)**
- Universal CLI tool support with login shells
- Enhanced PATH configuration
- VSCode extension

**🚧 In Progress**
- JetBrains IDEs plugin
- Terminal recording/playback
- Enhanced session management

**📋 Planned**
- Multi-user support & team collaboration
- SSH tunneling for remote access
- Command history search
- Themes & customization
- Vim mode & file transfer
- Terminal multiplexing (tmux-like)

💡 **Have ideas?** [Open a discussion](https://github.com/AhmedKaram2/CouchCode/discussions)

## 📝 Changelog

**Latest:** v1.3.0 - [Release Notes](https://github.com/AhmedKaram2/CouchCode/releases/tag/v1.3.0) • [Full History](CHANGELOG.md)

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
