import * as fs from 'fs';
import { getStateDir } from '../src/lib/data-path.ts';

// migration 実行前に ~/.meshi/state を作成しておく
const stateDir = getStateDir();
fs.mkdirSync(stateDir, { recursive: true });
console.log(`[meshi] data dir ready: ${stateDir}`);
