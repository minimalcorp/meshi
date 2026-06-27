import * as os from 'os';
import * as path from 'path';
import { defineConfig } from 'prisma/config';

// NOTE: prisma CLI から読まれる設定。src/lib/data-path.ts と同じロジックを
// インラインで持つ（CLI 実行時に src の TS import に依存しないため）。
// 本体ロジック変更時は src/lib/data-path.ts と同期すること。
function getMeshiDataDir(): string {
  return process.env.MESHI_DATA_DIR || path.join(os.homedir(), '.meshi');
}

function getDatabasePath(): string {
  return path.join(getMeshiDataDir(), 'state', 'meshi.db');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: `file:${getDatabasePath()}`,
  },
});
