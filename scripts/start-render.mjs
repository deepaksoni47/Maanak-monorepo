import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const internalApiPort = process.env.INTERNAL_API_PORT || '4001';
const webPort = process.env.PORT || '4000';

// ---------------------------------------------------------------------------
// 1. Pre-flight: verify the API build artifact exists
// ---------------------------------------------------------------------------
const apiEntryPath = path.join(rootDir, 'apps/api/dist/server.js');
if (!fs.existsSync(apiEntryPath)) {
  console.error(
    `[MAANAK] FATAL: API build artifact not found at ${apiEntryPath}\n` +
    `         Make sure the Render build command includes:\n` +
    `           pnpm --filter @maanak/api run build`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Spawn the Express API backend
// ---------------------------------------------------------------------------
console.log(`[MAANAK] Booting Backend API on internal port ${internalApiPort}...`);
const apiProcess = spawn(
  process.execPath,
  [apiEntryPath],
  {
    cwd: path.join(rootDir, 'apps/api'),
    env: {
      ...process.env,
      PORT: internalApiPort,
      API_HOST: '127.0.0.1',
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    stdio: 'inherit',
  }
);

apiProcess.on('error', (err) => {
  console.error('[MAANAK] Backend API process error:', err);
  process.exit(1);
});

apiProcess.on('exit', (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`[MAANAK] Backend API exited with code ${code}`);
    process.exit(code);
  }
  if (signal) {
    console.error(`[MAANAK] Backend API killed by signal ${signal}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Wait until the API port is accepting TCP connections
// ---------------------------------------------------------------------------
function probePort(port, host, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(
          new Error(`Timed out waiting for API on ${host}:${port} after ${timeoutMs / 1000}s`)
        );
      }
      const socket = connect({ port: Number(port), host }, () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });
}

// ---------------------------------------------------------------------------
// 4. Once API is ready, start Next.js
// ---------------------------------------------------------------------------
(async () => {
  try {
    await probePort(internalApiPort, '127.0.0.1', 30000);
    console.log(`[MAANAK] ✓ Backend API is ready on port ${internalApiPort}`);
  } catch (err) {
    console.error(`[MAANAK] ${err.message}`);
    console.error('[MAANAK] FATAL: Backend API did not start in time. Aborting.');
    try { apiProcess.kill('SIGTERM'); } catch {}
    process.exit(1);
  }

  // Resolve Next.js binary via apps/web require context for pnpm monorepo compat
  const webRequire = createRequire(path.join(rootDir, 'apps/web/package.json'));
  let nextCliPath;
  try {
    nextCliPath = webRequire.resolve('next/dist/bin/next');
  } catch {
    nextCliPath = 'next';
  }

  console.log(`[MAANAK] Booting Next.js Frontend on public port ${webPort} using ${nextCliPath}...`);
  const webProcess = spawn(
    process.execPath,
    [nextCliPath, 'start', path.join(rootDir, 'apps/web'), '-p', String(webPort)],
    {
      cwd: path.join(rootDir, 'apps/web'),
      env: {
        ...process.env,
        PORT: String(webPort),
        INTERNAL_API_URL: `http://127.0.0.1:${internalApiPort}`,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      stdio: 'inherit',
    }
  );

  webProcess.on('error', (err) => {
    console.error('[MAANAK] Next.js process error:', err);
  });

  webProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[MAANAK] Next.js exited with code ${code}`);
    }
    try { apiProcess.kill('SIGTERM'); } catch {}
    process.exit(code || 0);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[MAANAK] Gracefully terminating processes...');
    try { apiProcess.kill('SIGTERM'); } catch {}
    try { webProcess.kill('SIGTERM'); } catch {}
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
