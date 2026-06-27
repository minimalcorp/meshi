'use client';

import type { SummaryDay } from '@/lib/types';

// Phase 5 で visx によるグラフに差し替える（暫定プレースホルダ）
export function IntakeChart({ days }: { days: SummaryDay[] }) {
  void days;
  return <p className="text-sm text-neutral-400">グラフはこの後のフェーズで実装します。</p>;
}
