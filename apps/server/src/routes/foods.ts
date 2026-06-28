import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { parse, notFound } from '../lib/http.js';
import { createFoodSchema, updateFoodSchema } from '../lib/validation.js';

export const foodRoutes: FastifyPluginAsync = async (app) => {
  // 一覧（デフォルトはアーカイブ済みを除外）
  app.get('/', async (req) => {
    const includeArchived = (req.query as { includeArchived?: string }).includeArchived === 'true';
    return prisma.food.findMany({
      where: includeArchived ? undefined : { archived: false },
      orderBy: { name: 'asc' },
    });
  });

  // 追加
  app.post('/', async (req, reply) => {
    const body = parse(createFoodSchema, req.body, reply);
    if (!body) return;
    const food = await prisma.food.create({ data: body });
    reply.code(201);
    return food;
  });

  // 編集（archived の切り替えもここで行う。物理削除は提供せず「アーカイブのみ」とする）
  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = parse(updateFoodSchema, req.body, reply);
    if (!body) return;
    const existing = await prisma.food.findUnique({ where: { id } });
    if (!existing) return notFound(reply, 'Food not found');
    return prisma.food.update({ where: { id }, data: body });
  });
};
