import type { Alert } from "../types";

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  const critical = alerts.filter((a) => a.severity === "critical");
  const warn = alerts.filter((a) => a.severity === "warn");

  return (
    <div className="alert-banner" role="alert">
      {critical.length > 0 && (
        <div className="alert-row critical">
          <span className="alert-icon">!</span>
          <div className="alert-messages">
            {critical.map((a) => <span key={a.id} className="alert-msg">{a.message}</span>)}
          </div>
        </div>
      )}
      {warn.length > 0 && (
        <div className="alert-row warn">
          <span className="alert-icon">!</span>
          <div className="alert-messages">
            {warn.map((a) => <span key={a.id} className="alert-msg">{a.message}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
