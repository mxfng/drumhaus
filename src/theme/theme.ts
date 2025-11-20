import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    brown: "#000000", // instrument titles
    gray: "#B09374", // text colors
    silver: "#F7F1EA", // background
    darksilver: "#d4cdc5", // lowlight background
    silver2: "#E8E3DD",
    darkorange: "#ff7b00", // highlight orange
    darkorangehover: "#f5b67a",
  },
  components: {
    Text: {
      baseStyle: {
        cursor: "default !important",
      },
    },
  },
});

export default theme;
