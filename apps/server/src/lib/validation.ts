import { z } from 'zod';
import { MEAL_TYPES } from './constants.js';

// ---- Food ----
export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(200),
  caloriesPerServing: z.number().int().min(0).max(100000),
  unitLabel: z.string().trim().max(50).optional(),
});

export const updateFoodSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    caloriesPerServing: z.number().int().min(0).max(100000),
    unitLabel: z.string().trim().max(50).nullable(),
    archived: z.boolean(),
  })
  .partial();

// ---- IntakeRecord ----
// foodId があればマスタからスナップショット。なければ name+calories 必須（アドホック記録）。
export const createRecordSchema = z
  .object({
    foodId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    calories: z.number().int().min(0).max(100000).optional(),
    quantity: z.number().min(0).max(1000).optional(),
    mealType: z.enum(MEAL_TYPES),
    consumedAt: z.coerce.date().optional(),
  })
  .refine((v) => v.foodId !== undefined || (v.name !== undefined && v.calories !== undefined), {
    message: 'foodId か (name と calories) のいずれかが必要です',
  });

// 複数食品を同一の食事としてまとめて登録（米とサバ缶を昼食として一括記録、など）
export const createRecordsBatchSchema = z.object({
  items: z.array(createRecordSchema).min(1).max(50),
});

export const updateRecordSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    calories: z.number().int().min(0).max(100000),
    mealType: z.enum(MEAL_TYPES),
    consumedAt: z.coerce.date(),
  })
  .partial();

export const listRecordsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
});

// ---- CalorieGoal ----
export const createGoalSchema = z.object({
  dailyTarget: z.number().int().min(0).max(100000),
  effectiveFrom: z.coerce.date().optional(),
});
