package com.couchcode.plugin

import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI

/**
 * CouchCode WebSocket client for JetBrains IDE integration.
 * Handles authentication (API token, PIN, auto-approve), session management,
 * and terminal I/O over WebSocket.
 */
class CouchCodeClient(
    private val serverUrl: String,
    private val listener: CouchCodeListener
) {
    interface CouchCodeListener {
        fun onConnected()
        fun onDisconnected(reason: String)
        fun onOutput(data: String)
        fun onSessionCreated(sessionId: String)
        fun onError(message: String)
    }

    private val gson = Gson()
    private val httpClient = OkHttpClient()
    private var wsClient: WebSocketClient? = null
    private var sessionId: String? = null
    private var jwtToken: String? = null

    fun connect() {
        val settings = CouchCodeSettings.getInstance().state

        // Authenticate first
        jwtToken = authenticate(settings)
        if (jwtToken == null) {
            listener.onError("Authentication failed. Check your CouchCode settings (Tools > CouchCode).")
            return
        }

        // Connect WebSocket
        val wsUrl = serverUrl.replace("http://", "ws://").replace("https://", "wss://")
        wsClient = object : WebSocketClient(URI(wsUrl)) {
            override fun onOpen(handshake: ServerHandshake?) {
                send(gson.toJson(mapOf("type" to "auth", "token" to jwtToken)))
            }

            override fun onMessage(message: String?) {
                message?.let { handleMessage(it) }
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                listener.onDisconnected(reason ?: "Connection closed")
            }

            override fun onError(ex: Exception?) {
                listener.onError(ex?.message ?: "WebSocket error")
            }
        }
        wsClient?.connect()
    }

    fun disconnect() {
        wsClient?.close()
        wsClient = null
    }

    fun sendInput(data: String) {
        wsClient?.send(gson.toJson(mapOf("type" to "input", "data" to data)))
    }

    fun resize(cols: Int, rows: Int) {
        wsClient?.send(gson.toJson(mapOf("type" to "resize", "cols" to cols, "rows" to rows)))
    }

    private fun handleMessage(raw: String) {
        val msg = gson.fromJson(raw, JsonObject::class.java)
        when (msg.get("type")?.asString) {
            "auth_success" -> {
                listener.onConnected()
                // Create a new session
                val hostname = java.net.InetAddress.getLocalHost().hostName
                wsClient?.send(gson.toJson(mapOf("type" to "create_session", "name" to "jetbrains-$hostname")))
            }
            "session_created" -> {
                sessionId = msg.getAsJsonObject("session")?.get("id")?.asString
                sessionId?.let {
                    wsClient?.send(gson.toJson(mapOf("type" to "attach", "sessionId" to it)))
                    listener.onSessionCreated(it)
                }
            }
            "attached" -> {
                // Ready for I/O
            }
            "output" -> {
                msg.get("data")?.asString?.let { listener.onOutput(it) }
            }
            "history" -> {
                msg.get("data")?.asString?.let { listener.onOutput(it) }
            }
            "session_ended" -> {
                listener.onDisconnected("Session ended")
            }
            "auth_error" -> {
                listener.onError("Authentication failed: ${msg.get("message")?.asString}")
            }
            "error" -> {
                listener.onError(msg.get("message")?.asString ?: "Unknown error")
            }
        }
    }

    private fun authenticate(settings: CouchCodeSettings.State): String? {
        // Try API token
        if (settings.apiToken.isNotEmpty()) {
            val token = authRequest(mapOf("apiToken" to settings.apiToken))
            if (token != null) return token
        }

        // Try auto-approve
        if (settings.autoApprove) {
            val hostname = java.net.InetAddress.getLocalHost().hostName
            val token = authRequest(mapOf(
                "deviceFingerprint" to "jetbrains-$hostname",
                "deviceName" to "JetBrains ($hostname)"
            ))
            if (token != null) return token
        }

        // Try PIN
        if (settings.pin.isNotEmpty()) {
            return authRequest(mapOf("pin" to settings.pin))
        }

        return null
    }

    private fun authRequest(body: Map<String, String>): String? {
        return try {
            val json = gson.toJson(body)
            val request = Request.Builder()
                .url("$serverUrl/api/auth/login")
                .post(json.toRequestBody("application/json".toMediaType()))
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val result = gson.fromJson(response.body?.string(), JsonObject::class.java)
                    result?.get("token")?.asString
                } else null
            }
        } catch (e: Exception) {
            null
        }
    }
}
