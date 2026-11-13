interface Props {
  value: number;
  max?: number;
  label: string;
  size?: number;
  thresholds?: { warn: number; bad: number };
}

export function Gauge({ value, max = 100, label, size = 100, thresholds }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (pct / 100) * circumference;

  let tone = "ok";
  if (thresholds) {
    if (value < thresholds.bad) tone = "bad";
    else if (value < thresholds.warn) tone = "warn";
  }

  return (
    <div className={`gauge gauge-${tone}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="gauge-svg">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          className="gauge-arc"
          strokeWidth="8"
          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="gauge-inner">
        <span className="gauge-value">{typeof value === "number" && !isNaN(value) ? `${Math.round(value * 10) / 10}%` : "—"}</span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}
