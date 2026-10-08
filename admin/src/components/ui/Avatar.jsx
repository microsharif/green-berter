import { initials, resolveMediaUrl } from "../../utils/format.js";

export default function Avatar({ name, src, size = 40 }) {
  const url = resolveMediaUrl(src);
  const dim = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "avatar"}
        style={dim}
        className="shrink-0 rounded-full object-cover ring-1 ring-surface-border"
      />
    );
  }
  return (
    <div
      style={dim}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 ring-1 ring-surface-border"
    >
      {initials(name)}
    </div>
  );
}
