import { extendTheme } from "@chakra-ui/react";
import "../theme/fonts.css";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: "red",
      },
    },
  },
  colors: {
    brown: "#000000", // slot titles
    gray: "#B09374", // text colors
    silver: "#F7F1EA", // background
    darksilver: "#d4cdc5", // lowlight background
    darkorange: "#ff7b00", // highlight orange
  },
});

export default theme;
