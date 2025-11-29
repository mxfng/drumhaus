export const DrumhausLogo: React.FC<{ color?: string; size: number }> = ({
  color = "currentColor",
  size = 200,
}) => {
  // Actual logo bounds: x: 51.9-148.9, y: 46.4-161.1
  const viewBoxWidth = 97;
  const viewBoxHeight = 115;
  const actualHeight = (size * viewBoxHeight) / viewBoxWidth;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={actualHeight}
      fill={color}
      viewBox="51.9 46.4 97 115"
      style={{ display: "block" }}
    >
      <path d="M51.9 46.4h73a24 24 0 0 1 24 24v32H76c-13.3 0-24-10.6-24-24v-8zM51.9 161.1h73a24 24 0 0 0 24-24v-31.9H76c-13.3-.1-24 10.6-24 23.9v8z" />
    </svg>
  );
};
