const variants = {
  give: "bg-primary-fixed text-on-primary-fixed",
  exchange: "bg-secondary-fixed text-on-secondary-fixed",
  exchangeAlt:
    "bg-secondary-container text-on-secondary-container",
  giveAlt: "bg-primary-fixed text-on-primary-fixed-variant",
  neutral: "bg-surface-container-high text-on-surface-variant",
  compactGive: "bg-primary text-white",
  compactExchange: "bg-secondary text-white",
};

export default function ProductBadge({
  children,
  variant = "give",
  className = "",
}) {
  const base =
    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider";
  return (
    <span className={`${base} ${variants[variant] || variants.give} ${className}`.trim()}>
      {children}
    </span>
  );
}
