import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { parse, notFound } from '../lib/http.js';
import { createGoalSchema } from '../lib/validation.js';

export const goalRoutes: FastifyPluginAsync = async (app) => {
  // 目標履歴一覧（新しい順）
  app.get('/', async () => {
    return prisma.calorieGoal.findMany({ orderBy: { effectiveFrom: 'desc' } });
  });

  // 現在有効な目標
  app.get('/current', async () => {
    return prisma.calorieGoal.findFirst({
      where: { effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });
  });

  // 目標を追加（effectiveFrom 未指定なら本日0時から有効）
  app.post('/', async (req, reply) => {
    const body = parse(createGoalSchema, req.body, reply);
    if (!body) return;
    const effectiveFrom = body.effectiveFrom ?? new Date();
    // 日単位で扱うため 0時 に丸める
    effectiveFrom.setHours(0, 0, 0, 0);
    const goal = await prisma.calorieGoal.create({
      data: { dailyTarget: body.dailyTarget, effectiveFrom },
    });
    reply.code(201);
    return goal;
  });

  // 目標を削除
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.calorieGoal.findUnique({ where: { id } });
    if (!existing) return notFound(reply, 'Goal not found');
    await prisma.calorieGoal.delete({ where: { id } });
    reply.code(204);
  });
};
