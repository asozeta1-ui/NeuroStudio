const PROVIDERS = [
  { id: 'mock',        name: 'Mock (test, sin API)', format: 'mock', baseUrl: '', defaultModel: 'mock-1', docs: '' },

  { id: 'openrouter',   name: 'OpenRouter',        format: 'openai',     baseUrl: 'https://openrouter.ai/api/v1',                defaultModel: 'openrouter/auto',      docs: 'https://openrouter.ai/keys' },
  { id: 'openai',      name: 'OpenAI',            format: 'openai',     baseUrl: 'https://api.openai.com/v1',                   defaultModel: 'gpt-4o-mini',          docs: 'https://platform.openai.com/api-keys' },
  { id: 'google',      name: 'Google AI Studio', format: 'google',     baseUrl: 'https://generativelanguage.googleapis.com',  defaultModel: 'gemini-2.0-flash',     docs: 'https://aistudio.google.com/apikey' },
  { id: 'nvidia',      name: 'NVIDIA NIM',        format: 'openai',     baseUrl: 'https://integrate.api.nvidia.com/v1',        defaultModel: 'meta/llama-3.1-70b-instruct', docs: 'https://build.nvidia.com' },
  { id: 'groq',        name: 'Groq',              format: 'openai',     baseUrl: 'https://api.groq.com/openai/v1',             defaultModel: 'llama-3.3-70b-versatile', docs: 'https://console.groq.com/keys' },

  { id: 'anthropic',   name: 'Anthropic (Claude)', format: 'anthropic', baseUrl: 'https://api.anthropic.com',                  defaultModel: 'claude-sonnet-4-5',    docs: 'https://console.anthropic.com/settings/keys' },
  { id: 'deepseek',    name: 'DeepSeek',          format: 'openai',     baseUrl: 'https://api.deepseek.com/v1',                defaultModel: 'deepseek-chat',        docs: 'https://platform.deepseek.com' },
  { id: 'mistral',     name: 'Mistral AI',        format: 'openai',     baseUrl: 'https://api.mistral.ai/v1',                  defaultModel: 'mistral-large-latest', docs: 'https://console.mistral.ai/api-keys' },
  { id: 'perplexity',  name: 'Perplexity',        format: 'openai',     baseUrl: 'https://api.perplexity.ai',                  defaultModel: 'sonar',                docs: 'https://perplexity.ai/settings/api' },
  { id: 'xai',         name: 'xAI (Grok)',        format: 'openai',     baseUrl: 'https://api.x.ai/v1',                        defaultModel: 'grok-3',               docs: 'https://console.x.ai' },
  { id: 'together',    name: 'Together AI',       format: 'openai',     baseUrl: 'https://api.together.xyz/v1',                defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', docs: 'https://api.together.ai' },
  { id: 'fireworks',   name: 'Fireworks AI',      format: 'openai',     baseUrl: 'https://api.fireworks.ai/inference/v1',     defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct', docs: 'https://fireworks.ai' },
  { id: 'cohere',      name: 'Cohere',            format: 'cohere',     baseUrl: 'https://api.cohere.com',                     defaultModel: 'command-r-plus',       docs: 'https://dashboard.cohere.com/api-keys' },
  { id: 'azure',       name: 'Azure OpenAI',      format: 'openai-azure', baseUrl: '',                                         defaultModel: 'gpt-4o',               docs: 'https://portal.azure.com' },
  { id: 'huggingface', name: 'Hugging Face Router', format: 'openai',   baseUrl: 'https://router.huggingface.co/v1',           defaultModel: 'meta-llama/Llama-3.3-70B-Instruct', docs: 'https://huggingface.co/settings/tokens' },
  { id: 'cerebras',    name: 'Cerebras Inference', format: 'openai',    baseUrl: 'https://api.cerebras.ai/v1',                 defaultModel: 'llama3.1-8b',           docs: 'https://cloud.cerebras.ai' },
  { id: 'sambanova',   name: 'SambaNova Cloud',   format: 'openai',     baseUrl: 'https://api.sambanova.ai/v1',                defaultModel: 'Meta-Llama-3.1-70B-Instruct', docs: 'https://cloud.sambanova.ai' },
  { id: 'anyscale',    name: 'Anyscale Endpoints', format: 'openai',    baseUrl: 'https://api.endpoints.anyscale.com/v1',     defaultModel: 'meta-llama/Llama-3.1-70B-Instruct', docs: 'https://console.anyscale.com' },

  { id: 'hyperbolic',  name: 'Hyperbolic',        format: 'openai',     baseUrl: 'https://api.hyperbolic.xyz/v1',              defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://app.hyperbolic.xyz' },
  { id: 'novita',      name: 'Novita AI',        format: 'openai',     baseUrl: 'https://api.novita.ai/v3/openai',             defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://novita.ai' },
  { id: 'nebius',      name: 'Nebius AI Studio',  format: 'openai',     baseUrl: 'https://api.studio.nebius.ai/v1',            defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-fast', docs: 'https://studio.nebius.ai' },
  { id: 'infermatic',  name: 'Infermatic',        format: 'openai',     baseUrl: 'https://api.infermatic.ai/v1',               defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://infermatic.ai' },
  { id: 'chutes',      name: 'Chutes',            format: 'openai',     baseUrl: 'https://api.chutes.ai/v1',                   defaultModel: 'chutes/llama-3.3-70b',  docs: 'https://chutes.ai' },
  { id: 'featherless', name: 'Featherless AI',   format: 'openai',     baseUrl: 'https://api.featherless.ai/v1',              defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct', docs: 'https://featherless.ai' },
  { id: 'kluster',     name: 'kluster.ai',        format: 'openai',     baseUrl: 'https://api.kluster.ai/v1',                  defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://kluster.ai' },
  { id: 'arliai',      name: 'ArliAI',            format: 'openai',     baseUrl: 'https://api.arliai.com/api/v1',              defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://arliai.com' },
  { id: 'naga',        name: 'NagaAI',            format: 'openai',     baseUrl: 'https://api.naga.ac/v1',                     defaultModel: 'llama-3.3-70b-instruct', docs: 'https://naga.ac' },
  { id: 'targon',      name: 'Targon',            format: 'openai',     baseUrl: 'https://api.targon.com/v1',                  defaultModel: 'targon/llama-3.3-70b',  docs: 'https://targon.com' },
  { id: 'synthetic',   name: 'Synthetic.new',     format: 'openai',     baseUrl: 'https://api.synthetic.new/v1',               defaultModel: 'llama-3.3-70b-instruct', docs: 'https://synthetic.new' },
  { id: 'gravia',      name: 'Gravia',            format: 'openai',     baseUrl: 'https://api.gravia.io/v1',                   defaultModel: 'llama-3.3-70b-instruct', docs: 'https://gravia.io' },
  { id: 'swarms',      name: 'Swarms Cloud',      format: 'openai',     baseUrl: 'https://api.swarms.ai/v1',                   defaultModel: 'gpt-4o-mini',           docs: 'https://swarms.ai' },

  { id: 'moonshot',    name: 'Moonshot (Kimi)',   format: 'openai',     baseUrl: 'https://api.moonshot.cn/v1',                 defaultModel: 'moonshot-v1-32k',      docs: 'https://platform.moonshot.cn' },
  { id: 'zhipu',       name: 'Zhipu AI (GLM)',    format: 'openai',     baseUrl: 'https://open.bigmodel.cn/api/paas/v4',      defaultModel: 'glm-4-plus',           docs: 'https://open.bigmodel.cn' },
  { id: 'minimax',     name: 'MiniMax',           format: 'openai',     baseUrl: 'https://api.minimax.chat/v1',               defaultModel: 'abab6.5s-chat',        docs: 'https://minimax.chat' },
  { id: 'dashscope',   name: 'Alibaba DashScope (Qwen)', format: 'openai', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', docs: 'https://dashscope.console.aliyun.com' },
  { id: 'yinaitech',   name: '01.AI (Yi)',        format: 'openai',     baseUrl: 'https://api.lingyiwanwu.com/v1',             defaultModel: 'yi-large',             docs: 'https://platform.lingyiwanwu.com' },
  { id: 'stepfun',     name: 'StepFun',           format: 'openai',     baseUrl: 'https://api.stepfun.com/v1',                 defaultModel: 'step-2-16k',           docs: 'https://platform.stepfun.com' },
  { id: 'siliconflow', name: 'SiliconFlow',       format: 'openai',     baseUrl: 'https://api.siliconflow.cn/v1',             defaultModel: 'deepseek-ai/DeepSeek-V3', docs: 'https://cloud.siliconflow.cn' },
  { id: 'baichuan',    name: 'Baichuan AI',       format: 'openai',     baseUrl: 'https://api.baichuan-ai.com/v1',             defaultModel: 'Baichuan4',            docs: 'https://platform.baichuan-ai.com' },
  { id: 'hunyuan',     name: 'Tencent Hunyuan',   format: 'openai',     baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',   defaultModel: 'hunyuan-turbos-latest', docs: 'https://cloud.tencent.com' },
  { id: 'ark',         name: 'Volcengine Ark',    format: 'openai',     baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',   defaultModel: 'doubao-pro-32k',       docs: 'https://console.volcengine.com/ark' },

  { id: 'bedrock',     name: 'AWS Bedrock',       format: 'bedrock',    baseUrl: '',                                           defaultModel: 'anthropic.claude-3-5-sonnet', docs: 'https://aws.amazon.com/bedrock' },
  { id: 'databricks',  name: 'Databricks Model Serving', format: 'openai', baseUrl: '',                                        defaultModel: 'databricks-meta-llama-3-1-70b-instruct', docs: 'https://databricks.com' },
  { id: 'cloudflare',  name: 'Cloudflare Workers AI', format: 'cloudflare', baseUrl: 'https://api.cloudflare.com/client/v4', defaultModel: '@cf/meta/llama-3.3-70b-instruct', docs: 'https://dash.cloudflare.com' },
  { id: 'replicate',   name: 'Replicate',         format: 'replicate',  baseUrl: 'https://api.replicate.com/v1',             defaultModel: 'meta/meta-llama-3.3-70b-instruct', docs: 'https://replicate.com' },
  { id: 'baseten',     name: 'Baseten',           format: 'openai',     baseUrl: 'https://model-api.baseten.co/v1',            defaultModel: 'deepseek-ai/deepseek-v3', docs: 'https://baseten.co' },
  { id: 'modal',       name: 'Modal Labs',        format: 'openai',     baseUrl: 'https://modal-labs--example-openai-ui-chat.modal.run/v1', defaultModel: 'gpt-4o-mini', docs: 'https://modal.com' },
  { id: 'runpod',      name: 'RunPod',            format: 'openai',     baseUrl: 'https://api.runpod.ai/v1',                  defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://runpod.ai' },
  { id: 'lamini',      name: 'Lamini',            format: 'openai',     baseUrl: 'https://api.lamini.ai/v1',                   defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct', docs: 'https://lamini.ai' },
  { id: 'predibase',   name: 'Predibase',          format: 'openai',     baseUrl: 'https://serving.app.predibase.com/v1',       defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct', docs: 'https://predibase.com' },
  { id: 'lepton',      name: 'Lepton AI',         format: 'openai',     baseUrl: 'https://api.lepton.run/v1',                  defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://lepton.ai' },
  { id: 'tinfoil',     name: 'Tinfoil',           format: 'openai',     baseUrl: 'https://api.tinfoil.sh/v1',                  defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://tinfoil.sh' },
  { id: 'parasail',    name: 'Parasail',          format: 'openai',     baseUrl: 'https://api.parasail.io/v1',                 defaultModel: 'meta-llama/llama-3.3-70b-instruct', docs: 'https://parasail.io' },

  { id: 'litellm',     name: 'LiteLLM Proxy',     format: 'openai',     baseUrl: 'http://localhost:4000/v1',                   defaultModel: 'gpt-4o-mini',          docs: 'https://litellm.ai' },
  { id: 'helicone',    name: 'Helicone AI Gateway', format: 'openai',   baseUrl: 'https://oai.helicone.ai/v1',                defaultModel: 'gpt-4o-mini',          docs: 'https://helicone.ai' },
  { id: 'portkey',     name: 'Portkey AI Gateway', format: 'openai',    baseUrl: 'https://api.portkey.ai/v1',                  defaultModel: 'gpt-4o-mini',          docs: 'https://portkey.ai' },
  { id: 'requesty',    name: 'Requesty Router',   format: 'openai',     baseUrl: 'https://router.requesty.ai/v1',              defaultModel: 'auto',                 docs: 'https://requesty.ai' },
  { id: 'kilo',       name: 'Kilo Code API',     format: 'openai',     baseUrl: 'https://kilocode.ai/api/v1',                 defaultModel: 'claude-sonnet-4-5',     docs: 'https://kilocode.ai' },
  { id: 'llm7',        name: 'LLM7',              format: 'openai',     baseUrl: 'https://api.llm7.io/v1',                     defaultModel: 'gpt-4o-mini',          docs: 'https://llm7.io' },
  { id: 'any-llm',    name: 'Any LLM (openai-compatible)', format: 'openai', baseUrl: '',                                  defaultModel: 'custom',               docs: '' },
];

const getProvider = (id) => PROVIDERS.find(p => p.id === id);

async function callProvider(provider, apiKey, model, messages, opts = {}) {
  const modelId = model || provider.defaultModel;
  const base = opts.baseUrl || provider.baseUrl;

  switch (provider.format) {
    case 'mock': {
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const p = lastUser ? lastUser.content.toLowerCase() : '';
      if (p.includes('inspecciona') || p.includes('inspect')) {
        return `Voy a inspeccionar tu Workspace ahora mismo.\n\n[[NSAI_ACTION]]\n{"action":"inspect","path":"Workspace"}\n[[/NSAI_ACTION]]`;
      }
      if (p.includes('buggy')) {
        const raw = `{"action":"create_instance","className":"Part","name":"Buggy\nCube","parent":"Workspace","properties":{"Size":[2,2,2],"Color":[255,0,0],}}`;
        return `Creo la parte aunque el formato salga raro.\n\n[[NSAI ACTION]]\n${raw}\n[[/NSAI ACTION]]\n\n- Parte 2×2×2 roja`;
      }
      if (p.includes('bloque') || p.includes('block') || p.includes('cubo') || p.includes('cube')) {
        return `Creo la parte directamente en el Workspace — la ves al instante en Studio.\n\n[[NSAI_ACTION]]\n{"action":"create_instance","className":"Part","name":"NeuroCube","parent":"Workspace","properties":{"Size":[4,4,4],"Position":[0,10,0],"Color":[139,92,246],"Material":"Neon","Anchored":true}}\n[[/NSAI_ACTION]]\n\n- Parte anclada de 4×4×4 studs\n- Color violeta, material Neon`;
      }
      const src = 'local part = Instance.new("Part")\npart.Name = "MockCube"\npart.Size = Vector3.new(4, 4, 4)\npart.Anchored = true\npart.Parent = workspace\nprint("Mock build OK")';
      return `Construyo un cubo de prueba con este script:\n\n[[NSAI_ACTION]]\n{"action":"insert_script","name":"MockBuild","parent":"ServerScriptService","scriptType":"Script","source":"${src.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n[[/NSAI_ACTION]]\n\n- Crea una parte anclada de 4x4x4\n- Listo para probar el loop agéntico`;
    }

    case 'openai': {
      const attempts = [
        { model: modelId, messages, max_tokens: 16384 },
        { model: modelId, messages, max_completion_tokens: 16384 },
        { model: modelId, messages, max_tokens: 4096 },
      ];
      let res, lastErr;
      for (const body of attempts) {
        res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...providerHeaders(provider),
          },
          body: JSON.stringify(body),
        });
        if (res.ok) break;
        lastErr = `${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`;
        if (res.status !== 400 || !/max_tokens|max_completion_tokens|exceed|maximum/i.test(lastErr)) throw new Error(lastErr);
      }
      if (!res.ok) throw new Error(lastErr);
      const data = await res.json();
      const msg = data.choices[0].message || {};
      let out = msg.content || '';
      if (!out) out = msg.reasoning_content || msg.reasoning || '';
      if (!out) throw new Error(`${provider.name} devolvió una respuesta vacía (límite de tokens consumido por razonamiento). Reintenta o elige otro modelo.`);
      return out;
    }

    case 'anthropic': {
      const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
      const rest = messages.filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      const res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: modelId, system, messages: rest, max_tokens: 8192 }),
      });
      if (!res.ok) throw new Error(`${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return data.content.map(b => b.text).join('');
    }

    case 'google': {
      const res = await fetch(`${base}/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }] },
          contents: messages.filter(m => m.role !== 'system')
            .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: 8192 },
        }),
      });
      if (!res.ok) throw new Error(`${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return data.candidates[0].content.parts.map(p => p.text).join('');
    }

    case 'cohere': {
      const res = await fetch(`${base}/v2/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelId, messages }),
      });
      if (!res.ok) throw new Error(`${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return data.message.content[0].text;
    }

    case 'openai-azure': {
      const url = base.endsWith('/') ? base : base + '/';
      const res = await fetch(url + 'chat/completions?api-version=2024-08-01-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify({ messages, max_tokens: 8192 }),
      });
      if (!res.ok) throw new Error(`${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return data.choices[0].message.content;
    }

    case 'cloudflare': {
      const account = opts.accountId || process.env.CF_ACCOUNT_ID || '';
      const res = await fetch(`${base}/accounts/${account}/ai/run/${modelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error(`${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return data.result.response;
    }

    case 'replicate': {
      const res = await fetch(`${base}/models/${modelId}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Prefer': 'wait',
        },
        body: JSON.stringify({ input: { messages, max_tokens: 8192 } }),
      });
      if (!res.ok) throw new Error(`${provider.name}: ${res.status} ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      return (data.output || []).join('');
    }

    case 'bedrock': {
      throw new Error('AWS Bedrock requires SigV4 signed requests. Use a LiteLLM proxy as gateway instead: https://litellm.ai');
    }

    default:
      throw new Error(`Unknown format for provider ${provider.name}`);
  }
}

function providerHeaders(provider) {
  const h = {};
  if (provider.id === 'openrouter') {
    h['HTTP-Referer'] = 'http://localhost:3000';
    h['X-Title'] = 'NeuroStudio AI';
  }
  return h;
}

module.exports = { PROVIDERS, getProvider, callProvider, providerHeaders };
