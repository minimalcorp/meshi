import type { NextConfig } from 'next';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(CONFIG_DIR, '..', '..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // npm パッケージ (@minimalcorp/meshi) として配布できるよう、依存を同梱した
  // self-contained な production ビルドを .next/standalone に出力する。
  output: 'standalone',
  // npm workspaces では hoist された node_modules が monorepo root にあるため、
  // standalone のファイルトレースを monorepo root にアンカーする。
  // 結果の layout は .next/standalone/apps/web/server.js にネストされる。
  outputFileTracingRoot: MONOREPO_ROOT,
};

export default nextConfig;
