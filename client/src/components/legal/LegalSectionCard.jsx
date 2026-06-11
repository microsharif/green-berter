export function LegalSectionTitle({
  children,
  as: Tag = "h2",
  size = "lg",
  className = "",
}) {
  const sizeClasses = {
    lg: "text-xl md:text-2xl",
    md: "text-lg md:text-xl",
    sm: "text-base md:text-lg",
  };

  return (
    <Tag
      className={`font-headline ${sizeClasses[size]} font-bold text-on-primary-fixed-variant bg-primary-fixed/25 px-5 py-4 md:px-6 md:py-4 ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

export function LegalSectionBody({ children, className = "" }) {
  return (
    <div
      className={`space-y-4 bg-surface-container-lowest px-5 py-5 md:px-6 md:py-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function LegalSectionCard({
  id,
  title,
  titleAs = "h2",
  titleSize = "lg",
  children,
  className = "",
}) {
  return (
    <article
      id={id}
      className={`scroll-mt-36 overflow-hidden rounded-xl border-2 border-primary/35 bg-surface-container-low editorial-shadow ${className}`.trim()}
    >
      <LegalSectionTitle as={titleAs} size={titleSize}>
        {title}
      </LegalSectionTitle>
      <LegalSectionBody>{children}</LegalSectionBody>
    </article>
  );
}

export function LegalSubsectionCard({ id, title, children, className = "" }) {
  return (
    <div id={id} className={`space-y-3 ${className}`.trim()}>
      <h3 className="font-headline text-lg md:text-xl font-bold text-on-surface">
        {title}
      </h3>
      {children}
    </div>
  );
}
