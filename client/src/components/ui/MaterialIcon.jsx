export default function MaterialIcon({
  name,
  className = "",
  filled = false,
  style: styleProp,
  ...rest
}) {
  const style = filled
    ? { fontVariationSettings: "'FILL' 1", ...styleProp }
    : styleProp;
  return (
    <span className={`material-symbols-outlined ${className}`.trim()} style={style} {...rest}>
      {name}
    </span>
  );
}
