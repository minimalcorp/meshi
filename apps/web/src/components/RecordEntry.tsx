'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { foodsApi, goalsApi, recordsApi } from '@/lib/api';
import type { CalorieGoal, Food, IntakeRecord, MealType } from '@/lib/types';
import { MEAL_LABELS, MEAL_TYPES } from '@/lib/types';
import { endOfDay, startOfDay, toDatetimeLocal } from '@/lib/date';
import { Button, Card, Field, Input, Select, SectionTitle } from './ui';
import { RecordRow } from './RecordRow';

// まとめて記録するための明細（バスケットの1行）
type Draft =
  | {
      key: string;
      kind: 'master';
      foodId: string;
      name: string;
      perServing: number;
      quantity: number;
    }
  | { key: string; kind: 'adhoc'; name: string; calories: number };

function draftCalories(d: Draft): number {
  return d.kind === 'master' ? Math.round(d.perServing * d.quantity) : d.calories;
}

export function RecordEntry() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [goal, setGoal] = useState<CalorieGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 明細ピッカー
  const [mode, setMode] = useState<'master' | 'adhoc'>('master');
  const [foodId, setFoodId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adhocName, setAdhocName] = useState('');
  const [adhocCalories, setAdhocCalories] = useState('');
  // バスケット & 共通項目
  const [items, setItems] = useState<Draft[]>([]);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [consumedAt, setConsumedAt] = useState(toDatetimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef(0);
  const nextKey = () => String(++keyRef.current);

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
  const basketTotal = useMemo(() => items.reduce((s, d) => s + draftCalories(d), 0), [items]);

  // ピッカーの内容をバスケットに追加
  function addItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'master') {
      const f = foods.find((x) => x.id === foodId);
      if (!f) {
        setError('食品を選択してください');
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          key: nextKey(),
          kind: 'master',
          foodId: f.id,
          name: f.name,
          perServing: f.caloriesPerServing,
          quantity: Number(quantity) || 1,
        },
      ]);
    } else {
      if (!adhocName.trim() || adhocCalories === '') {
        setError('食品名とカロリーを入力してください');
        return;
      }
      setItems((prev) => [
        ...prev,
        { key: nextKey(), kind: 'adhoc', name: adhocName.trim(), calories: Number(adhocCalories) },
      ]);
      setAdhocName('');
      setAdhocCalories('');
    }
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((d) => d.key !== key));
  }

  // バスケットをまとめて記録
  async function submitAll() {
    if (items.length === 0) {
      setError('食品を追加してください');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const consumedISO = new Date(consumedAt).toISOString();
      await recordsApi.createBatch(
        items.map((d) =>
          d.kind === 'master'
            ? { foodId: d.foodId, quantity: d.quantity, mealType, consumedAt: consumedISO }
            : { name: d.name, calories: d.calories, mealType, consumedAt: consumedISO },
        ),
      );
      setItems([]);
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
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

      {/* 記録入力（複数食品をまとめて記録できる） */}
      <Card>
        <SectionTitle>記録する</SectionTitle>
        <p className="mb-3 text-xs text-neutral-500">
          食品を追加してから「まとめて記録」。米とサバ缶のように複数をまとめて1つの食事として登録できます。
        </p>

        <div className="mb-3 flex gap-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('master')}
            className={`rounded-md px-3 py-1 ${mode === 'master' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
          >
            マスタから
          </button>
          <button
            type="button"
            onClick={() => setMode('adhoc')}
            className={`rounded-md px-3 py-1 ${mode === 'adhoc' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
          >
            その場で入力
          </button>
        </div>

        {/* 明細ピッカー（Enter / ＋追加 でバスケットへ） */}
        <form onSubmit={addItem} className="grid grid-cols-2 gap-3">
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
              <div className="flex items-end pb-1">
                <p className="text-sm text-neutral-500">
                  {previewCalories !== null ? `= ${previewCalories} kcal` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <Field label="食品名">
                <Input value={adhocName} onChange={(e) => setAdhocName(e.target.value)} />
              </Field>
              <Field label="カロリー (kcal)">
                <Input
                  type="number"
                  min="0"
                  value={adhocCalories}
                  onChange={(e) => setAdhocCalories(e.target.value)}
                />
              </Field>
            </>
          )}
          <div className="col-span-2">
            <Button
              type="submit"
              variant="ghost"
              disabled={mode === 'master' && foods.length === 0}
            >
              ＋ 食品を追加
            </Button>
          </div>
        </form>

        {/* バスケット */}
        {items.length > 0 && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <ul className="divide-y divide-neutral-200">
              {items.map((d) => (
                <li key={d.key} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    <span className="font-medium">{d.name}</span>
                    {d.kind === 'master' && d.quantity !== 1 && (
                      <span className="ml-1 text-neutral-500">×{d.quantity}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums text-neutral-600">{draftCalories(d)} kcal</span>
                    <button
                      type="button"
                      onClick={() => removeItem(d.key)}
                      className="rounded px-1.5 text-red-600 hover:bg-red-50"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm font-medium">
              <span>合計（{items.length}件）</span>
              <span className="tabular-nums">{basketTotal.toLocaleString()} kcal</span>
            </div>
          </div>
        )}

        {/* 共通項目 + まとめて記録 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
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
            <Button type="button" onClick={submitAll} disabled={submitting || items.length === 0}>
              {submitting
                ? '記録中…'
                : `まとめて記録${items.length > 0 ? `（${items.length}件・${basketTotal.toLocaleString()} kcal）` : ''}`}
            </Button>
          </div>
        </div>
      </Card>

      {/* 今日の記録一覧 */}
      <Card>
        <SectionTitle>今日の記録</SectionTitle>
        {records.length === 0 ? (
          <p className="text-sm text-neutral-500">まだ記録がありません。</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {records.map((r) => (
              <RecordRow key={r.id} record={r} onChanged={reload} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
