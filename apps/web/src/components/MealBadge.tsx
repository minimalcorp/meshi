import { Sunrise, Sun, Moon, Soup, type LucideIcon } from 'lucide-react';
import type { MealType } from '@/lib/types';
import { MEAL_LABELS, MEAL_BADGE_CLASS } from '@/lib/types';

// 食事種別ごとのアイコン。
// breakfast/lunch/dinner は時間帯（日の出・太陽・月）で表現。
// snack は菓子に限らず味噌汁・スープなど軽い食事も含むため、特定の食品を連想させない汎用アイコンにする。
const MEAL_ICON: Record<MealType, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Soup,
};

export function MealBadge({ mealType }: { mealType: MealType }) {
  const Icon = MEAL_ICON[mealType];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${MEAL_BADGE_CLASS[mealType]}`}
    >
      <Icon size={12} aria-hidden />
      {MEAL_LABELS[mealType]}
    </span>
  );
}
