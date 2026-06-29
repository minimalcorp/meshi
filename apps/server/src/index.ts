import httpProxy from '@fastify/http-proxy';
import Fastify from 'fastify';
import { prisma } from './lib/db.js';
import { getDatabasePath } from './lib/data-path.js';
import { foodRoutes } from './routes/foods.js';
import { recordRoutes } from './routes/records.js';
import { goalRoutes } from './routes/goals.js';
import { summaryRoutes } from './routes/summary.js';

// 日次集計は「日本時間 0 時」を境界に区切る。サーバーのプロセス TZ に依存すると
// （Docker や海外サーバーでは UTC のため）境界がずれて記録が前日に入ってしまう。
// アプリは JST 固定運用のため、TZ 未指定なら Asia/Tokyo を既定にする（明示指定は尊重）。
process.env.TZ ||= 'Asia/Tokyo';

const PORT = Number(process.env.MESHI_SERVER_PORT ?? 5250);
const HOST = process.env.MESHI_SERVER_HOST ?? '0.0.0.0';
// 内部で動く Next.js のポート。Fastify が唯一の公開エントリとなり、
// API 以外のリクエストをここへ proxy する（同一オリジン化 → CORS 不要）。
const WEB_PORT = Number(process.env.MESHI_WEB_PORT ?? 5251);
const WEB_UPSTREAM = process.env.MESHI_WEB_UPSTREAM ?? `http://127.0.0.1:${WEB_PORT}`;

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'development' ? 'info' : 'warn' },
});

app.get('/health', async () => ({
  status: 'ok',
  db: getDatabasePath(),
}));

// API ルートは proxy のキャッチオールより先に登録する（より具体的な経路が優先される）。
await app.register(foodRoutes, { prefix: '/api/foods' });
await app.register(recordRoutes, { prefix: '/api/records' });
await app.register(goalRoutes, { prefix: '/api/goals' });
await app.register(summaryRoutes, { prefix: '/api/summary' });

// 上記以外（/, /_next/*, 静的アセット, webpack HMR の websocket 等）は内部 Next.js へ
// リバースプロキシする。Fastify を単一の公開エントリにすることでブラウザは常に同一
// オリジンと通信し、CORS が原理的に不要になる（Cloudflare 等の単一オリジン運用にも対応）。
await app.register(httpProxy, {
  upstream: WEB_UPSTREAM,
  // Next dev の webpack HMR は websocket を使うため、これもパススルーする。
  websocket: true,
});

const start = async () => {
  try {
    // 接続確認
    await prisma.$queryRaw`SELECT 1`;
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`meshi server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await start();
