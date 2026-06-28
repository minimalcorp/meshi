import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { parse, notFound } from '../lib/http.js';
import {
  createRecordSchema,
  createRecordsBatchSchema,
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

  // 複数まとめて追加（同一の食事として複数食品を一括登録。トランザクションで原子的に作成）
  app.post('/batch', async (req, reply) => {
    const body = parse(createRecordsBatchSchema, req.body, reply);
    if (!body) return;

    // 参照される food をまとめて取得
    const foodIds = [...new Set(body.items.map((i) => i.foodId).filter((v): v is string => !!v))];
    const foods = foodIds.length
      ? await prisma.food.findMany({ where: { id: { in: foodIds } } })
      : [];
    const foodMap = new Map(foods.map((f) => [f.id, f]));

    const data = [];
    for (const item of body.items) {
      let name = item.name;
      let calories = item.calories;
      let foodId = item.foodId ?? null;

      if (item.foodId) {
        const food = foodMap.get(item.foodId);
        if (!food) return notFound(reply, `Food not found: ${item.foodId}`);
        const quantity = item.quantity ?? 1;
        name = name ?? food.name;
        calories = calories ?? Math.round(food.caloriesPerServing * quantity);
        foodId = food.id;
      }

      data.push({
        foodId,
        name: name!,
        calories: calories!,
        mealType: item.mealType,
        consumedAt: item.consumedAt ?? new Date(),
      });
    }

    const created = await prisma.$transaction(
      data.map((d) => prisma.intakeRecord.create({ data: d })),
    );
    reply.code(201);
    return created;
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
