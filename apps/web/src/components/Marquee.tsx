export function Marquee({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="marquee" aria-label="Announcement">
      <div className="marquee-track">
        <span className="marquee-text">{text}</span>
        <span className="marquee-text" aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
