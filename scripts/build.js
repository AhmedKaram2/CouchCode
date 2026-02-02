#!/usr/bin/env node

/**
 * Build Script for Terminal Remote
 * Creates installers for Windows, macOS, and Linux
 *
 * Usage:
 *   node scripts/build.js [platform]
 *
 * Platforms:
 *   all     - Build for all platforms (default)
 *   win     - Windows (NSIS installer + portable)
 *   mac     - macOS (DMG + ZIP)
 *   linux   - Linux (AppImage + DEB + RPM)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const rootDir = path.join(__dirname, '..');
const platform = process.argv[2] || 'current';
const currentPlatform = os.platform();

console.log('╔════════════════════════════════════════╗');
console.log('║     Terminal Remote Build Script       ║');
console.log('╚════════════════════════════════════════╝\n');

// Check if running on correct platform for native builds
function checkPlatform(target) {
  if (target === 'all') {
    console.log('⚠️  Building for all platforms requires:');
    console.log('   - macOS for .dmg and .icns');
    console.log('   - Windows for .exe (or Wine on Linux/macOS)');
    console.log('   - Linux for .AppImage, .deb, .rpm\n');
    console.log('   Cross-compilation may have limitations.\n');
    return true;
  }
  return true;
}

// Step 1: Install dependencies
function installDependencies() {
  console.log('📦 Installing dependencies...\n');
  try {
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('\n✅ Dependencies installed\n');
    return true;
  } catch (e) {
    console.error('❌ Failed to install dependencies');
    return false;
  }
}

// Step 2: Rebuild native modules
function rebuildNative() {
  console.log('🔧 Rebuilding native modules (node-pty)...\n');
  try {
    execSync('npm run rebuild', { cwd: rootDir, stdio: 'inherit' });
    console.log('\n✅ Native modules rebuilt\n');
    return true;
  } catch (e) {
    console.error('❌ Failed to rebuild native modules');
    console.log('   Try running: npm run rebuild manually\n');
    return false;
  }
}

// Step 3: Generate icons
function generateIcons() {
  console.log('🎨 Generating icons...\n');
  try {
    execSync('node scripts/generate-icons.js', { cwd: rootDir, stdio: 'inherit' });
    console.log('\n✅ Icons generated\n');
    return true;
  } catch (e) {
    console.error('❌ Failed to generate icons');
    console.log('   Icons will use placeholders\n');
    return true; // Continue anyway
  }
}

// Step 4: Build for platform
function buildForPlatform(target) {
  console.log(`🏗️  Building for ${target}...\n`);

  let cmd;
  switch (target) {
    case 'win':
    case 'windows':
      cmd = 'npm run build:win';
      break;
    case 'mac':
    case 'macos':
    case 'darwin':
      cmd = 'npm run build:mac';
      break;
    case 'linux':
      cmd = 'npm run build:linux';
      break;
    case 'all':
      cmd = 'npm run build:all';
      break;
    case 'current':
    default:
      // Build for current platform
      if (currentPlatform === 'darwin') {
        cmd = 'npm run build:mac';
        target = 'macOS';
      } else if (currentPlatform === 'win32') {
        cmd = 'npm run build:win';
        target = 'Windows';
      } else {
        cmd = 'npm run build:linux';
        target = 'Linux';
      }
  }

  try {
    execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
    console.log(`\n✅ Build complete for ${target}\n`);
    return true;
  } catch (e) {
    console.error(`❌ Build failed for ${target}`);
    return false;
  }
}

// Step 5: Show output
function showOutput() {
  const distDir = path.join(rootDir, 'dist');

  if (!fs.existsSync(distDir)) {
    console.log('📁 No dist directory found\n');
    return;
  }

  console.log('📁 Build output:\n');

  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const ext = path.extname(file).toLowerCase();

      let icon = '📄';
      if (ext === '.dmg') icon = '🍎';
      else if (ext === '.exe' || ext === '.msi') icon = '🪟';
      else if (ext === '.appimage' || ext === '.deb' || ext === '.rpm') icon = '🐧';
      else if (ext === '.zip') icon = '📦';

      console.log(`   ${icon} ${file} (${sizeMB} MB)`);
    }
  });

  console.log(`\n📂 Location: ${distDir}\n`);
}

// Main
async function main() {
  console.log(`Platform: ${platform}`);
  console.log(`Current OS: ${currentPlatform}\n`);

  checkPlatform(platform);

  if (!installDependencies()) {
    process.exit(1);
  }

  if (!rebuildNative()) {
    console.log('⚠️  Continuing without rebuild...\n');
  }

  if (!generateIcons()) {
    console.log('⚠️  Continuing with placeholder icons...\n');
  }

  if (!buildForPlatform(platform)) {
    process.exit(1);
  }

  showOutput();

  console.log('╔════════════════════════════════════════╗');
  console.log('║           Build Complete! 🎉           ║');
  console.log('╚════════════════════════════════════════╝\n');
}

main().catch(console.error);
