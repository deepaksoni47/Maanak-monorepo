import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const internalApiPort = process.env.INTERNAL_API_PORT || '4001';
const webPort = process.env.PORT || '4000';

console.log(`[MAANAK] Booting Backend API on internal port ${internalApiPort}...`);
const apiProcess = spawn(
  process.execPath,
  [path.join(rootDir, 'apps/api/dist/server.js')],
  {
    cwd: path.join(rootDir, 'apps/api'),
    env: {
      ...process.env,
      PORT: internalApiPort,
      API_HOST: '127.0.0.1',
    },
    stdio: 'inherit',
  }
);

apiProcess.on('error', (err) => {
  console.error('[MAANAK] Backend API process error:', err);
});

console.log(`[MAANAK] Booting Next.js Frontend on public port ${webPort}...`);
const nextCliPath = path.join(rootDir, 'node_modules/next/dist/bin/next');
const webProcess = spawn(
  process.execPath,
  [nextCliPath, 'start', path.join(rootDir, 'apps/web'), '-p', webPort],
  {
    cwd: path.join(rootDir, 'apps/web'),
    env: {
      ...process.env,
      PORT: webPort,
      INTERNAL_API_URL: `http://127.0.0.1:${internalApiPort}`,
    },
    stdio: 'inherit',
  }
);

webProcess.on('error', (err) => {
  console.error('[MAANAK] Next.js process error:', err);
});

const shutdown = () => {
  console.log('[MAANAK] Gracefully terminating processes...');
  try {
    apiProcess.kill('SIGTERM');
  } catch {}
  try {
    webProcess.kill('SIGTERM');
  } catch {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
