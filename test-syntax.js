const fs = require('fs');
const path = require('path');
const luaparse = require('luaparse');

const pluginDir = path.join(__dirname, 'plugin', 'NeuroStudioAI');
let failed = false;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.lua')) {
      const src = fs.readFileSync(full, 'utf8');
      try {
        luaparse.parse(src, { luaVersion: '5.3', nonStrict: true });
        console.log(`OK    ${e.name}`);
      } catch (err) {
        failed = true;
        console.log(`ERROR ${e.name}: ${err.message}`);
      }
    }
  }
}
walk(pluginDir);
process.exit(failed ? 1 : 0);
