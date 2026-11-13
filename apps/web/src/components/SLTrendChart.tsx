import type { IntervalBucket } from "../types";

interface Props {
  data: IntervalBucket[];
  height?: number;
}

export function SLTrendChart({ data, height = 180 }: Props) {
  if (data.length < 2) return <div className="chart-empty">No interval data</div>;

  const width = 600;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yMin = 0;
  const yMax = 100;
  const yRange = yMax - yMin;
  const yTicks = [0, 25, 50, 75, 100];

  const xScale = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
  const yScale = (v: number) => pad.top + plotH - ((v - yMin) / yRange) * plotH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.serviceLevelPct)}`).join(" ");
  const areaPoints = `${xScale(0)},${yScale(0)} ${points} ${xScale(data.length - 1)},${yScale(0)}`;

  const labelInterval = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Service Level by Interval</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="sl-trend-chart" preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} y1={yScale(t)} x2={width - pad.right} y2={yScale(t)} stroke="var(--line)" strokeWidth="0.5" />
            <text x={pad.left - 6} y={yScale(t) + 4} textAnchor="end" fill="var(--muted)" fontSize="9">{t}%</text>
          </g>
        ))}
        <polygon points={areaPoints} fill="var(--accent)" opacity="0.08" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(d.serviceLevelPct)} r="3" fill="var(--accent)" stroke="var(--bg-elevated)" strokeWidth="1.5" />
        ))}
        <line x1={pad.left} y1={yScale(85)} x2={width - pad.right} y2={yScale(85)} stroke="var(--ok)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
        <text x={width - pad.right + 4} y={yScale(85) + 3} fill="var(--ok)" fontSize="8" opacity="0.7">Target</text>
        {data.map((d, i) => i % labelInterval === 0 ? (
          <text key={i} x={xScale(i)} y={height - 6} textAnchor="middle" fill="var(--muted)" fontSize="8">{d.label}</text>
        ) : null)}
      </svg>
    </div>
  );
}
