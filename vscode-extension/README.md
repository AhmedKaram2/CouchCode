# CouchCode for VSCode

Control your terminal remotely from anywhere, directly inside VSCode! This extension integrates [CouchCode](https://github.com/AhmedKaram2/CouchCode) into Visual Studio Code, giving you access to remote terminal sessions right in your editor.

## 🎯 Features

- **Remote Terminal Access** - Access your computer's terminal from your phone, tablet, or any browser
- **Embedded in VSCode** - No need to switch between applications
- **Real-time Sync** - Instant command execution via WebSocket
- **Multi-Session Support** - Manage multiple terminal sessions
- **Cross-Platform** - Works on Windows, macOS, and Linux

## 📦 Prerequisites

Before using this extension, you need to have **CouchCode** installed and running on your system.

### Installing CouchCode

Download the installer for your platform:

| Platform | Download |
|----------|----------|
| **macOS (Apple Silicon)** | [Download](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-mac-arm64.dmg) |
| **macOS (Intel)** | [Download](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-mac-x64.dmg) |
| **Windows (64-bit)** | [Download](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-win-x64.exe) |
| **Linux (AppImage)** | [Download](https://github.com/AhmedKaram2/CouchCode/releases/download/v1.3.0/CouchCode-1.3.0-linux-x86_64.AppImage) |

## 🚀 Usage

### 1. Start CouchCode App

Launch the CouchCode desktop application on your computer. It will start a local server (usually at `http://localhost:3847`).

### 2. Open CouchCode Panel in VSCode

Use one of these methods:

- **Command Palette**: Press `Cmd/Ctrl+Shift+P` and search for `CouchCode: Open Remote Terminal Panel`
- **Command**: Run `CouchCode: Connect to Server` to configure and connect

### 3. Access from Mobile/Other Devices

- Click the **QR Code** button in the CouchCode desktop app
- Scan with your phone camera
- Create terminal sessions and control them remotely!

## ⚙️ Configuration

Configure the extension via VSCode settings:

```json
{
  // CouchCode server URL (default: http://localhost:3847)
  "couchcode.serverUrl": "http://localhost:3847",

  // Automatically connect on VSCode startup
  "couchcode.autoConnect": false,

  // PIN for authentication (leave empty to be prompted)
  "couchcode.pin": ""
}
```

## 🎹 Commands

| Command | Description |
|---------|-------------|
| `CouchCode: Open Remote Terminal Panel` | Opens the CouchCode panel in VSCode |
| `CouchCode: Connect to Server` | Configure and connect to CouchCode server |
| `CouchCode: Disconnect` | Disconnect from the server |
| `CouchCode: Show QR Code for Mobile Connection` | Display server URL for mobile access |

## 🔧 How It Works

1. **CouchCode Desktop App** runs a local server that hosts terminal sessions
2. **VSCode Extension** embeds the CouchCode web interface in a WebView panel
3. **Mobile/Browser Clients** can connect to the same server and control terminals
4. All clients stay synchronized in real-time via WebSocket

## 🐛 Troubleshooting

### "Cannot connect to CouchCode server"

- Make sure the CouchCode desktop application is running
- Check that the server URL in settings matches the URL shown in the CouchCode app
- Default URL is `http://localhost:3847`

### Connection refused on custom server URL

- If using a custom IP address, make sure your firewall allows connections on port 3847
- Try using `http://localhost:3847` for local connections

## 📝 License

MIT License - see the [LICENSE](https://github.com/AhmedKaram2/CouchCode/blob/main/LICENSE) file

## 🙏 Credits

Built on top of [CouchCode](https://github.com/AhmedKaram2/CouchCode) - Control Your Terminal From Anywhere

## 🔗 Links

- [CouchCode GitHub Repository](https://github.com/AhmedKaram2/CouchCode)
- [Report Issues](https://github.com/AhmedKaram2/CouchCode/issues)
- [CouchCode Releases](https://github.com/AhmedKaram2/CouchCode/releases)

---

Made with ❤️ and ☕ from the couch
