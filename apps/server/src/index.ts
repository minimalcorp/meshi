import cors from '@fastify/cors';
import Fastify from 'fastify';
import { prisma } from './lib/db.js';
import { getDatabasePath } from './lib/data-path.js';
import { foodRoutes } from './routes/foods.js';
import { recordRoutes } from './routes/records.js';
import { goalRoutes } from './routes/goals.js';
import { summaryRoutes } from './routes/summary.js';

const PORT = Number(process.env.MESHI_SERVER_PORT ?? 5251);
const HOST = process.env.MESHI_SERVER_HOST ?? '0.0.0.0';

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'development' ? 'info' : 'warn' },
});

await app.register(cors, { origin: true });

app.get('/health', async () => ({
  status: 'ok',
  db: getDatabasePath(),
}));

await app.register(foodRoutes, { prefix: '/api/foods' });
await app.register(recordRoutes, { prefix: '/api/records' });
await app.register(goalRoutes, { prefix: '/api/goals' });
await app.register(summaryRoutes, { prefix: '/api/summary' });

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
