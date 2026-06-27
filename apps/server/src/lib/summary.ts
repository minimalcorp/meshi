import { prisma } from './db.js';

export type Period = 'day' | 'week' | 'month';

export interface SummaryDay {
  date: string; // YYYY-MM-DD（ローカル）
  total: number;
  target: number | null;
}

export interface Summary {
  period: Period;
  from: string;
  to: string;
  total: number;
  target: number | null;
  diff: number | null;
  days: SummaryDay[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** period と基準日から [from, to)（to は排他）を求める */
export function periodRange(period: Period, base: Date): { from: Date; to: Date } {
  const day = startOfDay(base);
  if (period === 'day') {
    return { from: day, to: addDays(day, 1) };
  }
  if (period === 'week') {
    // 月曜始まり
    const dow = (day.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const from = addDays(day, -dow);
    return { from, to: addDays(from, 7) };
  }
  // month
  const from = new Date(day.getFullYear(), day.getMonth(), 1);
  const to = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  return { from, to };
}

export async function buildSummary(period: Period, base: Date): Promise<Summary> {
  const { from, to } = periodRange(period, base);

  const [records, goals] = await Promise.all([
    prisma.intakeRecord.findMany({
      where: { consumedAt: { gte: from, lt: to } },
      select: { consumedAt: true, calories: true },
    }),
    // 期間終了までに有効化された目標（新しい順）
    prisma.calorieGoal.findMany({
      where: { effectiveFrom: { lt: to } },
      orderBy: { effectiveFrom: 'desc' },
    }),
  ]);

  // 日ごとの摂取合計
  const totalsByDay = new Map<string, number>();
  for (const r of records) {
    const key = toDateKey(new Date(r.consumedAt));
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + r.calories);
  }

  // その日に有効な目標（effectiveFrom <= 当日 の最新）
  const goalFor = (d: Date): number | null => {
    const dayStart = startOfDay(d);
    const g = goals.find((x) => new Date(x.effectiveFrom) <= dayStart);
    return g ? g.dailyTarget : null;
  };

  const days: SummaryDay[] = [];
  for (let d = new Date(from); d < to; d = addDays(d, 1)) {
    const key = toDateKey(d);
    days.push({ date: key, total: totalsByDay.get(key) ?? 0, target: goalFor(d) });
  }

  const total = days.reduce((s, x) => s + x.total, 0);
  const hasAnyTarget = days.some((x) => x.target !== null);
  const target = hasAnyTarget ? days.reduce((s, x) => s + (x.target ?? 0), 0) : null;
  const diff = target === null ? null : total - target;

  return { period, from: from.toISOString(), to: to.toISOString(), total, target, diff, days };
}
