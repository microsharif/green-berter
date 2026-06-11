export default function SectionIntro({
  eyebrow,
  title,
  subtitle,
  className = "",
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <span className="text-primary font-bold tracking-widest uppercase text-xs">
          {eyebrow}
        </span>
      ) : null}
      {title ? <h2 className="text-4xl font-bold mt-2">{title}</h2> : null}
      {subtitle ? (
        <p className="text-on-surface-variant mt-2 max-w-2xl">{subtitle}</p>
      ) : null}
    </div>
  );
}
