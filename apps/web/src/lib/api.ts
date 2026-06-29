import type { CalorieGoal, Food, IntakeRecord, MealType, Period, Summary } from './types';

// Fastify が単一エントリとして API を同一オリジンで配信するため、既定は相対パス。
// （別オリジンの API を叩く場合のみ NEXT_PUBLIC_MESHI_API_URL を指定する）
const BASE = process.env.NEXT_PUBLIC_MESHI_API_URL ?? '';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  // body を持つリクエスト(POST/PATCH)のときだけ JSON の content-type を付ける。
  // body 無し(DELETE/GET)で application/json を送ると Fastify が空ボディを拒否する
  // (FST_ERR_CTP_EMPTY_JSON_BODY) ため、付けない。
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init?.body != null ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
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
  // 物理削除は提供せず、archived フラグ（update）で「アーカイブのみ」とする
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
  // 複数食品を同一の食事としてまとめて登録
  createBatch: (
    items: Array<{
      foodId?: string;
      name?: string;
      calories?: number;
      quantity?: number;
      mealType: MealType;
      consumedAt?: string;
    }>,
  ) =>
    http<IntakeRecord[]>('/api/records/batch', { method: 'POST', body: JSON.stringify({ items }) }),
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
