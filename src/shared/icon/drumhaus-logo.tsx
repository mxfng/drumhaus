interface DrumhausLogoProps extends React.SVGProps<SVGSVGElement> {
  size: number;
  /**
   * When true, renders into a square viewport to avoid bounding-box changes when rotated.
   */
  square?: boolean;
}

export const DrumhausLogo: React.FC<DrumhausLogoProps> = ({
  fill = "currentColor",
  size = 200,
  square = false,
  ...props
}) => {
  // Actual logo bounds: x: 51.9-148.9, y: 46.4-161.1
  const viewBoxWidth = 97;
  const viewBoxHeight = 115;
  const actualHeight = (size * viewBoxHeight) / viewBoxWidth;

  const width = size;
  const height = square ? size : actualHeight;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill={fill}
      viewBox="51.9 46.4 97 115"
      style={{ display: "block" }}
      {...props}
    >
      <path d="M51.9 46.4h73a24 24 0 0 1 24 24v32H76c-13.3 0-24-10.6-24-24v-8zM51.9 161.1h73a24 24 0 0 0 24-24v-31.9H76c-13.3-.1-24 10.6-24 23.9v8z" />
    </svg>
  );
};
