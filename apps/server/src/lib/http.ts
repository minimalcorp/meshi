import type { FastifyReply } from 'fastify';
import type { ZodType } from 'zod';

/**
 * zod でパースし、失敗時は 400 を返して null を返す。
 * 呼び出し側は null チェックで early-return する。
 */
export function parse<T>(schema: ZodType<T>, data: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    reply.code(400).send({ error: 'ValidationError', issues: result.error.issues });
    return null;
  }
  return result.data;
}

export function notFound(reply: FastifyReply, message = 'Not found') {
  reply.code(404).send({ error: 'NotFound', message });
}
