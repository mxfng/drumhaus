import { useEffect } from "react";
import * as Tone from "tone/build/esm/index";

export const useTransport = (sampler: Tone.Sampler | null) => {
  useEffect(() => {
    const handlePlayClick = async () => {
      if (Tone.Transport.state === "started") {
        Tone.Transport.pause();
        console.log(Tone.Transport.state);
      } else {
        await Tone.start();
        Tone.Transport.start();
        console.log(Tone.Transport.state);
      }
    };

    if (sampler !== null) {
      const playButton = document.getElementById("playButton");

      if (playButton) {
        playButton.addEventListener("click", handlePlayClick);
      }

      return () => {
        if (playButton) {
          playButton.removeEventListener("click", handlePlayClick);
        }
      };
    }
  }, [sampler]);
};
