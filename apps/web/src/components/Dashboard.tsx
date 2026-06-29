'use client';

import { useCallback, useEffect, useState } from 'react';
import { summaryApi } from '@/lib/api';
import type { Period, Summary } from '@/lib/types';
import { toDateKey } from '@/lib/date';
import { Card, SectionTitle } from './ui';
import { IntakeChart } from './IntakeChart';

const PERIOD_LABELS: Record<Period, string> = { day: '日次', week: '週次', month: '月次' };

function shift(base: Date, period: Period, dir: number): Date {
  const d = new Date(base);
  if (period === 'day') d.setDate(d.getDate() + dir);
  else if (period === 'week') d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

function rangeLabel(s: Summary): string {
  const from = new Date(s.from);
  const to = new Date(s.to);
  to.setDate(to.getDate() - 1); // to は排他なので表示は1日戻す
  if (s.period === 'day') return from.toLocaleDateString('ja-JP', { dateStyle: 'long' });
  const fmt = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  if (s.period === 'month')
    return from.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  return `${fmt(from)} 〜 ${fmt(to)}`;
}

export function Dashboard() {
  const [period, setPeriod] = useState<Period>('day');
  const [base, setBase] = useState(new Date());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await summaryApi.get(period, toDateKey(base)));
    } catch (e) {
      setError(String(e));
    }
  }, [period, base]);

  useEffect(() => {
    load();
  }, [load]);

  const pct = summary && summary.target ? Math.round((summary.total / summary.target) * 100) : null;
  const over = summary?.diff !== null && summary?.diff !== undefined && summary.diff > 0;
  // バーの色分け: 目標までを緑、超過分を赤で表現する。
  // 超過時はバー全体(100%)を total で按分し、緑=目標/total・赤=超過分/total とする。
  // 目標以下のときは達成率ぶんだけ緑で満たす。
  const greenWidth =
    summary && summary.target
      ? over
        ? Math.round((summary.target / summary.total) * 100)
        : Math.min(100, pct ?? 0)
      : 0;
  const redWidth = over ? 100 - greenWidth : 0;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {/* 期間切替 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm ${period === p ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBase((b) => shift(b, period, -1))}
            className="rounded-md bg-neutral-100 px-2 py-1.5 text-sm hover:bg-neutral-200"
          >
            ←
          </button>
          <button
            onClick={() => setBase(new Date())}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200"
          >
            今
          </button>
          <button
            onClick={() => setBase((b) => shift(b, period, 1))}
            className="rounded-md bg-neutral-100 px-2 py-1.5 text-sm hover:bg-neutral-200"
          >
            →
          </button>
        </div>
      </div>

      {!summary ? (
        <p className="text-sm text-neutral-500">読み込み中…</p>
      ) : (
        <>
          <Card>
            <div className="mb-1 text-sm text-neutral-500">{rangeLabel(summary)}</div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold">{summary.total.toLocaleString()}</span>
              <span className="pb-1 text-sm text-neutral-500">
                kcal{' '}
                {summary.target !== null
                  ? `/ 目標 ${summary.target.toLocaleString()} kcal`
                  : '（目標未設定）'}
              </span>
            </div>

            {pct !== null && (
              <>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full bg-emerald-500" style={{ width: `${greenWidth}%` }} />
                  {redWidth > 0 && (
                    <div className="h-full bg-red-500" style={{ width: `${redWidth}%` }} />
                  )}
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-neutral-500">達成率 {pct}%</span>
                  <span className={over ? 'text-red-600' : 'text-emerald-600'}>
                    {over ? '超過' : '残り'} {Math.abs(summary.diff ?? 0).toLocaleString()} kcal
                  </span>
                </div>
              </>
            )}
          </Card>

          {/* グラフ */}
          {summary.period !== 'day' && (
            <Card>
              <SectionTitle>カロリー推移</SectionTitle>
              <IntakeChart days={summary.days} />
            </Card>
          )}

          {/* 日別内訳 */}
          <Card>
            <SectionTitle>日別内訳</SectionTitle>
            <ul className="divide-y divide-neutral-100 text-sm">
              {summary.days.map((d) => {
                const dover = d.target !== null && d.total > d.target;
                return (
                  <li key={d.date} className="flex items-center justify-between py-1.5">
                    <span className="text-neutral-600">
                      {new Date(`${d.date}T00:00:00`).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                    <span className="flex items-center gap-3 tabular-nums">
                      <span className={dover ? 'font-medium text-red-600' : ''}>
                        {d.total.toLocaleString()} kcal
                      </span>
                      <span className="w-24 text-right text-neutral-400">
                        {d.target !== null ? `目標 ${d.target.toLocaleString()}` : '—'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
