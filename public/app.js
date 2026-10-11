const $ = (id) => document.getElementById(id);
let PROVIDERS = [];
let vaultActive = null;

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    $('tab-' + btn.dataset.tab).classList.add('active');
  });
});

let toastTimer;
function toast(msg, ok = true) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'toast show ' + (ok ? 'ok' : 'err');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

const keyStore = {
  get: (id) => localStorage.getItem('nsai_key_' + id) || '',
  set: (id, v) => localStorage.setItem('nsai_key_' + id, v),
  remove: (id) => localStorage.removeItem('nsai_key_' + id),
};

async function syncVaultToLocal() {
  try {
    const d = await (await fetch('/api/keys')).json();
    if (d && d.keys) {
      for (const [id, key] of Object.entries(d.keys)) {
        if (key && key !== keyStore.get(id)) keyStore.set(id, key);
      }
    }
    if (d && d.activeProvider) vaultActive = d.activeProvider;
  } catch {}
}

async function loadProviders() {
  try {
    PROVIDERS = await (await fetch('/api/providers')).json();
    document.querySelector('.badge').textContent = PROVIDERS.length;
    const sel = $('providerSelect');
    sel.innerHTML = '';
    const priority = ['openrouter', 'openai', 'google', 'nvidia', 'groq'];
    const sorted = [...PROVIDERS].sort((a, b) => {
      const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.name.localeCompare(b.name);
    });
    for (const p of sorted) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + (keyStore.get(p.id) ? ' ✓' : '');
      sel.appendChild(opt);
    }
    if (vaultActive && [...sel.options].some(o => o.value === vaultActive)) sel.value = vaultActive;
    onProviderChange();
    renderKeys();
  } catch {}
}

function currentProvider() { return PROVIDERS.find(p => p.id === $('providerSelect').value); }

const modelsCache = {};
function applyModels(d) {
  const dl = $('modelList');
  dl.innerHTML = '';
  if (d && d.ok && d.count > 0) {
    for (const m of d.models.slice(0, 500)) {
      const o = document.createElement('option');
      o.value = m;
      dl.appendChild(o);
    }
    $('modelInput').placeholder = `modelo — ${d.count} disponibles ▾`;
  } else {
    $('modelInput').placeholder = d && d.note ? 'modelo (escríbelo a mano)' : 'modelo (opcional)';
  }
}
async function loadModelsFor(p) {
  const apiKey = p.format === 'mock' ? 'mock' : keyStore.get(p.id);
  if (!apiKey) { $('modelInput').placeholder = p.defaultModel || 'modelo (opcional)'; applyModels(null); return; }
  const cacheKey = p.id + ':' + apiKey.slice(-6) + ':' + apiKey.length;
  if (modelsCache[cacheKey]) { applyModels(modelsCache[cacheKey]); return; }
  try {
    const r = await fetch('/api/models', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: p.id, apiKey }),
    });
    const d = await r.json();
    modelsCache[cacheKey] = d;
    applyModels(d);
  } catch {}
}
function onProviderChange() {
  const p = currentProvider();
  if (!p) return;
  $('modelInput').placeholder = p.defaultModel || 'modelo (opcional)';
  $('baseUrlInput').style.display = p.needsBaseUrl ? '' : 'none';
  loadModelsFor(p);
}
$('providerSelect').addEventListener('change', onProviderChange);

let sending = false;
let lastVersion = -1;
let abortCtrl = null;

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
}

function renderInline(t) {
  return escapeHtml(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<b>$1</b>')
    .replace(/^## (.+)$/gm, '<b>$1</b>')
    .replace(/^# (.+)$/gm, '<b>$1</b>')
    .replace(/^[-*] (.+)$/gm, '&nbsp;• $1')
    .replace(/\n/g, '<br>');
}

function renderMarkdown(text) {
  const fenceRe = /```([a-zA-Z0-9+#-]*)\n?([\s\S]*?)```/g;
  let html = '';
  let last = 0;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    html += renderInline(text.slice(last, m.index));
    const lang = m[1] || 'code';
    const code = m[2].replace(/\n$/, '');
    html += `<div class="code-block"><div class="code-head"><span>${escapeHtml(lang)}</span><button class="copy-btn" data-code="${encodeURIComponent(code)}">Copiar</button></div><pre class="chat-code"><code>${escapeHtml(code)}</code></pre></div>`;
    last = m.index + m[0].length;
  }
  html += renderInline(text.slice(last));
  return html;
}

function actionStatusChip(action) {
  const map = {
    pending: ['⏳ ejecutando en Studio…', 'warn'],
    done: ['✓ ejecutado en Studio', 'ok'],
    error: ['✗ error', 'err'],
  };
  const [label, cls] = map[action.status] || map.pending;
  return `<div class="action-chip ${cls}"><span class="action-icon">⚡</span><code>${escapeHtml(action.label || action.action)}</code><span class="action-status">${label}</span></div>`;
}

function msgTime(ts) {
  if (!ts) return '';
  return `<div class="msg-time">${new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</div>`;
}

function messageHtml(m) {
  if (m.role === 'user') {
    return `<div class="msg user"><div class="msg-bubble user-bubble">${escapeHtml(m.text).replace(/\n/g, '<br>')}${msgTime(m.ts)}</div></div>`;
  }
  if (m.role === 'studio') {
    return `<div class="msg studio"><div class="msg-bubble studio-bubble">${escapeHtml(m.text).replace(/\n/g, '<br>')}${msgTime(m.ts)}</div></div>`;
  }
  const actions = session_actions.filter(a => (m.actions || []).includes(a.id));
  return `<div class="msg assistant">
    <div class="msg-avatar">⚡</div>
    <div class="msg-bubble assistant-bubble">
      ${renderMarkdown(m.text)}
      ${actions.map(actionStatusChip).join('')}
      ${msgTime(m.ts)}
    </div>
  </div>`;
}

let session_actions = [];

function renderChat(messages) {
  const box = $('chatBox');
  const empty = $('chatEmpty');
  if (!messages.length) { box.querySelectorAll('.msg').forEach(e => e.remove()); empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  box.querySelectorAll('.msg').forEach(e => e.remove());
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  for (const m of messages) {
    box.insertAdjacentHTML('beforeend', messageHtml(m));
  }
  if (nearBottom || sending) box.scrollTop = box.scrollHeight;
}

async function pollChat() {
  try {
    const d = await (await fetch('/api/chat/messages')).json();
    if (d.version !== lastVersion) {
      lastVersion = d.version;
      session_actions = d.actions;
      renderChat(d.messages);
    }
  } catch {}
}

async function pollStudio() {
  try {
    const d = await (await fetch('/api/studio/status')).json();
    $('studioDot').classList.toggle('online', d.online);
    $('studioText').textContent = d.online ? 'Studio conectado' : 'Studio offline';
  } catch {}
}

let thinkTimer = null, thinkStart = 0;
const TYPING_HTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span> NeuroStudio está pensando…';
function startThinking() {
  stopThinking();
  thinkStart = Date.now();
  thinkTimer = setInterval(() => {
    const s = Math.round((Date.now() - thinkStart) / 1000);
    $('typing').innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span> NeuroStudio está pensando… <b>${s}s</b>`;
  }, 1000);
}
function stopThinking() {
  if (thinkTimer) { clearInterval(thinkTimer); thinkTimer = null; }
  $('typing').innerHTML = TYPING_HTML;
}

async function sendMessage(text) {
  if (sending) return;
  text = (text || '').trim();
  if (!text) return;
  const p = currentProvider();
  if (!p) { toast('No hay proveedor seleccionado', false); return; }
  const apiKey = keyStore.get(p.id);
  if (!apiKey) {
    toast('Configura la API key de ' + p.name + ' primero', false);
    document.querySelector('[data-tab="keys"]').click();
    return;
  }

  sending = true;
  setSendState('stop');
  $('typing').classList.remove('hidden');
  startThinking();
  abortCtrl = new AbortController();

  const input = $('chatInput');
  input.value = '';
  input.style.height = 'auto';

  $('chatEmpty').classList.add('hidden');
  $('chatBox').insertAdjacentHTML('beforeend',
    `<div class="msg user"><div class="msg-bubble user-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}${msgTime(Date.now())}</div></div>`);
  $('chatBox').scrollTop = $('chatBox').scrollHeight;

  let streamBubble = null, thinkBox = null, thinkText = '', contentDiv = null;
  try {
    const r = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        providerId: p.id,
        apiKey,
        model: $('modelInput').value.trim() || p.defaultModel,
        baseUrl: $('baseUrlInput').value.trim() || undefined,
      }),
      signal: abortCtrl.signal,
    });
    if (!r.ok || !r.body) throw new Error('respuesta ' + r.status);

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '', aiText = '', firstDelta = false;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 2);
        if (!raw.startsWith('data:')) continue;
        let ev;
        try { ev = JSON.parse(raw.slice(5).trim()); } catch { continue; }
        if (ev.error) { toast(ev.error, false); continue; }

        if (ev.thinking) {
          $('typing').classList.add('hidden');
          if (!streamBubble) {
            $('chatBox').insertAdjacentHTML('beforeend',
              `<div class="msg assistant"><div class="msg-avatar">⚡</div><div class="msg-bubble assistant-bubble streaming-bubble"></div></div>`);
            streamBubble = $('chatBox').querySelector('.streaming-bubble');
          }
          if (!thinkBox) {
            thinkBox = document.createElement('div');
            thinkBox.className = 'thinking-box';
            streamBubble.appendChild(thinkBox);
          }
          thinkText += ev.thinking;
          thinkBox.textContent = '💭 ' + thinkText.slice(-1500);
          $('chatBox').scrollTop = $('chatBox').scrollHeight;
        }

        if (ev.delta) {
          aiText += ev.delta;
          if (!firstDelta) {
            firstDelta = true;
            $('typing').classList.add('hidden');
            if (thinkBox) {
              const s = Math.round((Date.now() - thinkStart) / 1000);
              const note = document.createElement('div');
              note.className = 'think-note';
              note.textContent = `💭 razonó ${s}s`;
              thinkBox.replaceWith(note);
              thinkBox = null;
            }
          }
          if (!streamBubble) {
            $('chatBox').insertAdjacentHTML('beforeend',
              `<div class="msg assistant"><div class="msg-avatar">⚡</div><div class="msg-bubble assistant-bubble streaming-bubble"></div></div>`);
            streamBubble = $('chatBox').querySelector('.streaming-bubble');
          }
          if (!contentDiv) {
            contentDiv = document.createElement('div');
            contentDiv.className = 'stream-content';
            streamBubble.appendChild(contentDiv);
          }
          const visible = aiText.replace(/\[\[\s*NSAI[_\s-]?ACTIONS?\s*\]\][\s\S]*?(?:\[\[\s*\/\s*NSAI[_\s-]?ACTIONS?\s*\]\]|$)/gi, '`⚡ generando acción…`');
          contentDiv.innerHTML = renderMarkdown(visible);
          $('chatBox').scrollTop = $('chatBox').scrollHeight;
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') toast('Generación detenida');
    else toast('Error de red: ' + err.message, false);
  } finally {
    sending = false;
    abortCtrl = null;
    setSendState('idle');
    stopThinking();
    $('typing').classList.add('hidden');
    lastVersion = -1;
    pollChat();
  }
}

function setSendState(state) {
  const btn = $('sendBtn');
  if (state === 'stop') {
    btn.textContent = '⏹ Detener';
    btn.classList.add('stop');
    btn.disabled = false;
  } else {
    btn.textContent = 'Enviar ➤';
    btn.classList.remove('stop');
    btn.disabled = false;
  }
}

$('sendBtn').addEventListener('click', () => {
  if (sending) { if (abortCtrl) abortCtrl.abort(); return; }
  sendMessage($('chatInput').value);
});
$('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage($('chatInput').value); }
});
$('chatInput').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 140) + 'px';
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('chatInput').focus(); }
});
document.querySelectorAll('.suggestion').forEach(s => {
  s.addEventListener('click', () => { sendMessage(s.dataset.text); });
});

$('chatBox').addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  const code = decodeURIComponent(btn.dataset.code || '');
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✓ Copiado';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1400);
  }).catch(() => {});
});

$('clearChatBtn').addEventListener('click', async () => {
  await fetch('/api/chat/clear', { method: 'POST' });
  lastVersion = -1;
  pollChat();
  toast('Conversación limpiada');
});

function renderKeys() {
  const grid = $('keysGrid');
  if (!grid) return;
  const search = $('keySearch').value.toLowerCase();
  const filter = $('keyFilter').value;
  grid.innerHTML = '';
  const priority = ['openrouter', 'openai', 'google', 'nvidia', 'groq'];
  const sorted = [...PROVIDERS].sort((a, b) => {
    const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name);
  });
  for (const p of sorted) {
    const has = !!keyStore.get(p.id);
    if (filter === 'set' && !has) continue;
    if (filter === 'missing' && has) continue;
    if (search && !p.name.toLowerCase().includes(search)) continue;
    const card = document.createElement('div');
    card.className = 'key-card' + (has ? ' configured' : '');
    card.dataset.pid = p.id;
    card.innerHTML = `
      <div class="key-card-head">
        <span class="key-card-name">${escapeHtml(p.name)}</span>
        <span class="key-card-tag">${escapeHtml(p.format)}</span>
      </div>
      <div class="key-input-row">
        <input type="password" placeholder="${has ? '•••••••• configurada' : 'sk-… pega tu API key aquí'}">
        <button class="key-save">Guardar</button>
      </div>
      <div class="key-status"></div>
      ${p.docs ? `<a class="key-link" href="${p.docs}" target="_blank" rel="noopener">Obtener API key ↗</a>` : ''}
    `;
    card.querySelector('.key-save').addEventListener('click', () => {
      const input = card.querySelector('input');
      const key = input.value.trim();
      if (key) { keyStore.set(p.id, key); toast('API key de ' + p.name + ' guardada'); }
      else { keyStore.remove(p.id); toast('API key de ' + p.name + ' eliminada', false); }
      fetch('/api/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: p.id, apiKey: key, active: !!key }),
      }).catch(() => {});
      renderKeys(); loadProviderBadges(); onProviderChange();
      verifyKey(p.id, key);
    });
    grid.appendChild(card);
  }
}

function verifyKey(providerId, key) {
  const el = document.querySelector(`.key-card[data-pid="${providerId}"] .key-status`);
  if (!el) return;
  if (!key) { el.textContent = ''; el.className = 'key-status'; return; }
  el.className = 'key-status';
  el.textContent = 'verificando…';
  fetch('/api/models', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, apiKey: key }),
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        el.className = 'key-status ok';
        el.textContent = d.count > 0 ? `✓ key válida · ${d.count} modelo(s) disponibles` : '✓ key guardada';
        if (d.models && d.models.length) {
          const cacheKey = providerId + ':' + key.slice(-6) + ':' + key.length;
          modelsCache[cacheKey] = d;
        }
      } else {
        el.className = 'key-status err';
        el.textContent = '✗ ' + String(d.error || 'key inválida').slice(0, 140);
      }
    })
    .catch(() => {
      el.className = 'key-status err';
      el.textContent = '✗ sin conexión con el servidor';
    });
}

function loadProviderBadges() {
  const sel = $('providerSelect');
  for (const opt of sel.options) {
    const p = PROVIDERS.find(x => x.id === opt.value);
    if (p) opt.textContent = p.name + (keyStore.get(p.id) ? ' ✓' : '');
  }
}
$('keySearch').addEventListener('input', renderKeys);
$('keyFilter').addEventListener('change', renderKeys);

async function checkInstallStatus() {
  try {
    const d = await (await fetch('/api/plugin/status')).json();
    const el = $('installStatus');
    if (d.installed) {
      el.innerHTML = '✓ Instalado en: <code>' + d.path + '</code>';
      el.classList.add('ok');
      $('installBtn').textContent = 'Reinstalar / Actualizar';
    } else {
      el.textContent = 'No instalado — pulsa el botón para instalarlo automáticamente.';
    }
  } catch {}
}

$('installBtn').addEventListener('click', async () => {
  const btn = $('installBtn');
  btn.disabled = true; btn.textContent = 'Instalando…';
  try {
    const d = await (await fetch('/api/plugin/install', { method: 'POST' })).json();
    if (d.ok) {
      $('installStatus').innerHTML = '✓ Instalado en: <code>' + d.path + '</code> — ' + d.note;
      $('installStatus').classList.add('ok');
      btn.textContent = 'Reinstalar / Actualizar';
      toast('Plugin instalado — reinicia Roblox Studio');
    } else throw new Error(d.error);
  } catch (err) {
    $('installStatus').textContent = 'Error: ' + err.message;
    toast('Error al instalar', false);
  } finally { btn.disabled = false; }
});

function renderProfile(p) {
  if (!p) { $('profileCard').classList.add('hidden'); $('linkBox').classList.remove('hidden'); return; }
  $('profileAvatar').src = p.avatar || '';
  $('profileName').textContent = p.displayName;
  $('profileUsername').textContent = '@' + p.username;
  $('profileId').textContent = 'ID: ' + p.id;
  $('profileJoined').textContent = 'En Roblox desde: ' + (p.created ? new Date(p.created).toLocaleDateString('es', { year: 'numeric', month: 'long' }) : '—');
  $('profileCard').classList.remove('hidden');
  $('linkBox').classList.add('hidden');
}
async function loadAccount() {
  try { renderProfile((await (await fetch('/api/roblox/status')).json()).profile); } catch {}
}

$('linkBtn').addEventListener('click', async () => {
  const username = $('robloxUsername').value.trim();
  if (!username) { toast('Escribe tu usuario de Roblox', false); return; }
  const btn = $('linkBtn'); btn.disabled = true; btn.textContent = 'Verificando…';
  try {
    const d = await (await fetch('/api/roblox/link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })).json();
    if (d.ok) { renderProfile(d.profile); toast('Cuenta vinculada: @' + d.profile.username); }
    else { $('linkError').classList.remove('hidden'); $('linkErrorText').textContent = d.error; }
  } catch (err) {
    $('linkError').classList.remove('hidden');
    $('linkErrorText').textContent = String(err.message || err);
  } finally { btn.disabled = false; btn.textContent = 'Vincular cuenta'; }
});

$('unlinkBtn').addEventListener('click', async () => {
  await fetch('/api/roblox/unlink', { method: 'POST' });
  renderProfile(null); $('robloxUsername').value = '';
  toast('Cuenta desvinculada');
});

syncVaultToLocal().then(() => {
  loadProviders();
  checkInstallStatus();
  loadAccount();
  pollChat();
  pollStudio();
});
setInterval(pollChat, 1500);
setInterval(pollStudio, 5000);
