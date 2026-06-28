#!/usr/bin/env node
import { ChildProcess, spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Production CLI entrypoint shipped as `bin` in @minimalcorp/meshi.
 *
 * インストール時の layout:
 *
 *   <pkg>/dist/cli.js                            ← このファイル
 *   <pkg>/dist/auto-migrate.js
 *   <pkg>/dist/server/index.js                   ← Fastify entry (apps/server/dist から bundle)
 *   <pkg>/dist/server/lib/**
 *   <pkg>/dist/server/generated/prisma/**
 *   <pkg>/.next/standalone/apps/web/server.js    ← Next.js standalone entry (apps/web から bundle)
 *   <pkg>/.next/standalone/apps/web/.next/static/
 *   <pkg>/.next/standalone/node_modules/
 *   <pkg>/prisma/schema.prisma
 *   <pkg>/prisma/migrations/**
 *   <pkg>/prisma.config.ts
 *
 * web は build 時に NEXT_PUBLIC_MESHI_API_URL=http://localhost:6251 を焼き込んでいるため、
 * server は必ず 6251 で待ち受ける。web の port は PORT env で変更可能。
 */

// ---------------------------------------------------------------------------
// 固定ポート (web の API URL がビルド時に焼き込まれているため server は固定)
// ---------------------------------------------------------------------------
const SERVER_PORT = 6251;
const WEB_PORT = process.env.PORT ?? '6250';

// ---------------------------------------------------------------------------
// Braille-dots spinner
// ---------------------------------------------------------------------------
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function createSpinner(message: string): { stop: () => void } {
  let i = 0;
  process.stdout.write(`\r${SPINNER_FRAMES[0]} ${message}`);
  i++;
  const timer = setInterval(() => {
    process.stdout.write(`\r${SPINNER_FRAMES[i % SPINNER_FRAMES.length]} ${message}`);
    i++;
  }, 80);

  return {
    stop() {
      clearInterval(timer);
      process.stdout.write('\r' + ' '.repeat(message.length + 4) + '\r');
    },
  };
}

if (process.platform !== 'darwin' && process.platform !== 'linux') {
  console.error(`[meshi] Unsupported platform: ${process.platform}`);
  console.error('[meshi] meshi currently supports macOS and Linux only.');
  process.exit(1);
}

const spinner = createSpinner('Initializing...');

const DIST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(DIST_DIR, '..');
const AUTO_MIGRATE_JS = path.join(DIST_DIR, 'auto-migrate.js');
const FASTIFY_ENTRY_JS = path.join(DIST_DIR, 'server', 'index.js');
const NEXT_STANDALONE_ENTRY = path.join(
  PACKAGE_ROOT,
  '.next',
  'standalone',
  'apps',
  'web',
  'server.js',
);

const isDebug = !!process.env.MESHI_DEBUG;
const isDocker = fs.existsSync('/.dockerenv');

const MESHI_AA = `
                     _     _
  _ __ ___   ___ ___| |__ (_)
 | '_ \` _ \\ / _ \\ __| '_ \\| |
 | | | | | |  __\\__ \\ | | | |
 |_| |_| |_|\\___|___/_| |_|_|
`;

// ---------------------------------------------------------------------------
// Phase 1: Auto-migrate (synchronous child process)
// ---------------------------------------------------------------------------
function runAutoMigrate(): void {
  if (!fs.existsSync(AUTO_MIGRATE_JS)) {
    console.error(`[meshi] Missing build artifact: ${AUTO_MIGRATE_JS}`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [AUTO_MIGRATE_JS], {
    stdio: isDebug ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    cwd: PACKAGE_ROOT,
  });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim();
    if (stderr) console.error(stderr);
    console.error('[meshi] Database migration failed.');
    process.exit(result.status ?? 1);
  }
  const stdout = result.stdout?.toString().trim();
  if (stdout) console.log(stdout);
}

runAutoMigrate();

// ---------------------------------------------------------------------------
// Phase 2: Verify build artifacts & spawn servers
// ---------------------------------------------------------------------------
function verifyArtifact(p: string, label: string): void {
  if (!fs.existsSync(p)) {
    console.error(`[meshi] Missing ${label}: ${p}`);
    console.error('[meshi] The package appears to be incomplete. Please reinstall.');
    process.exit(1);
  }
}

verifyArtifact(FASTIFY_ENTRY_JS, 'Fastify server artifact');
verifyArtifact(NEXT_STANDALONE_ENTRY, 'Next.js standalone artifact');

const fastifyChild: ChildProcess = spawn(process.execPath, [FASTIFY_ENTRY_JS], {
  stdio: ['inherit', 'pipe', 'pipe'],
  cwd: PACKAGE_ROOT,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    MESHI_SERVER_PORT: String(SERVER_PORT),
    MESHI_SERVER_HOST: '0.0.0.0',
  },
});

const nextChild: ChildProcess = spawn(process.execPath, [NEXT_STANDALONE_ENTRY], {
  stdio: ['inherit', 'pipe', 'pipe'],
  cwd: path.dirname(NEXT_STANDALONE_ENTRY),
  env: { ...process.env, PORT: WEB_PORT, NODE_ENV: 'production', HOSTNAME: '0.0.0.0' },
});

// ---------------------------------------------------------------------------
// Child process output forwarding (debug 時のみ stdout を出す)
// ---------------------------------------------------------------------------
fastifyChild.stdout?.on('data', (data: Buffer) => {
  if (isDebug) process.stdout.write(data);
});
fastifyChild.stderr?.on('data', (data: Buffer) => {
  process.stderr.write(data);
});
nextChild.stdout?.on('data', (data: Buffer) => {
  if (isDebug) process.stdout.write(data);
});
nextChild.stderr?.on('data', (data: Buffer) => {
  process.stderr.write(data);
});

// ---------------------------------------------------------------------------
// Ready detection
//   - server: /health が 200 を返すまで poll
//   - web:    / が応答 (status < 500) するまで poll
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 300;

function pollHttp(
  port: number,
  urlPath: string,
  isReady: (status: number) => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const poll = () => {
      const req = http.get(`http://localhost:${port}${urlPath}`, (res) => {
        const status = res.statusCode ?? 0;
        res.resume();
        if (isReady(status)) {
          resolve();
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      });
      req.on('error', () => {
        setTimeout(poll, POLL_INTERVAL_MS);
      });
    };
    poll();
  });
}

Promise.all([
  pollHttp(SERVER_PORT, '/health', (s) => s === 200),
  pollHttp(Number(WEB_PORT), '/', (s) => s > 0 && s < 500),
]).then(() => {
  spinner.stop();
  console.log(MESHI_AA);

  const url = `http://localhost:${WEB_PORT}`;

  // docker / headless / テスト時はブラウザを自動で開かない
  if (!isDocker && !process.env.MESHI_NO_OPEN) {
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
  }

  console.log(`Open ${url}`);
});

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------
let shuttingDown = false;

function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;

  spinner.stop();

  for (const child of [fastifyChild, nextChild]) {
    if (child && !child.killed && child.exitCode === null) {
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

fastifyChild.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[meshi] Fastify server exited unexpectedly (code ${code})`);
    shutdown(code ?? 1);
  }
});
nextChild.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[meshi] Next.js server exited unexpectedly (code ${code})`);
    shutdown(code ?? 1);
  }
});
