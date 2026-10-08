import { titleCase } from "../../utils/format.js";

// Status → visual tone mapping shared across users and listings.
const TONES = {
  // user + listing statuses
  active: "bg-primary-50 text-primary-700 ring-primary-200",
  available: "bg-primary-50 text-primary-700 ring-primary-200",
  completed: "bg-primary-50 text-primary-700 ring-primary-200",
  accepted: "bg-info/10 text-info ring-info/20",
  pending: "bg-warning/10 text-warning ring-warning/20",
  submitted: "bg-warning/10 text-warning ring-warning/20",
  disabled: "bg-ink-faint/15 text-ink-soft ring-ink-faint/30",
  cancelled: "bg-ink-faint/15 text-ink-soft ring-ink-faint/30",
  suspended: "bg-warning/10 text-warning ring-warning/20",
  banned: "bg-danger/10 text-danger ring-danger/20",
  rejected: "bg-danger/10 text-danger ring-danger/20",
  deleted: "bg-danger/10 text-danger ring-danger/20",
  give: "bg-info/10 text-info ring-info/20",
  exchange: "bg-primary-50 text-primary-700 ring-primary-200",
};

export default function Badge({ value, label, tone }) {
  const key = String(value ?? "").toLowerCase();
  const cls = tone ?? TONES[key] ?? "bg-ink-faint/15 text-ink-soft ring-ink-faint/30";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${cls}`}
    >
      {label ?? titleCase(value)}
    </span>
  );
}
