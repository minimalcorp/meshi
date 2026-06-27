'use client';

import { useEffect, useMemo, useState } from 'react';
import { foodsApi, goalsApi, recordsApi } from '@/lib/api';
import type { CalorieGoal, Food, IntakeRecord, MealType } from '@/lib/types';
import { MEAL_LABELS, MEAL_TYPES } from '@/lib/types';
import { endOfDay, formatTime, startOfDay, toDatetimeLocal } from '@/lib/date';
import { Button, Card, Field, Input, Select, SectionTitle } from './ui';

export function RecordEntry() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [goal, setGoal] = useState<CalorieGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [mode, setMode] = useState<'master' | 'adhoc'>('master');
  const [foodId, setFoodId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adhocName, setAdhocName] = useState('');
  const [adhocCalories, setAdhocCalories] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [consumedAt, setConsumedAt] = useState(toDatetimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    const now = new Date();
    const [f, r, g] = await Promise.all([
      foodsApi.list(),
      recordsApi.list({ from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }),
      goalsApi.current(),
    ]);
    setFoods(f);
    setRecords(r);
    setGoal(g);
    if (!foodId && f.length > 0) setFoodId(f[0].id);
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => records.reduce((s, r) => s + r.calories, 0), [records]);
  const target = goal?.dailyTarget ?? null;
  const pct = target ? Math.min(100, Math.round((total / target) * 100)) : null;
  const selectedFood = foods.find((f) => f.id === foodId);
  const previewCalories =
    mode === 'master' && selectedFood
      ? Math.round(selectedFood.caloriesPerServing * (Number(quantity) || 0))
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'master') {
        if (!foodId) throw new Error('食品を選択してください');
        await recordsApi.create({
          foodId,
          quantity: Number(quantity) || 1,
          mealType,
          consumedAt: new Date(consumedAt).toISOString(),
        });
      } else {
        await recordsApi.create({
          name: adhocName,
          calories: Number(adhocCalories),
          mealType,
          consumedAt: new Date(consumedAt).toISOString(),
        });
        setAdhocName('');
        setAdhocCalories('');
      }
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    await recordsApi.remove(id);
    setRecords((rs) => rs.filter((r) => r.id !== id));
  }

  if (loading) return <p className="text-sm text-neutral-500">読み込み中…</p>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* 今日のサマリ */}
      <Card>
        <SectionTitle>今日の摂取</SectionTitle>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{total.toLocaleString()}</span>
          <span className="text-sm text-neutral-500">
            kcal{target ? ` / 目標 ${target.toLocaleString()} kcal` : '（目標未設定）'}
          </span>
        </div>
        {pct !== null && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className={`h-full ${total > (target ?? 0) ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </Card>

      {/* 記録入力 */}
      <Card>
        <SectionTitle>記録する</SectionTitle>
        <div className="mb-3 flex gap-1 text-sm">
          <button
            onClick={() => setMode('master')}
            className={`rounded-md px-3 py-1 ${mode === 'master' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
          >
            マスタから
          </button>
          <button
            onClick={() => setMode('adhoc')}
            className={`rounded-md px-3 py-1 ${mode === 'adhoc' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
          >
            その場で入力
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {mode === 'master' ? (
            <>
              <div className="col-span-2">
                <Field label="食品">
                  {foods.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      食品マスタが空です。「食品マスタ」から登録してください。
                    </p>
                  ) : (
                    <Select value={foodId} onChange={(e) => setFoodId(e.target.value)}>
                      {foods.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}（{f.caloriesPerServing} kcal
                          {f.unitLabel ? ` / ${f.unitLabel}` : ''}）
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="数量">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <p className="text-sm text-neutral-500">
                  {previewCalories !== null ? `= ${previewCalories} kcal` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <Field label="食品名">
                <Input value={adhocName} onChange={(e) => setAdhocName(e.target.value)} required />
              </Field>
              <Field label="カロリー (kcal)">
                <Input
                  type="number"
                  min="0"
                  value={adhocCalories}
                  onChange={(e) => setAdhocCalories(e.target.value)}
                  required
                />
              </Field>
            </>
          )}

          <Field label="区分">
            <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="摂取日時">
            <Input
              type="datetime-local"
              value={consumedAt}
              onChange={(e) => setConsumedAt(e.target.value)}
            />
          </Field>

          <div className="col-span-2">
            <Button
              type="submit"
              disabled={submitting || (mode === 'master' && foods.length === 0)}
            >
              {submitting ? '記録中…' : '記録する'}
            </Button>
          </div>
        </form>
      </Card>

      {/* 今日の記録一覧 */}
      <Card>
        <SectionTitle>今日の記録</SectionTitle>
        {records.length === 0 ? (
          <p className="text-sm text-neutral-500">まだ記録がありません。</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-10 rounded bg-neutral-100 px-1 py-0.5 text-center text-xs text-neutral-600">
                    {MEAL_LABELS[r.mealType]}
                  </span>
                  <span className="text-neutral-400">{formatTime(r.consumedAt)}</span>
                  <span className="font-medium">{r.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{r.calories} kcal</span>
                  <Button variant="danger" onClick={() => remove(r.id)}>
                    削除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
