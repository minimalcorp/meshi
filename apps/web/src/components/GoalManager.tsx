'use client';

import { useEffect, useState } from 'react';
import { goalsApi } from '@/lib/api';
import type { CalorieGoal } from '@/lib/types';
import { toDateKey } from '@/lib/date';
import { Button, Card, Field, Input, SectionTitle } from './ui';

export function GoalManager() {
  const [goals, setGoals] = useState<CalorieGoal[]>([]);
  const [current, setCurrent] = useState<CalorieGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(toDateKey(new Date()));
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    const [list, cur] = await Promise.all([goalsApi.list(), goalsApi.current()]);
    setGoals(list);
    setCurrent(cur);
  }

  useEffect(() => {
    reload()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await goalsApi.create({
        dailyTarget: Number(target),
        effectiveFrom: new Date(`${effectiveFrom}T00:00:00`).toISOString(),
      });
      setTarget('');
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(g: CalorieGoal) {
    if (!confirm(`この目標（${g.dailyTarget} kcal）を削除しますか？`)) return;
    await goalsApi.remove(g.id);
    await reload();
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card>
        <SectionTitle>現在の目標</SectionTitle>
        {loading ? (
          <p className="text-sm text-neutral-500">読み込み中…</p>
        ) : current ? (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{current.dailyTarget.toLocaleString()}</span>
            <span className="text-sm text-neutral-500">
              kcal / 日（{new Date(current.effectiveFrom).toLocaleDateString('ja-JP')} 〜 適用中）
            </span>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">まだ目標が設定されていません。</p>
        )}
      </Card>

      <Card>
        <SectionTitle>目標を設定 / 変更</SectionTitle>
        <form onSubmit={add} className="grid grid-cols-2 gap-3">
          <Field label="1日の目標カロリー (kcal)">
            <Input
              type="number"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="1500"
              required
            />
          </Field>
          <Field label="適用開始日">
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中…' : 'この目標を保存'}
            </Button>
            <p className="mt-2 text-xs text-neutral-500">
              ※ 適用開始日ごとに履歴が残り、各日はその日時点の目標で評価されます。
            </p>
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle>目標の履歴</SectionTitle>
        {goals.length === 0 ? (
          <p className="text-sm text-neutral-500">履歴はありません。</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{g.dailyTarget.toLocaleString()} kcal/日</span>
                  <span className="ml-2 text-neutral-500">
                    {new Date(g.effectiveFrom).toLocaleDateString('ja-JP')} 〜
                  </span>
                  {current?.id === g.id && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                      適用中
                    </span>
                  )}
                </div>
                <Button variant="danger" onClick={() => remove(g)}>
                  削除
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
