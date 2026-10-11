# NeuroStudioAI — Roblox Studio plugin

Part of [NeuroStudio AI](../README.md). Requires the local server running (`node server.js` in the project root).

## Install

1. Copy this folder to `%LOCALAPPDATA%\Roblox\Plugins` (or press *Instalar automáticamente* on the web UI).
2. Open Roblox Studio — the widget opens automatically as a floating window.
3. Toggle it anytime from the **Plugins** tab with the **NeuroStudio** button.

## Use

- The **provider syncs with the web** — the active provider on localhost:3000 appears in the widget within seconds.
- The **API key is optional**: if one is configured on the web, the server uses it automatically. A key typed in the widget takes priority and syncs back to the web.
- Press Enter or **Enviar** and ask anything or describe what to build.
- The agent creates parts directly, inserts scripts, inspects, edits and selects in your place.
- Actions execute even with the widget closed, as long as Studio is open.
- The chat is shared with the web (http://localhost:3000).

## Notes

- Keys are stored locally via `plugin:SetSetting`.
- The plugin talks to `http://127.0.0.1:3000` (IPv4 loopback avoids Studio's IPv6 `localhost` issue).
- If the status dot is red, the server is not running: start it with `node server.js`.
