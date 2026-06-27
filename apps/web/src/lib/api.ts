import type { CalorieGoal, Food, IntakeRecord, MealType, Period, Summary } from './types';

const BASE = process.env.NEXT_PUBLIC_MESHI_API_URL ?? 'http://localhost:5251';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      // ignore
    }
    throw new Error(`API ${res.status} ${path} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Foods ----
export const foodsApi = {
  list: (includeArchived = false) =>
    http<Food[]>(`/api/foods${includeArchived ? '?includeArchived=true' : ''}`),
  create: (data: { name: string; caloriesPerServing: number; unitLabel?: string }) =>
    http<Food>('/api/foods', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      caloriesPerServing: number;
      unitLabel: string | null;
      archived: boolean;
    }>,
  ) => http<Food>(`/api/foods/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/foods/${id}`, { method: 'DELETE' }),
};

// ---- Records ----
export const recordsApi = {
  list: (params?: { from?: string; to?: string; mealType?: MealType }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.mealType) q.set('mealType', params.mealType);
    const qs = q.toString();
    return http<IntakeRecord[]>(`/api/records${qs ? `?${qs}` : ''}`);
  },
  create: (data: {
    foodId?: string;
    name?: string;
    calories?: number;
    quantity?: number;
    mealType: MealType;
    consumedAt?: string;
  }) => http<IntakeRecord>('/api/records', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{ name: string; calories: number; mealType: MealType; consumedAt: string }>,
  ) => http<IntakeRecord>(`/api/records/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/records/${id}`, { method: 'DELETE' }),
};

// ---- Goals ----
export const goalsApi = {
  list: () => http<CalorieGoal[]>('/api/goals'),
  current: () => http<CalorieGoal | null>('/api/goals/current'),
  create: (data: { dailyTarget: number; effectiveFrom?: string }) =>
    http<CalorieGoal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/goals/${id}`, { method: 'DELETE' }),
};

// ---- Summary ----
export const summaryApi = {
  get: (period: Period, date?: string) => {
    const q = new URLSearchParams({ period });
    if (date) q.set('date', date);
    return http<Summary>(`/api/summary?${q.toString()}`);
  },
};
