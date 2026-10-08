import Breadcrumbs from "./Breadcrumbs.jsx";

export default function PageHeader({ title, subtitle, trail, actions }) {
  return (
    <div className="mb-6">
      <Breadcrumbs trail={trail} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
