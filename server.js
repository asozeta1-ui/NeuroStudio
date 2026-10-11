const express = require('express');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { PROVIDERS, getProvider, callProvider, providerHeaders } = require('./providers');

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');
const SESSION_FILE = path.join(__dirname, 'sessions.json');
function loadData() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } }
function saveData(d) { try { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); } catch {} }
function loadSession() { try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')); } catch { return { messages: [], actions: [], version: 0 }; } }
function saveSession() { session.version++; try { fs.writeFileSync(SESSION_FILE, JSON.stringify(session)); } catch {} }

const session = loadSession();
if (!session.messages) session.messages = [];
if (!session.actions) session.actions = [];
if (!session.version) session.version = 1;

const KEYS_FILE = path.join(__dirname, 'keys.json');
function loadKeys() { try { return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); } catch { return {}; } }
const keyVault = loadKeys();
if (!keyVault.activeProvider) keyVault.activeProvider = 'openrouter';
function saveKeys() { try { fs.writeFileSync(KEYS_FILE, JSON.stringify(keyVault, null, 2)); } catch {} }

let lastGeneration = null;
let studioLastSeen = 0;
let msgCounter = 0;
const newId = (p) => `${p}_${Date.now()}_${msgCounter++}`;

const ACTION_LIST = `Supported actions (emit each as a block, JSON must be valid):
- create_instance {"action":"create_instance","className":"Part","name":"MyPart","parent":"Workspace","properties":{"Size":[4,4,4],"Position":[0,10,0],"Color":[139,92,246],"Material":"Neon","Anchored":true}}
- set_property    {"action":"set_property","path":"Workspace/MyPart","properties":{"Position":[0,20,0],"Color":[0,255,0],"Transparency":0.5}}
- insert_script   {"action":"insert_script","name":"...","parent":"ServerScriptService","scriptType":"Script|LocalScript|ModuleScript","source":"<full Luau source>"}
- set_source      {"action":"set_source","path":"ServerScriptService/MyScript","source":"<new source>"}
- get_source      {"action":"get_source","path":"ServerScriptService/MyScript"}
- inspect         {"action":"inspect","path":"Workspace"}
- delete_instance {"action":"delete_instance","path":"Workspace/OldPart"}
- duplicate_instance {"action":"duplicate_instance","path":"Workspace/MyPart","name":"MyPart2","parent":"Workspace"}
- create_folder   {"action":"create_folder","name":"Modules","parent":"ReplicatedStorage"}
- select          {"action":"select","path":"ServerScriptService/Main"}`;

function buildSystemPrompt(studioContext) {
  let ctx = '';
  if (studioContext) {
    ctx = `\nCurrent Roblox Studio state (reported by the plugin):\n- Place: ${studioContext.place || 'unknown'}\n- Selected: ${studioContext.selected && studioContext.selected.length ? studioContext.selected.join(', ') : '(nothing selected)'}\n- Studio is ${Date.now() - studioLastSeen < 15000 ? 'ONLINE (actions execute immediately)' : 'OFFLINE (actions will queue until Studio connects)'}`;
  }
  return `You are NeuroStudio, an AI pair-programmer and coding agent for Roblox Studio — like Claude Code, but inside Roblox. You are connected to the user's Roblox Studio via a local plugin that executes your actions.

You can: discuss ideas, answer questions, explain methods and patterns, review code, plan features, AND directly modify the user's Roblox place.

To act on the place, emit one or more action blocks in this exact format (inline in your reply):
[[NSAI_ACTION]]
{"action":"...","param":"..."}
[[/NSAI_ACTION]]

${ACTION_LIST}

RULES:
- ACTION BLOCKS (critical): use the tags EXACTLY [[NSAI_ACTION]] and [[/NSAI_ACTION]]. The JSON between them must be ONE valid JSON object — escape newlines inside strings as \\n and quotes as \\". Do NOT wrap action blocks in markdown code fences. Do NOT show action JSON without the tags — without tags it will NOT execute and the user sees raw JSON in chat. If you only EXPLAIN the format without acting, don't include any JSON object with an "action" key.
- Paths use "/" from the DataModel root: "ServerScriptService/Folder/Script". parent can be any service name.
- "source" strings in JSON MUST escape newlines as \\n and quotes as \\" so the JSON stays valid.
- Physical objects (parts, blocks, spawn locations, models, wedges, UI...) MUST be created DIRECTLY with create_instance so they appear immediately in the place — the user sees them in Studio instantly. NEVER wrap a physical build inside a runtime script.
- create_instance properties: Position/Size/Velocity as [x,y,z] in studs, Color as [r,g,b] 0-255, Material/Shape as enum name string ("Neon", "Block", "Ball"), numbers/booleans plain. Use "Anchored":true for static parts. Use parent:"Workspace" for world objects.
- insert_script is ONLY for game logic and behaviors that need code (doors, leaderboards, tools, mechanics).
- A typical build = several create_instance blocks (world) + at most ONE Script in ServerScriptService (logic tying it together).
- set_property moves/recolors/edits instances that already exist in the place.
- Always briefly explain in plain text what each action does, before or after the block.
- After get_source / inspect, the user (plugin) returns a "[STUDIO RESULT]" message — use it to answer.
- Be concise and friendly. Use short bullet points when explaining. The user speaks spanish — reply in Spanish unless they write in another language.
- If the user just asks a question or wants ideas, do NOT emit actions; just answer.${ctx}`;
}

const ACTION_TAG_SRC = '\\[\\[\\s*NSAI[_\\s-]?ACTIONS?\\s*\\]\\]([\\s\\S]*?)\\[\\[\\s*\\/\\s*NSAI[_\\s-]?ACTIONS?\\s*\\]\\]';

function fixActionJson(raw) {
  let s = raw.trim();
  s = s.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  let out = '', inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        if (c === '\n') { out += 'n'; esc = false; continue; }
        out += c; esc = false; continue;
      }
      if (c === '\\') { out += c; esc = true; continue; }
      if (c === '"') { inStr = false; out += c; continue; }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { continue; }
      if (c === '\t') { out += '\\t'; continue; }
      out += c; continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === ',') {
      let k = i + 1;
      while (k < s.length && /\s/.test(s[k])) k++;
      if (s[k] === '}' || s[k] === ']') continue;
    }
    out += c;
  }
  return out;
}

function tryParseAction(raw) {
  try { return JSON.parse(raw.trim()); } catch {}
  try { return JSON.parse(fixActionJson(raw)); } catch {}
  return null;
}

function extractBareActions(text) {
  const masked = text
    .replace(/```[\s\S]*?```/g, m => ' '.repeat(m.length))
    .replace(/`[^`\n]+`/g, m => ' '.repeat(m.length));
  const actions = [];
  const spans = [];
  let from = 0;
  while (true) {
    const idx = masked.indexOf('"action"', from);
    if (idx === -1) break;
    const start = masked.lastIndexOf('{', idx);
    if (start === -1 || !/^\{\s*$/.test(masked.slice(start, idx))) { from = idx + 1; continue; }
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < masked.length; i++) {
      const c = masked[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) { from = idx + 1; continue; }
    const a = tryParseAction(text.slice(start, end + 1));
    if (a && a.action) {
      actions.push(a);
      spans.push({ start, end: end + 1 });
      from = end + 1;
    } else {
      from = idx + 1;
    }
  }
  return { actions, spans };
}

function parseActions(content) {
  const actions = [];
  const tagRe = new RegExp(ACTION_TAG_SRC, 'gi');
  let text = content.replace(tagRe, (full, inner) => {
    const a = tryParseAction(inner);
    if (a && a.action) { actions.push(a); return ''; }
    return full;
  });
  const bare = extractBareActions(text);
  for (const a of bare.actions) actions.push(a);
  for (let i = bare.spans.length - 1; i >= 0; i--) {
    const s = bare.spans[i];
    text = text.slice(0, s.start) + text.slice(s.end);
  }
  text = text.replace(/\[\[\/?\s*NSAI[_\s-]?ACTIONS?\s*\]\]/gi, '');
  text = text.replace(/```[a-z]*\s*\n?\s*```/gi, '');
  return { text: text.trim(), actions };
}

function actionLabel(a) {
  return `${a.action}${a.name ? ` → ${a.name}` : ''}${a.path ? ` → ${a.path}` : ''}`;
}

function pushMessage(role, text, actions) {
  const msg = { id: newId('msg'), role, text, ts: Date.now(), actions: actions || [] };
  session.messages.push(msg);
  saveSession();
  return msg;
}

function queueActions(aiActions, sourceMsgId) {
  return aiActions.map(a => {
    const act = { id: newId('act'), sourceMsgId, action: a.action, params: a, label: actionLabel(a), status: 'pending', ts: Date.now() };
    session.actions.push(act);
    return act;
  });
}

function buildHistory() {
  return session.messages.slice(-20).map(m => {
    if (m.role === 'studio') return { role: 'user', content: '[STUDIO RESULT] ' + m.text };
    return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text };
  });
}

function studioOnline() {
  return Date.now() - studioLastSeen < 15000;
}

function resolveApiKey(provider, apiKey, providerId) {
  const isMock = provider.format === 'mock';
  if (!apiKey && !isMock) apiKey = keyVault[providerId] || '';
  if (apiKey && !isMock) { keyVault[providerId] = apiKey; keyVault.activeProvider = providerId; saveKeys(); }
  return { apiKey, isMock };
}

app.get('/api/providers', (req, res) => {
  res.json(PROVIDERS.map(p => ({
    id: p.id, name: p.name, format: p.format,
    defaultModel: p.defaultModel, docs: p.docs,
    needsBaseUrl: ['openai-azure', 'cloudflare', 'bedrock'].includes(p.format) || ['any-llm', 'databricks'].includes(p.id),
  })));
});

app.get('/api/plugin/health', (req, res) => res.json({ ok: true, service: 'NeuroStudio AI', time: Date.now() }));

app.get('/api/keys', (req, res) => {
  const keys = {};
  for (const [k, v] of Object.entries(keyVault)) {
    if (k !== 'activeProvider' && typeof v === 'string' && v) keys[k] = v;
  }
  res.json({ keys, activeProvider: keyVault.activeProvider });
});

app.post('/api/keys', (req, res) => {
  try {
    const { providerId, apiKey, active } = req.body || {};
    if (!providerId || typeof providerId !== 'string') return res.status(400).json({ error: 'Falta providerId.' });
    if (typeof apiKey === 'string') {
      if (apiKey) keyVault[providerId] = apiKey;
      else delete keyVault[providerId];
    }
    if (active && getProvider(providerId)) keyVault.activeProvider = providerId;
    saveKeys();
    res.json({ ok: true, activeProvider: keyVault.activeProvider, hasKey: !!(keyVault[keyVault.activeProvider]) });
  } catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

app.get('/api/chat/messages', (req, res) => {
  res.json({ version: session.version, messages: session.messages, actions: session.actions });
});

app.post('/api/chat/clear', (req, res) => {
  session.messages = [];
  session.actions = [];
  saveSession();
  res.json({ ok: true });
});

app.post('/api/chat/send', async (req, res) => {
  try {
    let { text, providerId, apiKey, model, baseUrl, accountId } = req.body;
    if (!text || !providerId) return res.status(400).json({ error: 'Falta el mensaje o el proveedor.' });

    const provider = getProvider(providerId);
    if (!provider) return res.status(400).json({ error: 'Proveedor desconocido: ' + providerId });
    ({ apiKey, isMock } = resolveApiKey(provider, apiKey, providerId));
    if (!apiKey && !isMock) return res.status(400).json({ error: 'No hay API key para ' + provider.name + '. Configúrala en la web (localhost:3000) o pégala en el widget.' });

    pushMessage('user', text);

    const studioCtx = studioOnline() ? session.studioContext : null;
    const messages = [
      { role: 'system', content: buildSystemPrompt(studioCtx) },
      ...buildHistory(),
    ];

    let content;
    try {
      content = await callProvider(provider, apiKey, model, messages, { baseUrl, accountId });
    } catch (err) {
      pushMessage('studio', '⚠️ Error del proveedor ' + provider.name + ': ' + err.message);
      return res.json({ ok: false, error: String(err.message || err) });
    }

    const { text: cleanText, actions } = parseActions(content);
    const queued = queueActions(actions, null);
    const assistantMsg = pushMessage('assistant', cleanText, queued.map(a => a.id));

    if (queued.length && !studioCtx) {
      pushMessage('studio', `⏳ ${queued.length} acción(es) en cola — se ejecutarán en Roblox Studio en cuanto lo abras.`);
    }

    lastGeneration = { prompt: text, content, ts: Date.now() };
    res.json({ ok: true, message: assistantMsg, actions: queued });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/api/models', async (req, res) => {
  try {
    let { providerId, apiKey, baseUrl } = req.body || {};
    if (!providerId) return res.status(400).json({ error: 'Falta providerId.' });
    const provider = getProvider(providerId);
    if (!provider) return res.status(400).json({ error: 'Proveedor desconocido.' });
    const isMock = provider.format === 'mock';
    if (!apiKey && !isMock) apiKey = keyVault[providerId] || '';
    if (!apiKey && !isMock) return res.status(400).json({ error: 'No hay API key para ' + provider.name + '.' });
    const base = baseUrl || provider.baseUrl;

    let ids = [];
    if (isMock) {
      ids = ['mock-1'];
    } else if (provider.format === 'openai') {
      const r = await fetch(`${base}/models`, { headers: { 'Authorization': `Bearer ${apiKey}`, ...providerHeaders(provider) } });
      if (!r.ok) throw new Error(`${provider.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      ids = (d.data || d.models || []).map(m => m.id || m.name).filter(Boolean).sort();
    } else if (provider.format === 'google') {
      const r = await fetch(`${base}/v1beta/models?key=${apiKey}&pageSize=200`);
      if (!r.ok) throw new Error(`${provider.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      ids = (d.models || []).map(m => String(m.name || '').replace(/^models\//, '')).filter(Boolean).sort();
    } else if (provider.format === 'anthropic') {
      const r = await fetch(`${base}/v1/models?limit=100`, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      });
      if (!r.ok) throw new Error(`${provider.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      ids = (d.data || []).map(m => m.id).filter(Boolean).sort();
    } else if (provider.format === 'cohere') {
      const r = await fetch(`${base}/v1/models?limit=100`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      if (!r.ok) throw new Error(`${provider.name}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      ids = (d.models || []).map(m => m.name).filter(Boolean).sort();
    } else {
      return res.json({ ok: true, models: [], count: 0, note: 'Este proveedor no expone lista de modelos — escríbelo a mano.' });
    }
    res.json({ ok: true, models: ids, count: ids.length });
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
});

app.get('/api/studio/status', (req, res) => {
  res.json({ online: studioOnline(), lastSeen: studioLastSeen, context: studioOnline() ? (session.studioContext || null) : null });
});

app.post('/api/chat/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  try {
    let { text, providerId, apiKey, model, baseUrl, accountId } = req.body;
    if (!text || !providerId) { send({ error: 'Falta el mensaje o el proveedor.' }); return res.end(); }
    const provider = getProvider(providerId);
    if (!provider) { send({ error: 'Proveedor desconocido: ' + providerId }); return res.end(); }
    const isMock = provider.format === 'mock';
    if (!apiKey && !isMock) apiKey = keyVault[providerId] || '';
    if (apiKey && !isMock) { keyVault[providerId] = apiKey; keyVault.activeProvider = providerId; saveKeys(); }
    if (!apiKey && !isMock) { send({ error: 'No hay API key para ' + provider.name + '. Configúrala en la web (localhost:3000) o pégala en el widget.' }); return res.end(); }

    pushMessage('user', text);
    const studioCtx = studioOnline() ? session.studioContext : null;
    const messages = [
      { role: 'system', content: buildSystemPrompt(studioCtx) },
      ...buildHistory(),
    ];

    let content = '';
    let streamed = false;
    if (provider.format === 'openai' && !isMock) {
      try {
        const base = baseUrl || provider.baseUrl;
        const modelId = model || provider.defaultModel;
        const attempts = [
          { model: modelId, messages, max_tokens: 16384, stream: true },
          { model: modelId, messages, max_completion_tokens: 16384, stream: true },
          { model: modelId, messages, max_tokens: 4096, stream: true },
        ];
        let upstream, lastErr;
        for (const body of attempts) {
          upstream = await fetch(`${base}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              ...providerHeaders(provider),
            },
            body: JSON.stringify(body),
          });
          if (upstream.ok && upstream.body) break;
          lastErr = `${provider.name}: ${upstream.status} ${(await upstream.text().catch(() => '')).slice(0, 300)}`;
          if (upstream.status !== 400 || !/max_tokens|max_completion_tokens|exceed|maximum/i.test(lastErr)) throw new Error(lastErr);
        }
        if (!upstream.ok) throw new Error(lastErr);

        const decoder = new TextDecoder();
        let buf = '';
        for await (const chunk of upstream.body) {
          buf += decoder.decode(chunk, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              const d = (j.choices && j.choices[0] && j.choices[0].delta) || {};
              const think = d.reasoning_content || d.reasoning || '';
              const text = d.content || '';
              if (think) send({ thinking: think });
              if (text) { content += text; streamed = true; send({ delta: text }); }
            } catch {}
          }
        }
      } catch (streamErr) {
        if (streamed) throw streamErr;
        content = await callProvider(provider, apiKey, model, messages, { baseUrl, accountId });
        send({ delta: content });
      }
    } else {
      content = await callProvider(provider, apiKey, model, messages, { baseUrl, accountId });
      send({ delta: content });
    }
    if (!content) {
      content = '⚠️ El modelo no produjo respuesta visible — probablemente agotó el límite de tokens razonando. Vuelve a intentarlo o elige un modelo más directo.';
      send({ delta: content });
    }

    const { text: cleanText, actions } = parseActions(content);
    const queued = queueActions(actions, null);
    const assistantMsg = pushMessage('assistant', cleanText, queued.map(a => a.id));
    if (queued.length && !studioOnline()) {
      pushMessage('studio', `⏳ ${queued.length} acción(es) en cola — se ejecutarán en Roblox Studio en cuanto lo abras.`);
    }
    lastGeneration = { prompt: text, content, ts: Date.now() };
    send({ done: true, message: assistantMsg, actions: queued });
    res.end();
  } catch (err) {
    pushMessage('studio', '⚠️ Error del proveedor ' + String(err.message || err));
    try { send({ error: String(err.message || err) }); res.end(); } catch {}
  }
});

app.post('/api/plugin/sync', (req, res) => {
  studioLastSeen = Date.now();
  const ctx = req.body && req.body.context;
  if (ctx) session.studioContext = ctx;

  const pending = session.actions.filter(a => a.status === 'pending');
  res.json({
    ok: true, messages: session.messages.slice(-40), pendingActions: pending, version: session.version,
    keyStatus: { provider: keyVault.activeProvider, hasKey: !!(keyVault[keyVault.activeProvider]) },
  });
});

app.post('/api/plugin/result', (req, res) => {
  try {
    const { actionId, ok, error, resultText } = req.body;
    const act = session.actions.find(a => a.id === actionId);
    if (!act) return res.status(404).json({ error: 'Acción no encontrada: ' + actionId });

    act.status = ok ? 'done' : 'error';
    act.result = ok ? 'ok' : String(error || 'error');
    saveSession();

    const label = act.label || act.action;
    let text;
    if (!ok) text = `✗ ${label} → ERROR: ${act.result}`;
    else if (resultText) text = `✓ ${label} → ok\n${String(resultText).slice(0, 4000)}`;
    else text = `✓ ${label} → ejecutado en Studio`;
    pushMessage('studio', text);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { providerId, apiKey, model, prompt, baseUrl, accountId } = req.body;
    const provider = getProvider(providerId);
    if (!provider) return res.status(400).json({ error: 'Unknown provider' });
    let key = apiKey;
    if (!key) key = keyVault[providerId] || '';
    if (!key) return res.status(400).json({ error: 'No API key set' });
    const content = await callProvider(provider, key, model, [
      { role: 'system', content: buildSystemPrompt(null) },
      { role: 'user', content: prompt },
    ], { baseUrl, accountId });
    lastGeneration = { prompt, content, ts: Date.now() };
    res.json({ ok: true, content });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get('/api/plugin/last', (req, res) => {
  if (!lastGeneration) return res.status(404).json({ error: 'No generation yet' });
  res.json(lastGeneration);
});

function getPluginsDir() {
  const local = process.env.LOCALAPPDATA;
  return local ? path.join(local, 'Roblox', 'Plugins') : null;
}

app.get('/api/plugin/status', (req, res) => {
  const pluginsDir = getPluginsDir();
  if (!pluginsDir) return res.json({ installed: false, error: 'Solo Windows.' });
  const dest = path.join(pluginsDir, 'NeuroStudioAI');
  res.json({ installed: fs.existsSync(path.join(dest, 'main.lua')), path: dest, pluginsDir });
});

app.post('/api/plugin/install', (req, res) => {
  try {
    const pluginsDir = getPluginsDir();
    if (!pluginsDir) return res.status(500).json({ error: 'Solo Windows.' });
    fs.mkdirSync(pluginsDir, { recursive: true });
    const dest = path.join(pluginsDir, 'NeuroStudioAI');
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(__dirname, 'plugin', 'NeuroStudioAI'), dest, { recursive: true });
    res.json({ ok: true, path: dest, note: 'Reinicia Roblox Studio para ver el plugin.' });
  } catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

app.post('/api/plugin/uninstall', (req, res) => {
  try {
    fs.rmSync(path.join(getPluginsDir(), 'NeuroStudioAI'), { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

app.get('/api/roblox/status', (req, res) => res.json({ profile: loadData().robloxProfile || null }));

app.post('/api/roblox/link', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') return res.status(400).json({ error: 'Falta el nombre de usuario.' });
    const r = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    const users = await r.json();
    const u = users.data && users.data[0];
    if (!u) return res.status(404).json({ error: `Usuario no encontrado: "${username}"` });
    const detail = await (await fetch(`https://users.roblox.com/v1/users/${u.id}`)).json();
    const thumb = await (await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${u.id}&size=150x150&format=Png&isCircular=true`)).json();
    const profile = {
      id: u.id, username: u.name, displayName: u.displayName,
      avatar: (thumb.data && thumb.data[0] && thumb.data[0].imageUrl) || null,
      created: detail.created, isBanned: !!detail.isBanned, linkedAt: Date.now(),
    };
    const data = loadData(); data.robloxProfile = profile; saveData(data);
    res.json({ ok: true, profile });
  } catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

app.post('/api/roblox/unlink', (req, res) => {
  const data = loadData(); delete data.robloxProfile; saveData(data);
  res.json({ ok: true });
});

app.get('/api/plugin/download', async (req, res) => {
  const zip = new JSZip();
  const folder = zip.folder('NeuroStudioAI');
  const walk = (dir, zf) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, zf.folder(e.name));
      else zf.file(e.name, fs.readFileSync(full));
    }
  };
  walk(path.join(__dirname, 'plugin', 'NeuroStudioAI'), folder);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="NeuroStudioAI.zip"');
  res.send(buf);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  NeuroStudio AI');
  console.log(`  Web UI    :  http://localhost:${PORT}`);
  console.log(`  Providers :  ${PROVIDERS.length}`);
  console.log('');
});
