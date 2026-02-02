// Terminal wrapper using xterm.js
class TerminalWrapper {
  constructor(container) {
    this.container = container;
    this.terminal = null;
    this.fitAddon = null;
    this.webLinksAddon = null;
    this.onInput = null;
    this.onResize = null;
  }

  // Initialize the terminal
  init() {
    // Create terminal instance
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Cascadia Code", "Fira Code", "Courier New", monospace',
      lineHeight: 1.15,
      theme: {
        background: '#0a0a0f',
        foreground: '#f1f5f9',
        cursor: '#10b981',
        cursorAccent: '#0a0a0f',
        selection: 'rgba(16, 185, 129, 0.3)',
        black: '#1e1e2e',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#94a3b8',
        brightBlack: '#64748b',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#f1f5f9'
      },
      allowProposedApi: true,
      scrollback: 10000,
      smoothScrollDuration: 100,
      tabStopWidth: 4
    });

    // Initialize addons
    this.fitAddon = new FitAddon.FitAddon();
    this.webLinksAddon = new WebLinksAddon.WebLinksAddon();

    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(this.webLinksAddon);

    // Open terminal in container
    this.terminal.open(this.container);

    // Fit to container
    this.fit();

    // Handle input
    this.terminal.onData((data) => {
      if (this.onInput) {
        this.onInput(data);
      }
    });

    // Handle resize
    this.terminal.onResize(({ cols, rows }) => {
      if (this.onResize) {
        this.onResize(cols, rows);
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.fit();
    });

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.fit(), 100);
    });

    return this;
  }

  // Fit terminal to container
  fit() {
    if (this.fitAddon) {
      try {
        this.fitAddon.fit();
      } catch (e) {
        // Ignore fit errors
      }
    }
  }

  // Write data to terminal
  write(data) {
    if (this.terminal) {
      this.terminal.write(data);
    }
  }

  // Write line to terminal
  writeln(data) {
    if (this.terminal) {
      this.terminal.writeln(data);
    }
  }

  // Clear terminal
  clear() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }

  // Reset terminal
  reset() {
    if (this.terminal) {
      this.terminal.reset();
    }
  }

  // Focus terminal
  focus() {
    if (this.terminal) {
      this.terminal.focus();
    }
  }

  // Blur terminal
  blur() {
    if (this.terminal) {
      this.terminal.blur();
    }
  }

  // Get terminal dimensions
  getDimensions() {
    if (this.terminal) {
      return {
        cols: this.terminal.cols,
        rows: this.terminal.rows
      };
    }
    return { cols: 80, rows: 24 };
  }

  // Set font size
  setFontSize(size) {
    if (this.terminal) {
      this.terminal.options.fontSize = size;
      this.fit();
    }
  }

  // Scroll to bottom
  scrollToBottom() {
    if (this.terminal) {
      this.terminal.scrollToBottom();
    }
  }

  // Scroll to top
  scrollToTop() {
    if (this.terminal) {
      this.terminal.scrollToTop();
    }
  }

  // Get underlying xterm instance
  get term() {
    return this.terminal;
  }

  // Dispose terminal
  dispose() {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
  }
}

// Export for use in app.js
window.TerminalWrapper = TerminalWrapper;
