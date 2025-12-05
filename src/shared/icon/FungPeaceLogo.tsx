interface FungPeaceLogoProps extends React.SVGProps<SVGSVGElement> {
  size: number;
}
export const FungPeaceLogo: React.FC<FungPeaceLogoProps> = ({
  stroke = "currentColor",
  size = 200,
  ...props
}) => {
  // Actual logo bounds: x: 51.9-148.9, y: 46.4-161.1
  const viewBoxWidth = 1545;
  const viewBoxHeight = 426;
  const actualHeight = (size * viewBoxHeight) / viewBoxWidth;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={actualHeight}
      viewBox="0 0 1545 426"
      style={{ display: "block" }}
      {...props}
    >
      <path
        stroke={stroke}
        strokeMiterlimit="10"
        strokeWidth="20"
        d="m214 50 152 355H62zm0-51L32 425h364z"
      />
      <g fill="none" stroke={stroke} strokeMiterlimit="10" strokeWidth="20">
        <path d="M214 30v379M214 211 73 352M214 211l144 146" />
      </g>
      <path
        stroke={stroke}
        strokeMiterlimit="10"
        strokeWidth="20"
        d="M739 19a192 192 0 0 1 193 193 192 192 0 0 1-193 193 192 192 0 0 1-193-193A192 192 0 0 1 739 19m0-20a213 213 0 1 0 0 426 213 213 0 0 0 0-426"
      />
      <g fill="none" stroke={stroke} strokeMiterlimit="10" strokeWidth="20">
        <path d="M739-1v410M739 211 588 362M739 211l144 146" />
      </g>
      <path
        stroke={stroke}
        strokeMiterlimit="10"
        strokeWidth="20"
        d="M1509 35v355h-355V35zm20-20h-395v395h395z"
      />
      <g fill="none" stroke={stroke} strokeMiterlimit="10" strokeWidth="20">
        <path d="M1332 20v389M1332 211l-182 182M1332 211l181 183" />
      </g>
    </svg>
  );
};
