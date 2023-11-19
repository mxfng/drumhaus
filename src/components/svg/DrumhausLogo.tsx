export const DrumhausLogo: React.FC<{ color: string; size: number }> = ({
  color,
  size,
}) => {
  return (
    <>
      <svg
        height={size}
        width={size}
        fill={color}
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          id="rect4"
          d="m 51.892319,46.433662 h 73.084391 c 13.27703,0 23.96576,10.688731 23.96576,23.965764 v 8.088443 23.884011 l -73.095575,0.0817 C 62.56987,102.46848 51.881132,91.764902 51.881132,78.487869 v -8.088443 z"
        />
        <path
          id="rect4-4"
          d="m 51.89232,161.13925 h 73.08439 c 13.27703,0 23.96576,-10.68873 23.96576,-23.96576 v -8.08844 -23.88401 l -73.095574,-0.0817 c -13.277026,-0.0149 -23.965763,10.68868 -23.965763,23.96571 v 8.08844 z"
        />
      </svg>
    </>
  );
};