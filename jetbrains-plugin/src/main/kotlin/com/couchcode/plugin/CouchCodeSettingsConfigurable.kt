package com.couchcode.plugin

import com.intellij.openapi.options.Configurable
import javax.swing.*
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets

class CouchCodeSettingsConfigurable : Configurable {

    private var serverUrlField: JTextField? = null
    private var apiTokenField: JTextField? = null
    private var pinField: JPasswordField? = null
    private var autoConnectCheckbox: JCheckBox? = null
    private var autoApproveCheckbox: JCheckBox? = null

    override fun getDisplayName(): String = "CouchCode"

    override fun createComponent(): JComponent {
        val panel = JPanel(GridBagLayout())
        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(4, 4, 4, 4)
            anchor = GridBagConstraints.WEST
        }

        var row = 0

        // Server URL
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        panel.add(JLabel("Server URL:"), gbc)
        serverUrlField = JTextField(30)
        gbc.gridx = 1; gbc.weightx = 1.0
        panel.add(serverUrlField, gbc)

        // API Token
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        panel.add(JLabel("API Token:"), gbc)
        apiTokenField = JTextField(30)
        gbc.gridx = 1; gbc.weightx = 1.0
        panel.add(apiTokenField, gbc)

        // PIN
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
        panel.add(JLabel("PIN:"), gbc)
        pinField = JPasswordField(20)
        gbc.gridx = 1; gbc.weightx = 1.0
        panel.add(pinField, gbc)

        // Auto-connect
        row++
        autoConnectCheckbox = JCheckBox("Auto-connect on startup")
        gbc.gridx = 0; gbc.gridy = row; gbc.gridwidth = 2
        panel.add(autoConnectCheckbox, gbc)

        // Auto-approve
        row++
        autoApproveCheckbox = JCheckBox("Auto-approve localhost connections (no PIN needed)")
        gbc.gridx = 0; gbc.gridy = row; gbc.gridwidth = 2
        panel.add(autoApproveCheckbox, gbc)

        // Help text
        row++
        val helpLabel = JLabel("<html><p style='color:gray; font-size:11px;'>Generate an API token in CouchCode Settings > IDE Integration</p></html>")
        gbc.gridx = 0; gbc.gridy = row; gbc.gridwidth = 2
        panel.add(helpLabel, gbc)

        // Spacer
        row++
        gbc.gridx = 0; gbc.gridy = row; gbc.weighty = 1.0; gbc.fill = GridBagConstraints.BOTH
        panel.add(JPanel(), gbc)

        return panel
    }

    override fun isModified(): Boolean {
        val settings = CouchCodeSettings.getInstance().state
        return serverUrlField?.text != settings.serverUrl ||
                apiTokenField?.text != settings.apiToken ||
                String(pinField?.password ?: charArrayOf()) != settings.pin ||
                autoConnectCheckbox?.isSelected != settings.autoConnect ||
                autoApproveCheckbox?.isSelected != settings.autoApprove
    }

    override fun apply() {
        val settings = CouchCodeSettings.getInstance()
        settings.loadState(CouchCodeSettings.State(
            serverUrl = serverUrlField?.text ?: "http://localhost:3847",
            apiToken = apiTokenField?.text ?: "",
            pin = String(pinField?.password ?: charArrayOf()),
            autoConnect = autoConnectCheckbox?.isSelected ?: true,
            autoApprove = autoApproveCheckbox?.isSelected ?: true
        ))
    }

    override fun reset() {
        val settings = CouchCodeSettings.getInstance().state
        serverUrlField?.text = settings.serverUrl
        apiTokenField?.text = settings.apiToken
        pinField?.text = settings.pin
        autoConnectCheckbox?.isSelected = settings.autoConnect
        autoApproveCheckbox?.isSelected = settings.autoApprove
    }
}
