export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

export interface Food {
  id: string;
  name: string;
  caloriesPerServing: number;
  unitLabel: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeRecord {
  id: string;
  foodId: string | null;
  name: string;
  calories: number;
  mealType: MealType;
  consumedAt: string;
  createdAt: string;
}

export interface CalorieGoal {
  id: string;
  dailyTarget: number;
  effectiveFrom: string;
  createdAt: string;
}

export type Period = 'day' | 'week' | 'month';

export interface SummaryDay {
  date: string; // YYYY-MM-DD
  total: number; // 摂取kcal
  target: number | null; // その日の目標kcal
}

export interface Summary {
  period: Period;
  from: string;
  to: string;
  total: number; // 期間合計摂取
  target: number | null; // 期間合計目標（各日の目標合計）
  diff: number | null; // total - target
  days: SummaryDay[];
}
