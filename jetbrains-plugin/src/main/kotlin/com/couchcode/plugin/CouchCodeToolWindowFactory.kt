package com.couchcode.plugin

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefBrowser
import javax.swing.*
import java.awt.BorderLayout

/**
 * Tool window factory for CouchCode.
 * Embeds the CouchCode web interface in a JetBrains tool window panel.
 */
class CouchCodeToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val settings = CouchCodeSettings.getInstance().state
        val panel = createPanel(settings)
        val content = ContentFactory.getInstance().createContent(panel, "Remote Terminal", false)
        toolWindow.contentManager.addContent(content)
    }

    private fun createPanel(settings: CouchCodeSettings.State): JComponent {
        val panel = JPanel(BorderLayout())

        // Status bar at top
        val statusPanel = JPanel(BorderLayout())
        val statusLabel = JLabel("  Connecting to ${settings.serverUrl}...")
        statusPanel.add(statusLabel, BorderLayout.WEST)

        val reconnectButton = JButton("Reconnect")
        reconnectButton.addActionListener {
            // Reload the browser
            panel.removeAll()
            panel.add(createPanel(CouchCodeSettings.getInstance().state))
            panel.revalidate()
        }
        statusPanel.add(reconnectButton, BorderLayout.EAST)
        panel.add(statusPanel, BorderLayout.NORTH)

        // Embed CouchCode web UI using JCEF
        try {
            val authParams = buildAuthQuery(settings)
            val url = "${settings.serverUrl}$authParams"
            val browser = JBCefBrowser(url)
            panel.add(browser.component, BorderLayout.CENTER)
            statusLabel.text = "  Connected to ${settings.serverUrl}"
        } catch (e: Exception) {
            val errorLabel = JLabel("<html><center>" +
                    "<h3>Cannot connect to CouchCode</h3>" +
                    "<p>Make sure CouchCode is running at ${settings.serverUrl}</p>" +
                    "<p>Configure in Settings > Tools > CouchCode</p>" +
                    "</center></html>")
            errorLabel.horizontalAlignment = SwingConstants.CENTER
            panel.add(errorLabel, BorderLayout.CENTER)
        }

        return panel
    }

    private fun buildAuthQuery(settings: CouchCodeSettings.State): String {
        val params = mutableListOf<String>()
        if (settings.apiToken.isNotEmpty()) {
            params.add("apiToken=${java.net.URLEncoder.encode(settings.apiToken, "UTF-8")}")
        }
        if (settings.pin.isNotEmpty()) {
            params.add("pin=${java.net.URLEncoder.encode(settings.pin, "UTF-8")}")
        }
        if (settings.autoApprove) {
            params.add("autoApprove=true")
        }
        return if (params.isNotEmpty()) "?" + params.joinToString("&") else ""
    }
}
