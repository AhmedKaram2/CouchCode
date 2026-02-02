#!/usr/bin/env node

/**
 * Icon Generator Script for Terminal Remote
 * Generates all required icons for Windows, macOS, and Linux
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * For best results, install sharp and png2icons:
 *   npm install sharp png2icons --save-dev
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '../build');
const iconsDir = path.join(__dirname, '../src/client/icons');

// Ensure directories exist
[buildDir, iconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// SVG icon source
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <g fill="white">
    <path d="M140 160 L220 256 L140 352" stroke="white" stroke-width="40" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="240" y="320" width="140" height="32" rx="8"/>
  </g>
</svg>`;

// Save SVG
const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log('Created: build/icon.svg');

// Check for sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('\nSharp not installed. Installing...');
  try {
    execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    sharp = require('sharp');
  } catch (err) {
    console.log('\nCould not install sharp automatically.');
    console.log('Please run: npm install sharp --save-dev');
    console.log('Then run this script again.\n');
    createPlaceholderIcons();
    process.exit(0);
  }
}

// Create placeholder icons if sharp fails
function createPlaceholderIcons() {
  console.log('Creating placeholder icons...\n');

  // Minimal valid PNG (green)
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0x10, 0xB9, 0x81, 0x00,
    0x00, 0x00, 0x83, 0x00, 0x81, 0x17, 0xCA, 0x51,
    0x5E, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  fs.writeFileSync(path.join(buildDir, 'icon.png'), png);
  fs.writeFileSync(path.join(buildDir, 'tray-icon.png'), png);
  fs.writeFileSync(path.join(buildDir, 'tray-iconTemplate.png'), png);

  [72, 96, 128, 144, 152, 192, 384, 512].forEach(size => {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  });

  console.log('Placeholder icons created.');
  console.log('For production, install sharp and run again.');
}

async function generateIcons() {
  console.log('\n=== Generating Icons ===\n');

  const svgBuffer = Buffer.from(svgIcon);

  // Generate PNG icons for different sizes
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

  for (const size of sizes) {
    const filename = `icon-${size}.png`;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(buildDir, filename));
    console.log(`Generated: build/${filename}`);
  }

  // Main icon.png (512x512 for Linux)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, 'icon.png'));
  console.log('Generated: build/icon.png');

  // PWA icons
  const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of pwaSizes) {
    const filename = `icon-${size}.png`;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, filename));
    console.log(`Generated: src/client/icons/${filename}`);
  }

  // Tray icons
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(buildDir, 'tray-icon.png'));
  console.log('Generated: build/tray-icon.png');

  // macOS template (for menu bar - should be black/white)
  await sharp(svgBuffer)
    .resize(18, 18)
    .png()
    .toFile(path.join(buildDir, 'tray-iconTemplate.png'));
  console.log('Generated: build/tray-iconTemplate.png');

  // macOS template @2x
  await sharp(svgBuffer)
    .resize(36, 36)
    .png()
    .toFile(path.join(buildDir, 'tray-iconTemplate@2x.png'));
  console.log('Generated: build/tray-iconTemplate@2x.png');

  console.log('\n=== PNG Icons Complete ===\n');

  // Try to generate ICO and ICNS
  await generatePlatformIcons();
}

async function generatePlatformIcons() {
  // Try png2icons for ICO and ICNS
  let png2icons;
  try {
    png2icons = require('png2icons');
  } catch (e) {
    console.log('png2icons not installed. Attempting to install...');
    try {
      execSync('npm install png2icons --save-dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      png2icons = require('png2icons');
    } catch (err) {
      console.log('\nCould not install png2icons.');
      console.log('For Windows .ico and macOS .icns, please use online converters:');
      console.log('  - https://convertico.com/ (PNG to ICO)');
      console.log('  - https://cloudconvert.com/png-to-icns (PNG to ICNS)');
      console.log('\nOr install manually: npm install png2icons --save-dev');
      return;
    }
  }

  console.log('Generating platform-specific icons...\n');

  const pngPath = path.join(buildDir, 'icon-1024.png');
  const pngBuffer = fs.readFileSync(pngPath);

  // Generate Windows ICO
  try {
    const icoBuffer = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, true, true);
    if (icoBuffer) {
      fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
      console.log('Generated: build/icon.ico (Windows)');
    }
  } catch (e) {
    console.log('Could not generate ICO:', e.message);
  }

  // Generate macOS ICNS
  try {
    const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0);
    if (icnsBuffer) {
      fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsBuffer);
      console.log('Generated: build/icon.icns (macOS)');
    }
  } catch (e) {
    console.log('Could not generate ICNS:', e.message);
  }

  console.log('\n=== All Icons Generated ===\n');
  console.log('Icons are ready for building installers!');
  console.log('Run: npm run build:all');
}

// Run
generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  createPlaceholderIcons();
});
