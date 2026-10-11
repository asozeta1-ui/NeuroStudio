const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};

async function j(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  console.log('=== NeuroStudio AI ===\n');

  let r = await j('GET', '/api/plugin/health');
  ok('GET /api/plugin/health', r.status === 200 && r.data.ok === true);

  r = await j('GET', '/api/providers');
  ok('GET /api/providers (60+)', r.status === 200 && r.data.length >= 60, `got ${r.data?.length}`);
  const ids = r.data.map(p => p.id);
  for (const req of ['openrouter', 'openai', 'google', 'nvidia', 'groq', 'mock']) {
    ok(`  incluye ${req}`, ids.includes(req));
  }

  const home = await fetch(BASE + '/');
  const homeHtml = await home.text();
  ok('GET / (web)', home.status === 200 && homeHtml.includes('NeuroStudio'));

  r = await j('POST', '/api/chat/clear', {});
  ok('POST /api/chat/clear', r.status === 200 && r.data.ok === true);

  r = await j('GET', '/api/chat/messages');
  ok('GET /api/chat/messages (vacío)', r.status === 200 && r.data.messages.length === 0);

  const vaultBackup = (await j('GET', '/api/keys')).data.keys?.openai || '';
  await j('POST', '/api/keys', { providerId: 'openai', apiKey: '' });
  r = await j('GET', '/api/keys');
  ok('GET/POST /api/keys (vault vacío)', !r.data.keys.openai);

  r = await j('POST', '/api/chat/send', { text: 'hola', providerId: 'openai', apiKey: '' });
  ok('POST /api/chat/send sin key → 400', r.status === 400);

  r = await j('POST', '/api/chat/send', { text: 'hola', providerId: 'no-existe', apiKey: 'x' });
  ok('POST /api/chat/send provider inválido → 400', r.status === 400);

  r = await j('POST', '/api/chat/send', { text: 'inspecciona el Workspace', providerId: 'mock', apiKey: 'test', model: 'mock-1' });
  ok('POST /api/chat/send (mock inspect)', r.status === 200 && r.data.ok === true, JSON.stringify(r.data).slice(0, 120));
  ok('  respuesta sin bloques NSAI_ACTION', r.data.ok && !r.data.message.text.includes('NSAI_ACTION'));
  ok('  acción encolada', r.data.ok && r.data.actions.length === 1 && r.data.actions[0].action === 'inspect');

  r = await j('GET', '/api/chat/messages');
  const expectCount = 2 + (Date.now() - (await j('GET', '/api/studio/status')).data.lastSeen > 15000 ? 1 : 0);
  ok('  chat: mensajes user+assistant', r.data.messages.length === expectCount, `got ${r.data.messages.length}`);
  ok('  chat: assistant tiene acción', r.data.messages.find(m => m.role === 'assistant').actions.length === 1);

  r = await j('POST', '/api/plugin/sync', { context: { place: 'TestPlace', selected: ['Workspace/Baseplate'] } });
  ok('POST /api/plugin/sync', r.status === 200 && r.data.ok === true);
  ok('  plugin recibe 1 acción pendiente', r.data.pendingActions.length === 1, `got ${r.data.pendingActions.length}`);
  const actId = r.data.pendingActions[0]?.id;

  r = await j('GET', '/api/studio/status');
  ok('GET /api/studio/status (online)', r.data.online === true && r.data.context?.place === 'TestPlace');

  r = await j('POST', '/api/plugin/result', { actionId: actId, ok: true, resultText: "Workspace 'Workspace' hijos:\n  - Part Baseplate" });
  ok('POST /api/plugin/result', r.status === 200 && r.data.ok === true);

  r = await j('GET', '/api/chat/messages');
  const studioMsgs = r.data.messages.filter(m => m.role === 'studio');
  const resultMsg = studioMsgs.find(m => m.text.includes('inspect') && m.text.includes('✓'));
  ok('  mensaje [STUDIO RESULT] en el chat', !!resultMsg, JSON.stringify(studioMsgs.map(m => m.text.slice(0, 40))));
  ok('  acción marcada done', r.data.actions.find(a => a.id === actId)?.status === 'done');

  r = await j('POST', '/api/chat/send', { text: 'construye algo', providerId: 'mock', apiKey: 'test' });
  ok('POST /api/chat/send turno 2 (mock build)', r.data.ok === true);
  ok('  acción insert_script encolada', r.data.actions[0]?.action === 'insert_script');

  r = await j('POST', '/api/plugin/sync', { context: { place: 'TestPlace', selected: [] } });
  const insAct = r.data.pendingActions[0];
  ok('  plugin recibe insert_script', insAct?.action === 'insert_script');
  r = await j('POST', '/api/plugin/result', { actionId: insAct.id, ok: true, resultText: null });
  ok('  resultado insert_script reportado', r.data.ok === true);

  r = await j('POST', '/api/chat/send', { text: 'pon un bloque', providerId: 'mock', apiKey: 'test' });
  ok('chat turno 3 (mock bloque)', r.data.ok === true);
  ok('  acción create_instance encolada', r.data.actions[0]?.action === 'create_instance', JSON.stringify(r.data.actions?.[0]?.action));
  r = await j('POST', '/api/plugin/sync', { context: { place: 'TestPlace', selected: [] } });
  const cubeAct = r.data.pendingActions[0];
  ok('  plugin recibe create_instance', cubeAct?.action === 'create_instance');
  const cubeParams = cubeAct?.params || {};
  ok('  params del bloque válidos', cubeParams.className === 'Part' && cubeParams.parent === 'Workspace' && !!cubeParams.properties?.Size && !!cubeParams.properties?.Anchored);
  r = await j('POST', '/api/plugin/result', { actionId: cubeAct.id, ok: true, resultText: "Part 'NeuroCube' creado en Workspace" });
  ok('  resultado create_instance reportado', r.data.ok === true);

  {
    const res = await fetch(BASE + '/api/chat/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'pon otro bloque', providerId: 'mock', apiKey: 'test' }),
    });
    const raw = await res.text();
    const events = raw.split('\n\n').filter(Boolean).map(l => JSON.parse(l.replace(/^data: /, '')));
    const deltaEv = events.find(e => typeof e.delta === 'string' && e.delta.length > 0);
    const doneEv = events.find(e => e.done);
    ok('POST /api/chat/stream (SSE)', res.status === 200 && !!deltaEv && !!doneEv);
    ok('  stream: delta con create_instance', deltaEv?.delta.includes('create_instance'));
    ok('  stream: done con acción parseada', doneEv?.actions?.length === 1 && doneEv.actions[0].action === 'create_instance');
  }

  r = await j('POST', '/api/chat/send', { text: 'crea un bloque buggy', providerId: 'mock', apiKey: 'test' });
  ok('chat turno 4 (mock buggy)', r.data.ok === true);
  ok('  acción buggy rescatada y encolada', r.data.actions[0]?.action === 'create_instance', JSON.stringify(r.data.actions?.[0]?.action));
  ok('  chat limpio: sin tags ni JSON visible', !r.data.message.text.includes('NSAI') && !r.data.message.text.includes('"action"'), JSON.stringify(r.data.message.text).slice(0, 120));
  r = await j('POST', '/api/plugin/sync', { context: { place: 'TestPlace', selected: [] } });
  const buggyAct = r.data.pendingActions.find(a => a.params?.name === 'Buggy\nCube');
  ok('  plugin recibe la acción buggy', buggyAct?.action === 'create_instance');
  for (const act of r.data.pendingActions) {
    await j('POST', '/api/plugin/result', { actionId: act.id, ok: true, resultText: null });
  }
  ok('  resultados reportados', true);

  r = await j('POST', '/api/roblox/link', { username: 'builderman' });
  ok('POST /api/roblox/link (builderman)', r.status === 200 && r.data.ok === true && r.data.profile.id === 156, JSON.stringify(r.data).slice(0, 100));
  r = await j('GET', '/api/roblox/status');
  ok('GET /api/roblox/status', r.data.profile?.username === 'builderman');
  r = await j('POST', '/api/roblox/unlink', {});
  ok('POST /api/roblox/unlink', r.data.ok === true);

  r = await j('POST', '/api/plugin/install', {});
  ok('POST /api/plugin/install', r.status === 200 && r.data.ok === true && r.data.path.includes('Roblox'));
  r = await j('GET', '/api/plugin/status');
  ok('GET /api/plugin/status (instalado)', r.data.installed === true);

  const zip = await fetch(BASE + '/api/plugin/download');
  const buf = Buffer.from(await zip.arrayBuffer());
  ok('GET /api/plugin/download (zip)', zip.status === 200 && buf[0] === 0x50 && buf[1] === 0x4b, `size=${buf.length}`);

  r = await j('POST', '/api/generate', { providerId: 'mock', apiKey: 't', prompt: 'test' });
  ok('POST /api/generate (legacy)', r.status === 200 && r.data.ok === true);

  r = await j('POST', '/api/keys', { providerId: 'openai', apiKey: 'sk-vault-test', active: true });
  ok('POST /api/keys (guarda + activa)', r.data.ok === true && r.data.activeProvider === 'openai' && r.data.hasKey === true);
  r = await j('GET', '/api/keys');
  ok('GET /api/keys (vault tiene la key)', r.data.keys.openai === 'sk-vault-test' && r.data.activeProvider === 'openai');

  r = await j('POST', '/api/chat/send', { text: 'hola vault', providerId: 'openai', baseUrl: 'http://127.0.0.1:3000/api' });
  ok('chat/send sin key → usa vault', r.status === 200 && r.data.ok === false && !String(r.data.error).includes('No hay API key'), JSON.stringify(r.data).slice(0, 120));

  r = await j('POST', '/api/plugin/sync', { context: null });
  ok('sync expone keyStatus (provider+hasKey)', r.data.keyStatus && r.data.keyStatus.provider === 'openai' && r.data.keyStatus.hasKey === true);

  r = await j('POST', '/api/models', { providerId: 'mock' });
  ok('POST /api/models (mock)', r.status === 200 && r.data.ok === true && r.data.models.includes('mock-1'));
  r = await j('POST', '/api/models', {});
  ok('POST /api/models sin providerId → 400', r.status === 400);
  r = await j('POST', '/api/models', { providerId: 'no-existe' });
  ok('POST /api/models provider inválido → 400', r.status === 400);
  r = await j('POST', '/api/models', { providerId: 'openai', baseUrl: 'http://127.0.0.1:3000/nope' });
  ok('POST /api/models (openai+vault → 404 controlado)', r.status === 502 && String(r.data.error).includes('404'), JSON.stringify(r.data).slice(0, 100));

  {
    const res = await fetch(BASE + '/api/chat/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test fallback', providerId: 'openai', baseUrl: 'http://127.0.0.1:3000/nope' }),
    });
    const raw = await res.text();
    const events = raw.split('\n\n').filter(Boolean).map(l => JSON.parse(l.replace(/^data: /, '')));
    ok('stream: fallback a no-stream con error controlado', events.some(e => e.error && String(e.error).includes('404')));
  }

  const http = require('http');
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let j = {};
      try { j = JSON.parse(body); } catch {}
      if (j.max_tokens && !j.max_completion_tokens) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens' instead." } }));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: ' + JSON.stringify({ choices: [{ delta: { reasoning_content: 'pensando en el bloque…' } }] }) + '\n\n');
        res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: 'listo' } }] }) + '\n\n');
        res.write('data: [DONE]\n\n');
        res.end();
      }
    });
  });
  await new Promise(r => fake.listen(3999, r));
  {
    const res = await fetch(BASE + '/api/chat/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test razonamiento', providerId: 'openai', baseUrl: 'http://127.0.0.1:3999' }),
    });
    const raw = await res.text();
    const events = raw.split('\n\n').filter(Boolean).map(l => JSON.parse(l.replace(/^data: /, '')));
    ok('stream: retry max_tokens → max_completion_tokens', events.some(e => e.delta === 'listo'));
    ok('stream: reasoning_content llega como thinking', events.some(e => e.thinking === 'pensando en el bloque…'));
    ok('stream: done tras razonamiento', events.some(e => e.done && e.message && e.message.text === 'listo'));
  }
  fake.close();

  r = await j('POST', '/api/keys', { providerId: 'openai', apiKey: vaultBackup });
  ok('POST /api/keys (restaura backup)', r.data.ok === true);
  r = await j('GET', '/api/keys');
  ok('  vault restaurado', vaultBackup ? r.data.keys.openai === vaultBackup : !r.data.keys.openai);

  await j('POST', '/api/chat/clear', {});

  console.log(`\n=== ${pass} pass / ${fail} fail ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
