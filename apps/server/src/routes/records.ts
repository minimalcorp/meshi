import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { parse, notFound } from '../lib/http.js';
import {
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema,
} from '../lib/validation.js';

export const recordRoutes: FastifyPluginAsync = async (app) => {
  // 一覧（期間・区分でフィルタ）
  app.get('/', async (req, reply) => {
    const q = parse(listRecordsQuerySchema, req.query, reply);
    if (!q) return;
    return prisma.intakeRecord.findMany({
      where: {
        consumedAt: q.from || q.to ? { gte: q.from, lte: q.to } : undefined,
        mealType: q.mealType,
      },
      orderBy: { consumedAt: 'desc' },
    });
  });

  // 追加
  app.post('/', async (req, reply) => {
    const body = parse(createRecordSchema, req.body, reply);
    if (!body) return;

    let name = body.name;
    let calories = body.calories;
    let foodId = body.foodId ?? null;

    // foodId 指定時はマスタからスナップショット（明示指定があればそちらを優先）
    if (body.foodId) {
      const food = await prisma.food.findUnique({ where: { id: body.foodId } });
      if (!food) return notFound(reply, 'Food not found');
      const quantity = body.quantity ?? 1;
      name = name ?? food.name;
      calories = calories ?? Math.round(food.caloriesPerServing * quantity);
      foodId = food.id;
    }

    const record = await prisma.intakeRecord.create({
      data: {
        foodId,
        name: name!,
        calories: calories!,
        mealType: body.mealType,
        consumedAt: body.consumedAt ?? new Date(),
      },
    });
    reply.code(201);
    return record;
  });

  // 編集
  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = parse(updateRecordSchema, req.body, reply);
    if (!body) return;
    const existing = await prisma.intakeRecord.findUnique({ where: { id } });
    if (!existing) return notFound(reply, 'Record not found');
    return prisma.intakeRecord.update({ where: { id }, data: body });
  });

  // 削除
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.intakeRecord.findUnique({ where: { id } });
    if (!existing) return notFound(reply, 'Record not found');
    await prisma.intakeRecord.delete({ where: { id } });
    reply.code(204);
  });
};
