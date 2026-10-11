# NeuroStudio AI

An AI coding agent that runs inside Roblox Studio. Describe what you want in plain language — the agent creates parts, inserts scripts, edits properties and answers questions, both from a local web UI and a Studio plugin. Everything runs on your machine.

```
npm install
npm start
```

Open **http://localhost:3000**, configure an API key from any of the 60+ supported providers and start building. The Roblox Studio plugin installs with one click and connects to the same conversation.

## How it works

```
web (localhost:3000) ─┐
                      ├─► local server ─► AI provider (your API key)
Studio plugin ────────┘        ▲   │
   polls every 3s ─────────────┘   ▼
                          queued actions ─► executed in your place
```

1. You chat from the web or the Studio widget — both share one conversation.
2. The model responds with optional action blocks (`create_instance`, `insert_script`, `set_property`, `inspect`...).
3. The plugin executes each action directly in the place and reports results back into the chat.
4. The agent reads the results and continues — a full agentic loop inside Studio.

## Features

- **Direct world building** — parts, spawn locations, models and folders are created as real instances, visible instantly in Studio (no runtime-generated builds)
- **60+ AI providers** — OpenRouter, OpenAI, Google AI Studio, NVIDIA NIM, Groq, Anthropic, DeepSeek, Mistral, xAI, Together, Cerebras, Moonshot, Zhipu and many more; bring your own API key
- **API key sync** — configure a key once; the web and the Studio plugin share it (`keys.json`, local only)
- **Key validation and model discovery** — when you save a key it is verified against the provider and the model picker lists everything the key can access
- **Live streaming** — answers render token by token, including the reasoning of thinking models (GLM, DeepSeek-R1...) shown as it happens
- **Stop button** — cancel a generation at any time
- **Robust action parser** — tolerant to model formatting mistakes: tag variants, raw newlines inside JSON strings, trailing commas and unfenced JSON are all recovered
- **Works with the widget closed** — as long as Studio is open, queued actions execute in the background
- **Roblox account link** — verifies your Roblox profile through the official public APIs

## Requirements

- Windows with Roblox Studio
- Node.js 18+

## Setup

```bash
npm install
npm start
```

Then open http://localhost:3000:

1. **API Keys** — paste a key from any provider and press Guardar. It gets verified instantly and the model list loads.
2. **Plugin** — press *Instalar automáticamente*. The plugin is copied to `%LOCALAPPDATA%\Roblox\Plugins`.
3. Open Roblox Studio — the widget opens automatically as a floating window.
4. Chat from the web or from Studio; the provider and key stay in sync between both.

To try everything without an API key, select the `mock` provider and ask for *"inspecciona el Workspace"* or *"pon un bloque"*.

## Agent actions

| Action | Effect |
|---|---|
| `create_instance` | Creates any instance (Part, SpawnLocation, Model, PointLight...) with properties: `Size:[4,4,4]`, `Position:[0,10,0]`, `Color:[139,92,246]`, `Material:"Neon"`, `Anchored:true` |
| `set_property` | Moves, recolors or edits existing instances |
| `insert_script` | Creates a Script / LocalScript / ModuleScript with source |
| `set_source` / `get_source` | Reads and rewrites existing scripts |
| `inspect` | Lists the children of an instance |
| `delete_instance` / `duplicate_instance` | Removes or clones instances |
| `create_folder` / `select` | Folder creation and selection |

## API

| Endpoint | Description |
|---|---|
| `POST /api/chat/stream` | SSE chat endpoint used by the web |
| `POST /api/chat/send` | Non-streaming chat used by the plugin |
| `POST /api/plugin/sync` | Plugin polling: receives messages and pending actions |
| `POST /api/plugin/result` | Plugin reports action results |
| `GET/POST /api/keys` | Key vault shared between web and Studio |
| `POST /api/models` | Validates a key and lists the provider's models |
| `POST /api/plugin/install` | Installs the plugin into Roblox Studio |
| `GET /api/plugin/download` | Downloads the plugin as a zip |

## Tests

```bash
node test-syntax.js
node test-all.js
node check-web.js
```

`test-all.js` runs the full end-to-end suite against a running server: chat, agentic action queue, plugin sync, key vault, streaming, reasoning models, malformed action recovery, Roblox link and plugin install.

## Privacy

API keys, conversations and your Roblox profile never leave your machine. The server binds to your local network interfaces and talks directly to the AI provider you choose. `keys.json`, `sessions.json` and `data.json` are local runtime files, gitignored by default.

## License

MIT
