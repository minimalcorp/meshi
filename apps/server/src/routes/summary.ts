import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/http.js';
import { buildSummary } from '../lib/summary.js';

const summaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']),
  date: z.coerce.date().optional(),
});

export const summaryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req, reply) => {
    const q = parse(summaryQuerySchema, req.query, reply);
    if (!q) return;
    return buildSummary(q.period, q.date ?? new Date());
  });
};
