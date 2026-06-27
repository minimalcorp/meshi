'use client';

import { useMemo } from 'react';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar, LinePath } from '@visx/shape';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import type { SummaryDay } from '@/lib/types';
import { useWidth } from '@/lib/useMeasure';

const HEIGHT = 240;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 44 };

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function IntakeChart({ days }: { days: SummaryDay[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<SummaryDay>();

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const xScale = useMemo(
    () => scaleBand({ domain: days.map((d) => d.date), range: [0, innerW], padding: 0.3 }),
    [days, innerW],
  );

  const maxY = useMemo(() => {
    const m = Math.max(1, ...days.map((d) => Math.max(d.total, d.target ?? 0)));
    return Math.ceil(m / 100) * 100; // 100kcal単位で切り上げ
  }, [days]);

  const yScale = useMemo(
    () => scaleLinear({ domain: [0, maxY], range: [innerH, 0], nice: true }),
    [maxY, innerH],
  );

  // ラベルは最大10個程度に間引く
  const tickStep = Math.max(1, Math.ceil(days.length / 10));

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg width={width} height={HEIGHT}>
          <Group left={MARGIN.left} top={MARGIN.top}>
            <GridRows scale={yScale} width={innerW} stroke="#eee" numTicks={4} />

            {days.map((d) => {
              const x = xScale(d.date) ?? 0;
              const barH = innerH - yScale(d.total);
              const over = d.target !== null && d.total > d.target;
              return (
                <Bar
                  key={d.date}
                  x={x}
                  y={yScale(d.total)}
                  width={xScale.bandwidth()}
                  height={Math.max(0, barH)}
                  rx={2}
                  fill={over ? '#ef4444' : '#10b981'}
                  onMouseMove={(e) => {
                    const pt = localPoint(e);
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: (pt?.x ?? 0) + 8,
                      tooltipTop: (pt?.y ?? 0) - 8,
                    });
                  }}
                  onMouseLeave={hideTooltip}
                />
              );
            })}

            {/* 目標ライン（各日の目標値を結ぶ。null日は除外） */}
            <LinePath
              data={days.filter((d) => d.target !== null)}
              x={(d) => (xScale(d.date) ?? 0) + xScale.bandwidth() / 2}
              y={(d) => yScale(d.target ?? 0)}
              stroke="#737373"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />

            <AxisLeft
              scale={yScale}
              numTicks={4}
              stroke="#ccc"
              tickStroke="#ccc"
              tickLabelProps={() => ({ fill: '#888', fontSize: 10, dx: -2, dy: 3 })}
            />
            <AxisBottom
              top={innerH}
              scale={xScale}
              stroke="#ccc"
              tickStroke="#ccc"
              tickFormat={(v) => dayLabel(String(v))}
              tickValues={days.filter((_, i) => i % tickStep === 0).map((d) => d.date)}
              tickLabelProps={() => ({ fill: '#888', fontSize: 10, textAnchor: 'middle' })}
            />
          </Group>
        </svg>
      )}

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{ ...defaultStyles, fontSize: 12 }}
        >
          <div className="font-medium">{dayLabel(tooltipData.date)}</div>
          <div>摂取: {tooltipData.total.toLocaleString()} kcal</div>
          <div>目標: {tooltipData.target !== null ? `${tooltipData.target.toLocaleString()} kcal` : '—'}</div>
        </TooltipWithBounds>
      )}

      <div className="mt-2 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> 目標内
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> 超過
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-3 border-t border-dashed border-neutral-500" /> 目標ライン
        </span>
      </div>
    </div>
  );
}
