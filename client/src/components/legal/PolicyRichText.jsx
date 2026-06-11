export function PolicyRichInline({ parts }) {
  if (typeof parts === "string") return parts;

  return parts.map((part, index) =>
    part.bold ? (
      <strong
        key={`${part.text}-${index}`}
        className="font-semibold text-on-surface"
      >
        {part.text}
      </strong>
    ) : (
      <span key={`${part.text}-${index}`}>{part.text}</span>
    )
  );
}

export function PolicyRichText({ parts, className = "" }) {
  if (typeof parts === "string") {
    return (
      <p
        className={`text-base md:text-lg text-on-surface-variant leading-relaxed ${className}`.trim()}
      >
        {parts}
      </p>
    );
  }

  return (
    <p
      className={`text-base md:text-lg text-on-surface-variant leading-relaxed ${className}`.trim()}
    >
      <PolicyRichInline parts={parts} />
    </p>
  );
}

export function PolicyBulletList({ items, className = "" }) {
  return (
    <ul
      className={`list-disc space-y-2 pl-6 md:pl-8 text-base md:text-lg text-on-surface-variant ${className}`.trim()}
    >
      {items.map((item, index) => (
        <li key={bulletKey(item, index)} className="leading-relaxed">
          <PolicyRichInline parts={item} />
        </li>
      ))}
    </ul>
  );
}

function bulletKey(item, index) {
  if (typeof item === "string") return item.slice(0, 40) || index;
  return item.map((part) => part.text).join("").slice(0, 40) || index;
}

export function paragraphKey(parts) {
  if (typeof parts === "string") return parts.slice(0, 48);
  return parts.map((part) => part.text).join("").slice(0, 48);
}
