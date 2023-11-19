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
});

export default theme;
