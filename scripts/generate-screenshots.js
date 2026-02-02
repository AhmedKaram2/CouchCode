#!/usr/bin/env node

/**
 * Screenshot Generator for CouchCode
 * Creates mockup screenshots for README
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const screenshotsDir = path.join(__dirname, '../screenshots');

// Ensure directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Color palette (matching app styles)
const colors = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceLight: '#1a1a24',
  surfaceElevated: '#22222e',
  primary: '#10b981',
  primaryDark: '#059669',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#2d2d3a'
};

// Desktop Main Screenshot (1280x800)
const desktopMainSvg = `
<svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.primaryDark}"/>
    </linearGradient>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.orange}"/>
      <stop offset="100%" style="stop-color:#ea580c"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1280" height="800" fill="${colors.bg}"/>

  <!-- macOS Title Bar -->
  <rect width="1280" height="28" fill="${colors.surface}"/>
  <circle cx="20" cy="14" r="6" fill="#ff5f57"/>
  <circle cx="40" cy="14" r="6" fill="#febc2e"/>
  <circle cx="60" cy="14" r="6" fill="#28c840"/>
  <text x="640" y="18" text-anchor="middle" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">CouchCode</text>

  <!-- Header -->
  <rect y="28" width="1280" height="56" fill="${colors.surface}"/>
  <rect y="83" width="1280" height="1" fill="${colors.border}"/>

  <!-- Sessions button -->
  <rect x="16" y="40" width="44" height="44" rx="12" fill="transparent"/>
  <text x="38" y="68" text-anchor="middle" fill="${colors.textPrimary}" font-size="20">☰</text>
  <circle cx="52" cy="48" r="9" fill="${colors.primary}"/>
  <text x="52" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="bold">2</text>

  <!-- Title -->
  <text x="640" y="65" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="17" font-weight="600">Terminal Session 1</text>

  <!-- Header buttons -->
  <rect x="1140" y="40" width="44" height="44" rx="12" fill="url(#orangeGrad)" opacity="0.2"/>
  <text x="1162" y="68" text-anchor="middle" fill="${colors.orange}" font-size="18">🌐</text>
  <rect x="1190" y="40" width="44" height="44" rx="12" fill="transparent"/>
  <text x="1212" y="68" text-anchor="middle" fill="${colors.textPrimary}" font-size="22">+</text>

  <!-- Terminal Area -->
  <rect x="20" y="100" width="860" height="580" rx="8" fill="${colors.bg}"/>

  <!-- Terminal Content -->
  <text x="40" y="135" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="14">~/Projects/CouchCode</text>
  <text x="260" y="135" fill="${colors.textMuted}" font-family="SF Mono, Monaco, monospace" font-size="14">main</text>
  <text x="310" y="135" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="14">❯</text>
  <text x="330" y="135" fill="${colors.textPrimary}" font-family="SF Mono, Monaco, monospace" font-size="14">npm start</text>

  <text x="40" y="165" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="14">> couchcode@1.0.0 start</text>
  <text x="40" y="190" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="14">> electron .</text>

  <text x="40" y="230" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="14">✓ Server running at http://192.168.1.100:3847</text>
  <text x="40" y="260" fill="${colors.info}" font-family="SF Mono, Monaco, monospace" font-size="14">ℹ Scan QR code or open URL on your mobile device</text>
  <text x="40" y="290" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="14">Connected clients: 1</text>

  <text x="40" y="340" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="14">~/Projects/CouchCode</text>
  <text x="260" y="340" fill="${colors.textMuted}" font-family="SF Mono, Monaco, monospace" font-size="14">main</text>
  <text x="310" y="340" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="14">❯</text>
  <rect x="330" y="328" width="10" height="18" fill="${colors.primary}" opacity="0.7"/>

  <!-- QR Code Panel -->
  <rect x="900" y="100" width="360" height="580" rx="12" fill="${colors.surface}"/>
  <rect x="900" y="100" width="360" height="50" rx="12" fill="${colors.surfaceElevated}"/>
  <rect x="900" y="138" width="360" height="12" fill="${colors.surface}"/>
  <text x="1080" y="132" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="15" font-weight="600">Connect Your Device</text>

  <!-- QR Code placeholder -->
  <rect x="980" y="180" width="200" height="200" rx="16" fill="white"/>
  <g fill="${colors.bg}">
    <!-- QR code pattern simulation -->
    <rect x="995" y="195" width="20" height="20"/>
    <rect x="1020" y="195" width="10" height="10"/>
    <rect x="1035" y="195" width="20" height="10"/>
    <rect x="1060" y="195" width="10" height="20"/>
    <rect x="1075" y="195" width="10" height="10"/>
    <rect x="1090" y="195" width="10" height="20"/>
    <rect x="1105" y="195" width="10" height="10"/>
    <rect x="1120" y="195" width="10" height="10"/>
    <rect x="1135" y="195" width="20" height="20"/>

    <rect x="995" y="220" width="20" height="10"/>
    <rect x="1035" y="220" width="10" height="10"/>
    <rect x="1075" y="220" width="20" height="10"/>
    <rect x="1105" y="220" width="10" height="10"/>
    <rect x="1135" y="220" width="20" height="10"/>

    <!-- More QR pattern rows -->
    <rect x="995" y="240" width="10" height="10"/>
    <rect x="1010" y="240" width="10" height="10"/>
    <rect x="1035" y="240" width="30" height="10"/>
    <rect x="1080" y="240" width="10" height="10"/>
    <rect x="1100" y="240" width="10" height="10"/>
    <rect x="1120" y="240" width="10" height="10"/>
    <rect x="1145" y="240" width="10" height="10"/>

    <rect x="995" y="260" width="10" height="10"/>
    <rect x="1020" y="260" width="10" height="10"/>
    <rect x="1045" y="260" width="10" height="10"/>
    <rect x="1070" y="260" width="20" height="10"/>
    <rect x="1105" y="260" width="30" height="10"/>
    <rect x="1145" y="260" width="10" height="10"/>

    <!-- Center elements -->
    <rect x="1045" y="280" width="70" height="40" rx="8" fill="${colors.primary}"/>
    <text x="1080" y="306" text-anchor="middle" fill="white" font-family="SF Pro Display, sans-serif" font-size="14" font-weight="bold">SCAN</text>

    <!-- More rows -->
    <rect x="995" y="330" width="10" height="10"/>
    <rect x="1020" y="330" width="20" height="10"/>
    <rect x="1055" y="330" width="10" height="10"/>
    <rect x="1100" y="330" width="10" height="10"/>
    <rect x="1125" y="330" width="20" height="10"/>

    <rect x="995" y="350" width="20" height="20"/>
    <rect x="1030" y="350" width="10" height="10"/>
    <rect x="1055" y="350" width="20" height="10"/>
    <rect x="1090" y="350" width="10" height="20"/>
    <rect x="1115" y="350" width="10" height="10"/>
    <rect x="1135" y="350" width="20" height="20"/>
  </g>

  <!-- URL Display -->
  <rect x="930" y="400" width="300" height="44" rx="10" fill="${colors.surfaceLight}"/>
  <text x="1080" y="428" text-anchor="middle" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="13">http://192.168.1.100:3847</text>

  <!-- Instructions -->
  <text x="1080" y="480" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="14" font-weight="500">How to Connect:</text>

  <text x="940" y="510" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">1. Scan QR code with your phone</text>
  <text x="940" y="535" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">2. Or enter the URL in browser</text>
  <text x="940" y="560" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">3. Enter your PIN to connect</text>
  <text x="940" y="585" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">4. Start coding from your couch!</text>

  <!-- Status indicator -->
  <rect x="930" y="620" width="300" height="44" rx="22" fill="${colors.surfaceElevated}"/>
  <circle cx="960" cy="642" r="6" fill="${colors.primary}"/>
  <text x="980" y="647" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">1 device connected</text>

  <!-- Input Bar -->
  <rect y="700" width="1280" height="100" fill="${colors.surface}"/>
  <rect y="700" width="1280" height="1" fill="${colors.border}"/>

  <circle cx="50" cy="750" r="22" fill="${colors.surfaceLight}" stroke="${colors.border}" stroke-width="1"/>
  <text x="50" y="756" text-anchor="middle" fill="${colors.textSecondary}" font-size="18">🎤</text>

  <rect x="90" y="728" width="1000" height="48" rx="24" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
  <text x="120" y="758" fill="${colors.textMuted}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="15">Type command...</text>

  <circle cx="1140" cy="750" r="24" fill="url(#primaryGrad)"/>
  <text x="1140" y="756" text-anchor="middle" fill="white" font-size="18">➤</text>

  <circle cx="1200" cy="750" r="22" fill="${colors.surfaceLight}" stroke="${colors.border}" stroke-width="1"/>
  <text x="1200" y="756" text-anchor="middle" fill="${colors.textSecondary}" font-size="16">🔊</text>
</svg>
`;

// Mobile Terminal Screenshot (375x812)
const mobileTerminalSvg = `
<svg width="375" height="812" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.primaryDark}"/>
    </linearGradient>
  </defs>

  <!-- Phone Frame -->
  <rect width="375" height="812" rx="40" fill="${colors.bg}"/>

  <!-- Status Bar -->
  <rect width="375" height="44" fill="${colors.bg}"/>
  <text x="187" y="30" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="14" font-weight="600">9:41</text>
  <text x="320" y="30" fill="${colors.textPrimary}" font-size="14">100%</text>
  <rect x="338" y="22" width="22" height="10" rx="2" fill="none" stroke="${colors.textPrimary}" stroke-width="1"/>
  <rect x="340" y="24" width="18" height="6" rx="1" fill="${colors.primary}"/>

  <!-- Header -->
  <rect y="44" width="375" height="56" fill="${colors.surface}"/>
  <rect y="99" width="375" height="1" fill="${colors.border}"/>

  <!-- Menu button -->
  <rect x="12" y="52" width="40" height="40" rx="10" fill="transparent"/>
  <text x="32" y="78" text-anchor="middle" fill="${colors.textPrimary}" font-size="18">☰</text>
  <circle cx="44" cy="60" r="8" fill="${colors.primary}"/>
  <text x="44" y="64" text-anchor="middle" fill="white" font-size="9" font-weight="bold">2</text>

  <!-- Title -->
  <text x="187" y="78" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="16" font-weight="600">Session 1</text>

  <!-- Plus button -->
  <rect x="323" y="52" width="40" height="40" rx="10" fill="transparent"/>
  <text x="343" y="78" text-anchor="middle" fill="${colors.textPrimary}" font-size="22">+</text>

  <!-- Terminal -->
  <rect x="12" y="110" width="351" height="340" rx="8" fill="${colors.bg}"/>

  <!-- Terminal content -->
  <text x="24" y="140" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="12">~/Projects</text>
  <text x="110" y="140" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="12">❯</text>
  <text x="125" y="140" fill="${colors.textPrimary}" font-family="SF Mono, Monaco, monospace" font-size="12">git status</text>

  <text x="24" y="165" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="11">On branch main</text>
  <text x="24" y="185" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="11">Your branch is up to date</text>

  <text x="24" y="215" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="11">Changes not staged:</text>
  <text x="24" y="235" fill="${colors.danger}" font-family="SF Mono, Monaco, monospace" font-size="11">  modified:   src/app.js</text>
  <text x="24" y="255" fill="${colors.danger}" font-family="SF Mono, Monaco, monospace" font-size="11">  modified:   src/styles.css</text>

  <text x="24" y="285" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="12">~/Projects</text>
  <text x="110" y="285" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="12">❯</text>
  <text x="125" y="285" fill="${colors.textPrimary}" font-family="SF Mono, Monaco, monospace" font-size="12">npm run build</text>

  <text x="24" y="310" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="11">> Building for production...</text>
  <text x="24" y="330" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="11">✓ Build complete!</text>

  <text x="24" y="360" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="12">~/Projects</text>
  <text x="110" y="360" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="12">❯</text>
  <rect x="125" y="350" width="8" height="14" fill="${colors.primary}" opacity="0.7"/>

  <!-- Quick Keyboard -->
  <rect y="460" width="375" height="200" fill="${colors.surface}"/>
  <rect y="460" width="375" height="1" fill="${colors.border}"/>

  <!-- Keyboard header -->
  <rect y="460" width="375" height="36" fill="${colors.surfaceElevated}"/>
  <text x="187" y="483" text-anchor="middle" fill="${colors.textMuted}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="11" font-weight="600">QUICK ACTIONS</text>

  <!-- Key grid -->
  <g transform="translate(10, 506)">
    <!-- Row 1 -->
    <rect x="0" y="0" width="83" height="44" rx="10" fill="rgba(16, 185, 129, 0.15)" stroke="${colors.primary}" stroke-width="1"/>
    <text x="41" y="28" text-anchor="middle" fill="${colors.primary}" font-size="13" font-weight="600">✓ Yes</text>

    <rect x="89" y="0" width="83" height="44" rx="10" fill="rgba(239, 68, 68, 0.15)" stroke="${colors.danger}" stroke-width="1"/>
    <text x="130" y="28" text-anchor="middle" fill="${colors.danger}" font-size="13" font-weight="600">✗ No</text>

    <rect x="178" y="0" width="83" height="44" rx="10" fill="rgba(59, 130, 246, 0.15)" stroke="${colors.info}" stroke-width="1"/>
    <text x="219" y="28" text-anchor="middle" fill="${colors.info}" font-size="13" font-weight="600">↵ Enter</text>

    <rect x="267" y="0" width="83" height="44" rx="10" fill="rgba(139, 92, 246, 0.15)" stroke="${colors.purple}" stroke-width="1"/>
    <text x="308" y="28" text-anchor="middle" fill="${colors.purple}" font-size="13" font-weight="600">Tab</text>

    <!-- Row 2 -->
    <rect x="0" y="52" width="83" height="44" rx="10" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="41" y="80" text-anchor="middle" fill="${colors.info}" font-size="16">⇤</text>

    <rect x="89" y="52" width="83" height="44" rx="10" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="130" y="80" text-anchor="middle" fill="${colors.info}" font-size="16">↑</text>

    <rect x="178" y="52" width="83" height="44" rx="10" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="219" y="80" text-anchor="middle" fill="${colors.info}" font-size="16">⇥</text>

    <rect x="267" y="52" width="83" height="44" rx="10" fill="rgba(239, 68, 68, 0.15)" stroke="${colors.danger}" stroke-width="1"/>
    <text x="308" y="80" text-anchor="middle" fill="${colors.danger}" font-size="13" font-weight="600">^C</text>

    <!-- Row 3 -->
    <rect x="0" y="104" width="83" height="44" rx="10" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="41" y="132" text-anchor="middle" fill="${colors.info}" font-size="16">←</text>

    <rect x="89" y="104" width="83" height="44" rx="10" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="130" y="132" text-anchor="middle" fill="${colors.info}" font-size="16">↓</text>

    <rect x="178" y="104" width="83" height="44" rx="10" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="219" y="132" text-anchor="middle" fill="${colors.info}" font-size="16">→</text>

    <rect x="267" y="104" width="83" height="44" rx="10" fill="rgba(245, 158, 11, 0.15)" stroke="${colors.warning}" stroke-width="1"/>
    <text x="308" y="132" text-anchor="middle" fill="${colors.warning}" font-size="13" font-weight="600">^D</text>
  </g>

  <!-- Input Bar -->
  <rect y="670" width="375" height="80" fill="${colors.surface}"/>
  <rect y="670" width="375" height="1" fill="${colors.border}"/>

  <circle cx="40" cy="710" r="20" fill="${colors.surfaceLight}" stroke="${colors.border}" stroke-width="1"/>
  <text x="40" y="716" text-anchor="middle" fill="${colors.textSecondary}" font-size="16">🎤</text>

  <rect x="70" y="692" width="200" height="40" rx="20" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
  <text x="90" y="717" fill="${colors.textMuted}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="14">Type command...</text>

  <circle cx="295" cy="710" r="22" fill="url(#primaryGrad2)"/>
  <text x="295" y="716" text-anchor="middle" fill="white" font-size="16">➤</text>

  <circle cx="340" cy="710" r="18" fill="${colors.surfaceLight}" stroke="${colors.border}" stroke-width="1"/>
  <text x="340" y="716" text-anchor="middle" fill="${colors.textSecondary}" font-size="14">🔊</text>

  <!-- Home indicator -->
  <rect x="120" y="790" width="135" height="5" rx="2.5" fill="${colors.textMuted}"/>
</svg>
`;

// Claude Code Modal Screenshot (375x812)
const claudeCodeSvg = `
<svg width="375" height="812" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="orangeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.orange}"/>
      <stop offset="100%" style="stop-color:#ea580c"/>
    </linearGradient>
  </defs>

  <!-- Background with blur effect -->
  <rect width="375" height="812" fill="${colors.bg}"/>
  <rect width="375" height="812" fill="rgba(0,0,0,0.7)"/>

  <!-- Modal -->
  <rect x="20" y="120" width="335" height="520" rx="24" fill="${colors.surface}"/>

  <!-- Modal Header -->
  <rect x="20" y="120" width="335" height="100" rx="24" fill="${colors.surface}"/>
  <rect x="20" y="196" width="335" height="24" fill="${colors.surface}"/>

  <!-- Icon -->
  <rect x="147" y="145" width="80" height="80" rx="20" fill="url(#orangeGrad2)"/>
  <text x="187" y="198" text-anchor="middle" fill="white" font-size="36">🌐</text>

  <!-- Title -->
  <text x="187" y="260" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="22" font-weight="700">Claude Code</text>
  <text x="187" y="285" text-anchor="middle" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="14">AI Coding Assistant</text>

  <!-- Quick Actions Grid -->
  <g transform="translate(40, 310)">
    <!-- Row 1 -->
    <rect x="0" y="0" width="90" height="70" rx="14" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="45" y="32" text-anchor="middle" font-size="22">🐛</text>
    <text x="45" y="55" text-anchor="middle" fill="${colors.textPrimary}" font-size="10" font-weight="600">DEBUG</text>

    <rect x="100" y="0" width="90" height="70" rx="14" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="145" y="32" text-anchor="middle" font-size="22">🔍</text>
    <text x="145" y="55" text-anchor="middle" fill="${colors.textPrimary}" font-size="10" font-weight="600">REVIEW</text>

    <rect x="200" y="0" width="90" height="70" rx="14" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="245" y="32" text-anchor="middle" font-size="22">📖</text>
    <text x="245" y="55" text-anchor="middle" fill="${colors.textPrimary}" font-size="10" font-weight="600">EXPLAIN</text>

    <!-- Row 2 -->
    <rect x="0" y="80" width="90" height="70" rx="14" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="45" y="112" text-anchor="middle" font-size="22">🧪</text>
    <text x="45" y="135" text-anchor="middle" fill="${colors.textPrimary}" font-size="10" font-weight="600">TEST</text>

    <rect x="100" y="80" width="90" height="70" rx="14" fill="rgba(249, 115, 22, 0.2)" stroke="${colors.orange}" stroke-width="1"/>
    <text x="145" y="112" text-anchor="middle" font-size="22">⚡</text>
    <text x="145" y="135" text-anchor="middle" fill="${colors.orange}" font-size="10" font-weight="600">OPTIMIZE</text>

    <rect x="200" y="80" width="90" height="70" rx="14" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
    <text x="245" y="112" text-anchor="middle" font-size="22">📝</text>
    <text x="245" y="135" text-anchor="middle" fill="${colors.textPrimary}" font-size="10" font-weight="600">DOCUMENT</text>
  </g>

  <!-- Custom prompt textarea -->
  <rect x="40" y="480" width="295" height="70" rx="12" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
  <text x="55" y="505" fill="${colors.textMuted}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">Or type your custom prompt...</text>
  <text x="55" y="528" fill="${colors.textMuted}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="12">e.g., Help me create a REST API...</text>

  <!-- Footer buttons -->
  <rect x="40" y="570" width="140" height="50" rx="12" fill="${colors.surfaceElevated}" stroke="${colors.border}" stroke-width="1"/>
  <text x="110" y="601" text-anchor="middle" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="15" font-weight="600">Cancel</text>

  <rect x="195" y="570" width="140" height="50" rx="12" fill="url(#orangeGrad2)"/>
  <text x="265" y="601" text-anchor="middle" fill="white" font-family="SF Pro Display, -apple-system, sans-serif" font-size="15" font-weight="600">Start Coding</text>

  <!-- Home indicator -->
  <rect x="120" y="790" width="135" height="5" rx="2.5" fill="${colors.textMuted}"/>
</svg>
`;

// Split Kanban View (1280x800)
const splitKanbanSvg = `
<svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.primaryDark}"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.purple}"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1280" height="800" fill="${colors.bg}"/>

  <!-- macOS Title Bar -->
  <rect width="1280" height="28" fill="${colors.surface}"/>
  <circle cx="20" cy="14" r="6" fill="#ff5f57"/>
  <circle cx="40" cy="14" r="6" fill="#febc2e"/>
  <circle cx="60" cy="14" r="6" fill="#28c840"/>
  <text x="640" y="18" text-anchor="middle" fill="${colors.textSecondary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13">CouchCode</text>

  <!-- Header -->
  <rect y="28" width="1280" height="56" fill="${colors.surface}"/>
  <rect y="83" width="1280" height="1" fill="${colors.border}"/>

  <!-- Menu button -->
  <rect x="16" y="40" width="44" height="44" rx="12" fill="transparent"/>
  <text x="38" y="68" text-anchor="middle" fill="${colors.textPrimary}" font-size="20">☰</text>

  <!-- Title -->
  <text x="400" y="65" text-anchor="middle" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="17" font-weight="600">Terminal + Kanban</text>

  <!-- Kanban toggle (active) -->
  <rect x="1140" y="40" width="44" height="44" rx="12" fill="${colors.primary}"/>
  <text x="1162" y="68" text-anchor="middle" fill="white" font-size="16">📋</text>

  <rect x="1190" y="40" width="44" height="44" rx="12" fill="transparent"/>
  <text x="1212" y="68" text-anchor="middle" fill="${colors.textPrimary}" font-size="22">+</text>

  <!-- Terminal Side (Left) -->
  <rect x="0" y="84" width="640" height="616" fill="${colors.bg}"/>

  <!-- Terminal content -->
  <text x="20" y="120" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="13">~/Projects/CouchCode</text>
  <text x="200" y="120" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="13">❯</text>
  <text x="220" y="120" fill="${colors.textPrimary}" font-family="SF Mono, Monaco, monospace" font-size="13">claude "Add user authentication"</text>

  <text x="20" y="150" fill="${colors.purple}" font-family="SF Mono, Monaco, monospace" font-size="12">Claude Code v1.0.0</text>
  <text x="20" y="175" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="12">⠋ Analyzing codebase...</text>
  <text x="20" y="200" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="12">⠙ Reading src/auth.js</text>
  <text x="20" y="225" fill="${colors.textSecondary}" font-family="SF Mono, Monaco, monospace" font-size="12">⠹ Planning implementation...</text>

  <text x="20" y="260" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="12">✓ Created src/middleware/auth.js</text>
  <text x="20" y="285" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="12">✓ Updated src/routes/user.js</text>
  <text x="20" y="310" fill="${colors.primary}" font-family="SF Mono, Monaco, monospace" font-size="12">✓ Added JWT token validation</text>

  <text x="20" y="345" fill="${colors.info}" font-family="SF Mono, Monaco, monospace" font-size="12">Do you want to run the tests? (y/n)</text>
  <rect x="350" y="333" width="8" height="14" fill="${colors.primary}" opacity="0.7"/>

  <!-- Divider -->
  <rect x="637" y="84" width="6" height="616" fill="${colors.border}"/>
  <rect x="639" y="340" width="2" height="40" rx="1" fill="${colors.textMuted}"/>

  <!-- Kanban Side (Right) -->
  <rect x="643" y="84" width="637" height="616" fill="${colors.surface}"/>

  <!-- Kanban Header -->
  <rect x="643" y="84" width="637" height="44" fill="${colors.surfaceElevated}"/>
  <text x="670" y="112" fill="${colors.textPrimary}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="14" font-weight="600">Vibe Kanban</text>

  <!-- Kanban controls -->
  <rect x="1180" y="94" width="28" height="28" rx="6" fill="${colors.surfaceLight}"/>
  <text x="1194" y="114" text-anchor="middle" fill="${colors.textSecondary}" font-size="14">⚙</text>
  <rect x="1214" y="94" width="28" height="28" rx="6" fill="${colors.surfaceLight}"/>
  <text x="1228" y="114" text-anchor="middle" fill="${colors.textSecondary}" font-size="14">↻</text>
  <rect x="1248" y="94" width="28" height="28" rx="6" fill="${colors.surfaceLight}"/>
  <text x="1262" y="114" text-anchor="middle" fill="${colors.textSecondary}" font-size="14">↗</text>

  <!-- Kanban Board -->
  <rect x="653" y="138" width="617" height="552" fill="white"/>

  <!-- Kanban columns -->
  <rect x="663" y="148" width="195" height="532" rx="8" fill="#f1f5f9"/>
  <text x="760" y="175" text-anchor="middle" fill="#475569" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13" font-weight="600">TODO</text>
  <circle cx="820" cy="170" r="10" fill="#94a3b8"/>
  <text x="820" y="174" text-anchor="middle" fill="white" font-size="10" font-weight="bold">3</text>

  <!-- Todo cards -->
  <rect x="673" y="195" width="175" height="70" rx="6" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="683" y="220" fill="#1e293b" font-family="SF Pro Display, -apple-system, sans-serif" font-size="12" font-weight="500">Add user dashboard</text>
  <rect x="683" y="240" width="50" height="18" rx="4" fill="#dbeafe"/>
  <text x="708" y="253" text-anchor="middle" fill="#3b82f6" font-size="9">Feature</text>

  <rect x="673" y="275" width="175" height="70" rx="6" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="683" y="300" fill="#1e293b" font-family="SF Pro Display, -apple-system, sans-serif" font-size="12" font-weight="500">Fix login bug</text>
  <rect x="683" y="320" width="35" height="18" rx="4" fill="#fee2e2"/>
  <text x="700" y="333" text-anchor="middle" fill="#ef4444" font-size="9">Bug</text>

  <!-- In Progress column -->
  <rect x="868" y="148" width="195" height="532" rx="8" fill="#f1f5f9"/>
  <text x="965" y="175" text-anchor="middle" fill="#475569" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13" font-weight="600">IN PROGRESS</text>
  <circle cx="1035" cy="170" r="10" fill="${colors.primary}"/>
  <text x="1035" y="174" text-anchor="middle" fill="white" font-size="10" font-weight="bold">1</text>

  <rect x="878" y="195" width="175" height="80" rx="6" fill="white" stroke="${colors.primary}" stroke-width="2"/>
  <text x="888" y="220" fill="#1e293b" font-family="SF Pro Display, -apple-system, sans-serif" font-size="12" font-weight="500">Add user authentication</text>
  <text x="888" y="240" fill="#64748b" font-family="SF Pro Display, -apple-system, sans-serif" font-size="10">JWT + bcrypt</text>
  <rect x="888" y="252" width="155" height="4" rx="2" fill="#e2e8f0"/>
  <rect x="888" y="252" width="100" height="4" rx="2" fill="${colors.primary}"/>

  <!-- Done column -->
  <rect x="1073" y="148" width="195" height="532" rx="8" fill="#f1f5f9"/>
  <text x="1170" y="175" text-anchor="middle" fill="#475569" font-family="SF Pro Display, -apple-system, sans-serif" font-size="13" font-weight="600">DONE</text>
  <circle cx="1225" cy="170" r="10" fill="#22c55e"/>
  <text x="1225" y="174" text-anchor="middle" fill="white" font-size="10" font-weight="bold">5</text>

  <rect x="1083" y="195" width="175" height="60" rx="6" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="1093" y="218" fill="#64748b" font-family="SF Pro Display, -apple-system, sans-serif" font-size="12" font-weight="500" text-decoration="line-through">Setup project</text>
  <text x="1093" y="238" fill="#22c55e" font-size="10">✓ Completed</text>

  <rect x="1083" y="265" width="175" height="60" rx="6" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="1093" y="288" fill="#64748b" font-family="SF Pro Display, -apple-system, sans-serif" font-size="12" font-weight="500" text-decoration="line-through">Create database schema</text>
  <text x="1093" y="308" fill="#22c55e" font-size="10">✓ Completed</text>

  <!-- Input Bar -->
  <rect y="700" width="1280" height="100" fill="${colors.surface}"/>
  <rect y="700" width="1280" height="1" fill="${colors.border}"/>

  <circle cx="50" cy="750" r="22" fill="${colors.surfaceLight}" stroke="${colors.border}" stroke-width="1"/>
  <text x="50" y="756" text-anchor="middle" fill="${colors.textSecondary}" font-size="18">🎤</text>

  <rect x="90" y="728" width="1000" height="48" rx="24" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1"/>
  <text x="120" y="758" fill="${colors.textMuted}" font-family="SF Pro Display, -apple-system, sans-serif" font-size="15">Type command...</text>

  <circle cx="1140" cy="750" r="24" fill="url(#primaryGrad3)"/>
  <text x="1140" y="756" text-anchor="middle" fill="white" font-size="18">➤</text>

  <circle cx="1200" cy="750" r="22" fill="${colors.surfaceLight}" stroke="${colors.border}" stroke-width="1"/>
  <text x="1200" y="756" text-anchor="middle" fill="${colors.textSecondary}" font-size="16">🔊</text>
</svg>
`;

async function generateScreenshots() {
  console.log('\n=== Generating Screenshots ===\n');

  const screenshots = [
    { name: 'desktop-main.png', svg: desktopMainSvg, width: 1280, height: 800 },
    { name: 'mobile-terminal.png', svg: mobileTerminalSvg, width: 375, height: 812 },
    { name: 'mobile-keyboard.png', svg: mobileTerminalSvg, width: 375, height: 812 },
    { name: 'claude-code.png', svg: claudeCodeSvg, width: 375, height: 812 },
    { name: 'split-kanban.png', svg: splitKanbanSvg, width: 1280, height: 800 },
  ];

  for (const { name, svg, width, height } of screenshots) {
    const outputPath = path.join(screenshotsDir, name);
    await sharp(Buffer.from(svg))
      .resize(width, height)
      .png()
      .toFile(outputPath);
    console.log(`Generated: screenshots/${name}`);
  }

  console.log('\n=== Screenshots Complete ===\n');
}

generateScreenshots().catch(console.error);
