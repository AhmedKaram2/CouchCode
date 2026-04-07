package com.couchcode.plugin.actions

import com.couchcode.plugin.CouchCodeSettings
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.wm.ToolWindowManager

class OpenTerminalAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("CouchCode")
        toolWindow?.show()
    }
}

class ListSessionsAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("CouchCode")
        toolWindow?.show()
    }
}

class OpenInBrowserAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val settings = CouchCodeSettings.getInstance().state
        BrowserUtil.browse(settings.serverUrl)
    }
}
