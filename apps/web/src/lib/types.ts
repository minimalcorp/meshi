export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  // snack は菓子に限らず、味噌汁・スープだけといった軽い食事も含む「間食/軽食」枠
  snack: '間食',
};

// 食事種別ごとのバッジ配色（Tailwind v4 でパージされないよう静的なクラス文字列で持つ）
export const MEAL_BADGE_CLASS: Record<MealType, string> = {
  breakfast: 'bg-orange-100 text-orange-700',
  lunch: 'bg-amber-100 text-amber-700',
  dinner: 'bg-indigo-100 text-indigo-700',
  snack: 'bg-emerald-100 text-emerald-700',
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
