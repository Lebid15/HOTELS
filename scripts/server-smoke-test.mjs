import { spawn } from 'node:child_process';

const PORT = Number(process.env.SMOKE_PORT || 4873);
const base = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, ['apps/server/server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', chunk => { output += chunk.toString(); });
server.stderr.on('data', chunk => { output += chunk.toString(); });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(path, attempts = 30) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${base}${path}`);
      if (response.ok) return response;
      lastError = new Error(`${path}: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }
  throw lastError;
}

async function request(path) {
  const response = await fetchWithRetry(path);
  return response.text();
}

async function run() {
  try {
    const healthResponse = await fetchWithRetry('/health');
    const health = await healthResponse.json();
    if (!health.ok) throw new Error('Health check failed');

    const html = await request('/');
    const requiredScripts = [
      'assets/js/modules/00-bootstrap-icons-design.js',
      'assets/js/modules/02-state-print-avatar-utils.js',
      'assets/js/modules/11d-backup-dashboard-workspace-events-init.js',
      'assets/js/professional/app-entry.mjs',
      'assets/js/app.js'
    ];

    for (const script of requiredScripts) {
      if (!html.includes(script)) throw new Error(`Required script missing from HTML: ${script}`);
      const assetPath = '/' + script;
      const assetResponse = await fetchWithRetry(assetPath);
      const assetText = await assetResponse.text();
      if (!assetText.trim()) throw new Error(`Loaded asset is empty: ${script}`);
    }

    const ar = await fetchWithRetry('/locales/ar.json').then(res => res.json());
    const en = await fetchWithRetry('/locales/en.json').then(res => res.json());

    if (ar.app.name !== 'فندقي') throw new Error('Arabic locale failed');
    if (en.app.name !== 'Fandqi') throw new Error('English locale failed');

    console.log('Server smoke test passed ✅');
  } finally {
    server.kill('SIGTERM');
  }
}

run().catch(error => {
  server.kill('SIGTERM');
  console.error(error.message);
  if (output) console.error(output);
  process.exit(1);
});
