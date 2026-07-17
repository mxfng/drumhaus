import { createLayoutScale } from "@/design/shell";

/**
 * Drumhaus's layout-scale instance.
 *
 * The design box is the single source of truth for the app's geometry: the
 * chassis is 90rem x 56.25rem (w-360 x h-225 in Tailwind, 1440x900px) with
 * 2.5rem header and footer rows and a 5rem minimum margin when fitting to
 * screen. The shell injects these numbers as CSS variables and derives the
 * fit-to-screen math from them.
 */
const layoutScale = createLayoutScale({
  designBox: {
    widthRem: 90,
    heightRem: 56.25,
    headerHeightRem: 2.5,
    footerHeightRem: 2.5,
    paddingRem: 5,
  },
});

export { layoutScale };
