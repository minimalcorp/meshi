#!/usr/bin/env node
/**
 * prepack / bundle script for @minimalcorp/meshi (apps/cli).
 *
 * 兄弟 workspace (apps/server, apps/web) のビルド成果物を apps/cli/ にコピーし、
 * `npm pack` が self-contained な tarball を生成できるようにする。
 * (npm install -g @minimalcorp/meshi で利用可能になる)
 *
 * 事前に必要なステップ:
 *   1. npm run build -w @meshi/server
 *   2. NEXT_PUBLIC_MESHI_API_URL= npm run build -w @meshi/web  (API は同一オリジン=相対パス)
 *   3. npm run build -w @minimalcorp/meshi  (dist/cli.js 等をコンパイル)
 *
 * このスクリプトは最終ステップ (prepack 経由) として実行され、ファイルコピーのみ行う。
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI_DIR = path.resolve(SCRIPTS_DIR, '..');
const REPO_ROOT = path.resolve(CLI_DIR, '..', '..');

const SERVER_DIR = path.join(REPO_ROOT, 'apps/server');
const WEB_DIR = path.join(REPO_ROOT, 'apps/web');

function log(msg) {
  console.log(`[bundle] ${msg}`);
}

async function ensurePrereqs() {
  const requirements = [
    [
      path.join(CLI_DIR, 'dist/cli.js'),
      'apps/cli must be built (run `npm run build -w @minimalcorp/meshi`)',
    ],
    [
      path.join(SERVER_DIR, 'dist/index.js'),
      'apps/server must be built (run `npm run build -w @meshi/server`)',
    ],
    [
      path.join(SERVER_DIR, 'dist/generated/prisma/client.js'),
      'apps/server prisma client must be generated and built',
    ],
    [
      path.join(WEB_DIR, '.next/standalone/apps/web/server.js'),
      'apps/web standalone build must exist (run `npm run build -w @meshi/web`)',
    ],
    [path.join(WEB_DIR, '.next/static'), 'apps/web .next/static must exist'],
    [path.join(SERVER_DIR, 'prisma/schema.prisma'), 'apps/server/prisma/schema.prisma must exist'],
    [path.join(SERVER_DIR, 'prisma.config.ts'), 'apps/server/prisma.config.ts must exist'],
  ];
  for (const [p, msg] of requirements) {
    if (!existsSync(p)) {
      throw new Error(`[bundle] missing: ${p}\n  ${msg}`);
    }
  }
}

async function copyDir(src, dest) {
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

async function copyFile(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function cleanCliBundleDirs() {
  const dirs = [
    path.join(CLI_DIR, 'dist/server'),
    path.join(CLI_DIR, '.next'),
    path.join(CLI_DIR, 'prisma'),
  ];
  const files = [path.join(CLI_DIR, 'prisma.config.ts'), path.join(CLI_DIR, 'LICENSE')];
  for (const d of dirs) await fs.rm(d, { recursive: true, force: true });
  for (const f of files) await fs.rm(f, { force: true });
}

async function main() {
  log('checking prerequisites');
  await ensurePrereqs();

  log('cleaning previous bundle outputs');
  await cleanCliBundleDirs();

  log('copying apps/server/dist → apps/cli/dist/server');
  await copyDir(path.join(SERVER_DIR, 'dist'), path.join(CLI_DIR, 'dist/server'));

  log('copying apps/server/prisma → apps/cli/prisma');
  await copyDir(path.join(SERVER_DIR, 'prisma'), path.join(CLI_DIR, 'prisma'));

  log('copying apps/server/prisma.config.ts → apps/cli/prisma.config.ts');
  await copyFile(path.join(SERVER_DIR, 'prisma.config.ts'), path.join(CLI_DIR, 'prisma.config.ts'));

  log('copying apps/web/.next/standalone → apps/cli/.next/standalone');
  await copyDir(path.join(WEB_DIR, '.next/standalone'), path.join(CLI_DIR, '.next/standalone'));

  log('copying apps/web/.next/static → apps/cli/.next/standalone/apps/web/.next/static');
  await copyDir(
    path.join(WEB_DIR, '.next/static'),
    path.join(CLI_DIR, '.next/standalone/apps/web/.next/static'),
  );

  log('copying LICENSE → apps/cli/LICENSE');
  await copyFile(path.join(REPO_ROOT, 'LICENSE'), path.join(CLI_DIR, 'LICENSE'));

  log('done');
}

main().catch((err) => {
  console.error('[bundle] failed:', err);
  process.exit(1);
});
