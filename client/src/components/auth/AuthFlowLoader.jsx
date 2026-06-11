/**
 * Full-bleed overlay for the parent (set `className="relative"` on parent).
 */
export default function AuthFlowLoader({ active, label }) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface-bright/90 dark:bg-zinc-950/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-hidden
      />
      <span className="text-sm font-semibold text-on-surface text-center px-4">
        {label}
      </span>
    </div>
  );
}
