# Building CouchCode Installers

This guide explains how to build installers for Windows, macOS, and Linux.

## Prerequisites

- **Node.js** 18+ (https://nodejs.org/)
- **npm** or **yarn**
- **Git** (for cloning)

### Platform-Specific Requirements

**Windows:**
- Windows 10/11
- Visual Studio Build Tools (for node-pty compilation)

**macOS:**
- macOS 10.15+
- Xcode Command Line Tools (`xcode-select --install`)

**Linux:**
- Ubuntu 20.04+ or equivalent
- Build essentials: `sudo apt install build-essential`
- For AppImage: `sudo apt install libfuse2`

## Quick Build (Current Platform)

```bash
# Install dependencies and build for your current platform
npm run installer
```

This will:
1. Install all dependencies
2. Rebuild native modules (node-pty)
3. Generate icons
4. Create installer for your platform

## Build for Specific Platforms

### Windows

```bash
# On Windows
npm run installer:win

# Output:
#   dist/CouchCode-1.0.0-win-x64.exe     (NSIS Installer)
#   dist/CouchCode-1.0.0-win-x64-portable.exe (Portable)
```

### macOS

```bash
# On macOS
npm run installer:mac

# Output:
#   dist/CouchCode-1.0.0-mac-x64.dmg     (Intel)
#   dist/CouchCode-1.0.0-mac-arm64.dmg   (Apple Silicon)
#   dist/CouchCode-1.0.0-mac-x64.zip
#   dist/CouchCode-1.0.0-mac-arm64.zip
```

### Linux

```bash
# On Linux
npm run installer:linux

# Output:
#   dist/CouchCode-1.0.0-linux-x64.AppImage
#   dist/CouchCode-1.0.0-linux-x64.deb
#   dist/CouchCode-1.0.0-linux-x64.rpm
```

### All Platforms (Cross-compilation)

```bash
npm run installer:all
```

**Note:** Cross-compilation has limitations. For best results, build on each target platform.

## Manual Build Steps

If the automated script fails, try these manual steps:

```bash
# 1. Install dependencies
npm install

# 2. Rebuild node-pty for Electron
npm run rebuild

# 3. Generate icons
npm run icons

# 4. Build
npm run build:mac    # or build:win, build:linux
```

## Troubleshooting

### node-pty compilation fails

**Windows:**
```bash
npm install --global windows-build-tools
npm run rebuild
```

**macOS:**
```bash
xcode-select --install
npm run rebuild
```

**Linux:**
```bash
sudo apt install build-essential python3
npm run rebuild
```

### Icons not generated

Install sharp manually:
```bash
npm install sharp --save-dev
npm run icons
```

### Build fails with "Cannot find module"

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
npm run rebuild
```

## Output Directory

All installers are created in the `dist/` folder:

```
dist/
├── CouchCode-1.0.0-win-x64.exe      # Windows NSIS installer
├── CouchCode-1.0.0-win-portable.exe # Windows portable
├── CouchCode-1.0.0-mac-x64.dmg      # macOS Intel
├── CouchCode-1.0.0-mac-arm64.dmg    # macOS Apple Silicon
├── CouchCode-1.0.0-linux-x64.AppImage
├── CouchCode-1.0.0-linux-x64.deb
└── CouchCode-1.0.0-linux-x64.rpm
```

## Signing (Optional)

### macOS Code Signing

Set environment variables:
```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"
npm run build:mac
```

### Windows Code Signing

Set environment variables:
```bash
set CSC_LINK=path\to\certificate.pfx
set CSC_KEY_PASSWORD=certificate-password
npm run build:win
```

## Distribution

After building, you can distribute the installers:

1. **Windows:** Share the `.exe` file
2. **macOS:** Share the `.dmg` file (or `.zip` for download)
3. **Linux:** 
   - `.AppImage` - Universal, no installation needed
   - `.deb` - For Debian/Ubuntu: `sudo dpkg -i couchcode.deb`
   - `.rpm` - For Fedora/RHEL: `sudo rpm -i couchcode.rpm`

## Version Update

To update the version before building:

1. Edit `package.json` and change `"version": "1.0.0"` to your new version
2. Run the build script again

