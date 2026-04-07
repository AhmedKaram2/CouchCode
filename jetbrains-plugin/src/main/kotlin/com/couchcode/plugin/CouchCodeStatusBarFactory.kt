package com.couchcode.plugin

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.util.Consumer
import java.awt.event.MouseEvent

class CouchCodeStatusBarFactory : StatusBarWidgetFactory {
    override fun getId(): String = "CouchCodeStatus"
    override fun getDisplayName(): String = "CouchCode Status"
    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget {
        return CouchCodeStatusBarWidget(project)
    }
}

class CouchCodeStatusBarWidget(private val project: Project) : StatusBarWidget, StatusBarWidget.TextPresentation {
    override fun ID(): String = "CouchCodeStatus"

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    override fun install(statusBar: StatusBar) {}

    override fun dispose() {}

    override fun getText(): String = "CouchCode"

    override fun getTooltipText(): String {
        val settings = CouchCodeSettings.getInstance().state
        return "CouchCode: ${settings.serverUrl} - Click to open"
    }

    override fun getAlignment(): Float = 0f

    override fun getClickConsumer(): Consumer<MouseEvent> = Consumer {
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("CouchCode")
        toolWindow?.show()
    }
}
