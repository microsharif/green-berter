import MaterialIcon from "./MaterialIcon.jsx";

export default function StatCard({ label, value, icon, hint, tone = "primary" }) {
  const tones = {
    primary: "bg-primary-50 text-primary-600",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    ink: "bg-ink/5 text-ink-soft",
  };
  return (
    <div className="admin-card flex items-center gap-4 p-5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone] ?? tones.primary}`}
      >
        <MaterialIcon name={icon} className="text-[26px]" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        <p className="font-display text-2xl font-bold text-ink">{value}</p>
        {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      </div>
    </div>
  );
}
