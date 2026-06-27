'use client';

import { useEffect, useState } from 'react';
import { foodsApi } from '@/lib/api';
import type { Food } from '@/lib/types';
import { Button, Card, Field, Input, SectionTitle } from './ui';

export function FoodManager() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    setFoods(await foodsApi.list(true));
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
      await foodsApi.create({
        name,
        caloriesPerServing: Number(calories),
        unitLabel: unitLabel.trim() || undefined,
      });
      setName('');
      setCalories('');
      setUnitLabel('');
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleArchive(f: Food) {
    await foodsApi.update(f.id, { archived: !f.archived });
    await reload();
  }

  async function remove(f: Food) {
    if (!confirm(`「${f.name}」を削除しますか？（過去の記録は名前・kcalが残ります）`)) return;
    await foodsApi.remove(f.id);
    await reload();
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card>
        <SectionTitle>食品を追加</SectionTitle>
        <form onSubmit={add} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="食品名">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          </div>
          <Field label="カロリー (kcal)">
            <Input
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
            />
          </Field>
          <Field label="単位ラベル（任意・例: 1杯 / 100g）">
            <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? '追加中…' : '追加する'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle>食品マスタ一覧</SectionTitle>
        {loading ? (
          <p className="text-sm text-neutral-500">読み込み中…</p>
        ) : foods.length === 0 ? (
          <p className="text-sm text-neutral-500">まだ食品が登録されていません。</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {foods.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <div className={f.archived ? 'text-neutral-400 line-through' : ''}>
                  <span className="font-medium">{f.name}</span>
                  <span className="ml-2 text-neutral-500">
                    {f.caloriesPerServing} kcal{f.unitLabel ? ` / ${f.unitLabel}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => toggleArchive(f)}>
                    {f.archived ? '復活' : 'アーカイブ'}
                  </Button>
                  <Button variant="danger" onClick={() => remove(f)}>
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
