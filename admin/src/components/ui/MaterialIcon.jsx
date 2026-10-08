export default function MaterialIcon({ name, className = "", style }) {
  return (
    <span
      className={`material-symbols-rounded select-none ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
