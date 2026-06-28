import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const execAsync = promisify(exec);

/**
 * meshi のデータディレクトリ。apps/server/src/lib/data-path.ts と同じロジック。
 *   1. 環境変数 MESHI_DATA_DIR
 *   2. デフォルト ~/.meshi
 */
function getMeshiDataDir(): string {
  return process.env.MESHI_DATA_DIR || path.join(os.homedir(), '.meshi');
}

function getStateDir(): string {
  return path.join(getMeshiDataDir(), 'state');
}

async function autoMigrate() {
  try {
    // migration / DB ファイル作成前に ~/.meshi/state を用意しておく
    await fs.mkdir(getStateDir(), { recursive: true });

    const { stdout } = await execAsync('npx prisma migrate deploy');
    // prisma の出力から "N migration(s) applied." 行を抽出
    const match = stdout.match(/(\d+)\s+migrations?\s+applied/i);
    if (match) {
      const count = parseInt(match[1], 10);
      console.log(`${count} migration${count === 1 ? '' : 's'} applied.`);
    }
  } catch (error) {
    console.error('DB migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

autoMigrate();
