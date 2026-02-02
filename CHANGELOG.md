# Changelog

All notable changes to CouchCode will be documented in this file.

## [1.3.0] - 2026-02-02

### Added
- **Universal CLI Tool Support**: Terminal sessions now properly load user environment across all operating systems
- Enhanced PATH configuration to include common binary locations:
  - `~/.local/bin` for Claude CLI, pipx, and other user-installed tools
  - `~/bin` for custom user binaries
  - NPM global packages, Cargo (Rust), Deno, and Homebrew paths
  - Windows: `%USERPROFILE%\.local\bin` and AppData paths

### Fixed
- **Login Shell Initialization**: All shells now start as login shells to properly load user profiles
  - macOS/Linux Zsh: Uses `-l` flag to load `~/.zprofile` and `~/.zshrc`
  - macOS/Linux Bash: Uses `-l` flag to load `~/.bash_profile` or `~/.profile`
  - Fish: Uses `--login` flag to load config files
  - Git Bash on Windows: Uses `--login -i` for interactive login shell
  - WSL: Uses `--login` flag for proper environment loading
  - PowerShell: Uses `-NoExit` to maintain session
- Resolved "command not found" errors for CLI tools like `claude`, `pipx`, `cargo`, etc.
- Fixed PATH inheritance issues across all supported shells and operating systems

### Technical Details
- Modified `src/main/pty-manager.js` to implement platform-specific login shell initialization
- Added comprehensive PATH augmentation for common user binary locations
- Ensured compatibility with Windows, macOS, and Linux environments

## [1.2.0] - Previous Release

- Initial multi-shell support
- Remote terminal access
- PWA support
- Mobile optimizations
- AI integration features
