"""
CouchCode - Sublime Text Plugin
Remote terminal access directly from Sublime Text.

Setup:
    1. Install the CouchCode CLI: npm install -g couchcode-cli
    2. Configure: couchcode config set serverUrl http://YOUR_IP:3847
    3. Set API token: couchcode config set apiToken YOUR_TOKEN
    4. Copy this file to Packages/User/CouchCode.py

Commands (Command Palette):
    CouchCode: Open Remote Terminal
    CouchCode: Execute Command
    CouchCode: List Sessions
    CouchCode: Show Status
    CouchCode: Open in Browser
"""

import sublime
import sublime_plugin
import subprocess
import threading
import webbrowser


def get_settings():
    return sublime.load_settings("CouchCode.sublime-settings")


def get_couchcode_cmd():
    """Find the couchcode CLI command."""
    settings = get_settings()
    custom_path = settings.get("cli_path", "")
    if custom_path:
        return custom_path
    return "couchcode"


def build_args():
    """Build CLI arguments from settings."""
    settings = get_settings()
    args = []
    server_url = settings.get("server_url", "http://localhost:3847")
    if server_url != "http://localhost:3847":
        args.extend(["--url", server_url])
    api_token = settings.get("api_token", "")
    if api_token:
        args.extend(["--token", api_token])
    pin = settings.get("pin", "")
    if pin:
        args.extend(["--pin", pin])
    return args


class CouchcodeOpenTerminalCommand(sublime_plugin.WindowCommand):
    """Open an interactive CouchCode terminal."""

    def run(self):
        cmd = [get_couchcode_cmd(), "connect"] + build_args()
        # Open in system terminal
        settings = get_settings()
        terminal_cmd = settings.get("terminal_command", "")

        if terminal_cmd:
            subprocess.Popen([terminal_cmd] + cmd)
        else:
            # Default: use exec panel to show output
            self.window.run_command("exec", {
                "cmd": cmd,
                "shell": True,
                "quiet": False
            })


class CouchcodeExecCommand(sublime_plugin.WindowCommand):
    """Execute a command on CouchCode server."""

    def run(self):
        self.window.show_input_panel(
            "CouchCode: Execute command",
            "",
            self.on_done,
            None,
            None
        )

    def on_done(self, command):
        if not command:
            return

        def run_async():
            cmd = [get_couchcode_cmd(), "exec"] + build_args() + [command]
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                output = result.stdout or result.stderr or "(no output)"
                sublime.set_timeout(lambda: self.show_output(output), 0)
            except Exception as e:
                sublime.set_timeout(
                    lambda: sublime.error_message(f"CouchCode error: {e}"), 0
                )

        threading.Thread(target=run_async).start()

    def show_output(self, text):
        panel = self.window.create_output_panel("couchcode")
        panel.run_command("append", {"characters": text})
        self.window.run_command("show_panel", {"panel": "output.couchcode"})


class CouchcodeSessionsCommand(sublime_plugin.WindowCommand):
    """List active CouchCode sessions."""

    def run(self):
        def run_async():
            cmd = [get_couchcode_cmd(), "sessions"] + build_args()
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                output = result.stdout or "(no sessions)"
                sublime.set_timeout(lambda: self.show_output(output), 0)
            except Exception as e:
                sublime.set_timeout(
                    lambda: sublime.error_message(f"CouchCode error: {e}"), 0
                )

        threading.Thread(target=run_async).start()

    def show_output(self, text):
        panel = self.window.create_output_panel("couchcode")
        panel.run_command("append", {"characters": text})
        self.window.run_command("show_panel", {"panel": "output.couchcode"})


class CouchcodeStatusCommand(sublime_plugin.WindowCommand):
    """Show CouchCode server status."""

    def run(self):
        def run_async():
            cmd = [get_couchcode_cmd(), "status"] + build_args()
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                output = result.stdout or result.stderr
                sublime.set_timeout(lambda: self.show_output(output), 0)
            except Exception as e:
                sublime.set_timeout(
                    lambda: sublime.error_message(f"CouchCode error: {e}"), 0
                )

        threading.Thread(target=run_async).start()

    def show_output(self, text):
        panel = self.window.create_output_panel("couchcode")
        panel.run_command("append", {"characters": text})
        self.window.run_command("show_panel", {"panel": "output.couchcode"})


class CouchcodeOpenBrowserCommand(sublime_plugin.WindowCommand):
    """Open CouchCode in the default browser."""

    def run(self):
        settings = get_settings()
        url = settings.get("server_url", "http://localhost:3847")
        webbrowser.open(url)
