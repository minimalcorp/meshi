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
// left は Y軸ラベルの最長値（カンマ込み7文字, ex. 12,345）が収まる幅を確保する
const MARGIN = { top: 12, right: 12, bottom: 28, left: 52 };

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

  // 各日の中心X座標（帯の中央に点・線を配置）
  const cx = (d: SummaryDay) => (xScale(d.date) ?? 0) + xScale.bandwidth() / 2;

  // ラベルは最大10個程度に間引く
  const tickStep = Math.max(1, Math.ceil(days.length / 10));

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg width={width} height={HEIGHT}>
          <Group left={MARGIN.left} top={MARGIN.top}>
            <GridRows scale={yScale} width={innerW} stroke="#eee" numTicks={4} />

            {/* 摂取カロリーの推移ライン */}
            <LinePath
              data={days}
              x={cx}
              y={(d) => yScale(d.total)}
              stroke="#10b981"
              strokeWidth={2}
            />

            {/* 各日のマーカー（目標内=緑 / 超過=赤） */}
            {days.map((d) => {
              const over = d.target !== null && d.total > d.target;
              return (
                <circle
                  key={d.date}
                  cx={cx(d)}
                  cy={yScale(d.total)}
                  r={3.5}
                  fill={over ? '#ef4444' : '#10b981'}
                />
              );
            })}

            {/* ホバー用の透明なヒット領域（帯幅いっぱい） */}
            {days.map((d) => {
              const x = xScale(d.date) ?? 0;
              return (
                <Bar
                  key={d.date}
                  x={x}
                  y={0}
                  width={xScale.bandwidth()}
                  height={innerH}
                  fill="transparent"
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
              x={cx}
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
              // textAnchor: 'end' でラベルを右揃えにし、桁が増えても左へ伸びるようにする
              // （未指定だと start 扱いで右に伸び、Y軸線に重なる）
              tickLabelProps={() => ({
                fill: '#888',
                fontSize: 10,
                textAnchor: 'end',
                dx: -4,
                dy: 3,
              })}
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
          <div>
            目標:{' '}
            {tooltipData.target !== null ? `${tooltipData.target.toLocaleString()} kcal` : '—'}
          </div>
        </TooltipWithBounds>
      )}

      <div className="mt-2 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 目標内
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> 超過
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-3 border-t border-dashed border-neutral-500" />{' '}
          目標ライン
        </span>
      </div>
    </div>
  );
}
