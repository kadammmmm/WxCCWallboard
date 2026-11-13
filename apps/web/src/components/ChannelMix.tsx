import type { ChannelType, WallboardSnapshot } from "../types";

function channelLabel(c: ChannelType): string {
  const map: Record<ChannelType, string> = { telephony: "Voice", chat: "Chat", email: "Email", social: "Social", other: "Other" };
  return map[c] || "Other";
}

export function ChannelMix({ snapshot }: { snapshot: WallboardSnapshot }) {
  const total = snapshot.channels.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <section className="panel" aria-label="Channel mix">
      <h2>Channels</h2>
      <ul className="channel-list">
        {snapshot.channels.map((c) => (
          <li key={c.channel}>
            <div className="channel-row">
              <span className="channel-row-label">{channelLabel(c.channel)}</span>
              <span className="channel-row-value">{c.count}</span>
            </div>
            <div className="bar-track">
              <div className={`bar-fill channel-${c.channel}`} style={{ width: `${(c.count / total) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {snapshot.channels.length > 0 && (
        <div className="channel-donut-container">
          <svg viewBox="0 0 100 100" className="channel-donut">
            {(() => {
              let offset = 0;
              const radius = 38;
              const circumference = 2 * Math.PI * radius;
              return snapshot.channels.map((c) => {
                const pct = c.count / total;
                const dashLength = pct * circumference;
                const el = (
                  <circle key={c.channel} cx="50" cy="50" r={radius} fill="none"
                    className={`donut-segment channel-${c.channel}`}
                    strokeWidth="12" strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                    strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
                );
                offset += dashLength;
                return el;
              });
            })()}
          </svg>
          <span className="donut-center">{total}</span>
        </div>
      )}
    </section>
  );
}
