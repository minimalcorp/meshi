import * as os from 'os';
import * as path from 'path';

/**
 * meshi のデータディレクトリを取得
 * 優先順位:
 *   1. 環境変数 MESHI_DATA_DIR
 *   2. デフォルト: ~/.meshi
 */
export function getMeshiDataDir(): string {
  return process.env.MESHI_DATA_DIR || path.join(os.homedir(), '.meshi');
}

/** 状態ファイルディレクトリ (~/.meshi/state) */
export function getStateDir(): string {
  return path.join(getMeshiDataDir(), 'state');
}

/** SQLite データベースファイルのパス (~/.meshi/state/meshi.db) */
export function getDatabasePath(): string {
  return path.join(getStateDir(), 'meshi.db');
}
