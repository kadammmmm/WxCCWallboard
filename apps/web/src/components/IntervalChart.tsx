import type { IntervalBucket } from "../types";

interface Props {
  data: IntervalBucket[];
  height?: number;
}

export function IntervalChart({ data, height = 160 }: Props) {
  if (data.length === 0) return <div className="chart-empty">No interval data</div>;

  const width = 600;
  const pad = { top: 16, right: 20, bottom: 30, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.offered, d.handled + d.abandoned)));
  const barGroupWidth = plotW / data.length;
  const barWidth = Math.max(2, barGroupWidth * 0.28);
  const gap = 1;

  const yScale = (v: number) => pad.top + plotH - (v / maxVal) * plotH;
  const yTicks = [0, Math.round(maxVal / 2), maxVal];
  const labelInterval = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Volume by Interval</h3>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: "var(--accent)" }} />Offered</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: "var(--ok)" }} />Handled</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: "var(--bad)" }} />Abandoned</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="interval-chart" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} y1={yScale(t)} x2={width - pad.right} y2={yScale(t)} stroke="var(--line)" strokeWidth="0.5" />
            <text x={pad.left - 6} y={yScale(t) + 4} textAnchor="end" fill="var(--muted)" fontSize="9">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + i * barGroupWidth + barGroupWidth / 2;
          return (
            <g key={i}>
              <rect x={cx - barWidth * 1.5 - gap} y={yScale(d.offered)} width={barWidth} height={Math.max(0, plotH + pad.top - yScale(d.offered))} rx="1.5" fill="var(--accent)" opacity="0.85" />
              <rect x={cx - barWidth / 2} y={yScale(d.handled)} width={barWidth} height={Math.max(0, plotH + pad.top - yScale(d.handled))} rx="1.5" fill="var(--ok)" opacity="0.85" />
              <rect x={cx + barWidth / 2 + gap} y={yScale(d.abandoned)} width={barWidth} height={Math.max(0, plotH + pad.top - yScale(d.abandoned))} rx="1.5" fill="var(--bad)" opacity="0.85" />
              {i % labelInterval === 0 && (
                <text x={cx} y={height - 6} textAnchor="middle" fill="var(--muted)" fontSize="8">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
