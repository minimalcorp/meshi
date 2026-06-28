'use client';

import { useState } from 'react';
import { recordsApi } from '@/lib/api';
import type { IntakeRecord, MealType } from '@/lib/types';
import { MEAL_LABELS, MEAL_TYPES } from '@/lib/types';
import { formatTime, toDatetimeLocal } from '@/lib/date';
import { Button, Input, Select } from './ui';

export function RecordRow({
  record,
  onChanged,
}: {
  record: IntakeRecord;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(record.name);
  const [calories, setCalories] = useState(String(record.calories));
  const [mealType, setMealType] = useState<MealType>(record.mealType);
  const [consumedAt, setConsumedAt] = useState(toDatetimeLocal(new Date(record.consumedAt)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    // 編集開始時に現在値へ戻す
    setName(record.name);
    setCalories(String(record.calories));
    setMealType(record.mealType);
    setConsumedAt(toDatetimeLocal(new Date(record.consumedAt)));
    setError(null);
    setEditing(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await recordsApi.update(record.id, {
        name,
        calories: Number(calories),
        mealType,
        consumedAt: new Date(consumedAt).toISOString(),
      });
      setEditing(false);
      await onChanged();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await recordsApi.remove(record.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="py-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="食品名" />
          <Input
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal"
          />
          <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </Select>
          <Input
            type="datetime-local"
            value={consumedAt}
            onChange={(e) => setConsumedAt(e.target.value)}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex gap-2">
          <Button onClick={save} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            キャンセル
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-10 rounded bg-neutral-100 px-1 py-0.5 text-center text-xs text-neutral-600">
          {MEAL_LABELS[record.mealType]}
        </span>
        <span className="text-neutral-400">{formatTime(record.consumedAt)}</span>
        <span className="font-medium">{record.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">{record.calories} kcal</span>
        <Button variant="ghost" onClick={startEdit} disabled={busy}>
          編集
        </Button>
        <Button variant="danger" onClick={remove} disabled={busy}>
          削除
        </Button>
      </div>
    </li>
  );
}
