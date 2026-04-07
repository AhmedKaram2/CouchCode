package com.couchcode.plugin

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@State(
    name = "CouchCodeSettings",
    storages = [Storage("CouchCodePlugin.xml")]
)
class CouchCodeSettings : PersistentStateComponent<CouchCodeSettings.State> {

    data class State(
        var serverUrl: String = "http://localhost:3847",
        var apiToken: String = "",
        var pin: String = "",
        var autoConnect: Boolean = true,
        var autoApprove: Boolean = true,
        var showStatusBar: Boolean = true
    )

    private var myState = State()

    override fun getState(): State = myState

    override fun loadState(state: State) {
        myState = state
    }

    companion object {
        fun getInstance(): CouchCodeSettings {
            return ApplicationManager.getApplication().getService(CouchCodeSettings::class.java)
        }
    }
}
