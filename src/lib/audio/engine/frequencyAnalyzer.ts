import type { MutableRefObject } from "react";
import * as Tone from "tone/build/esm/index";

/**
 * Creates a frequency analyzer and connects it to Tone.Destination
 */
export function createFrequencyAnalyzer(
  analyzer: MutableRefObject<Tone.Analyser | null>,
  size: number = 512,
  type: "fft" | "waveform" = "fft",
): void {
  if (analyzer.current) {
    disposeFrequencyAnalyzer(analyzer);
  }

  analyzer.current = new Tone.Analyser(type, size);
  Tone.Destination.connect(analyzer.current);
}

/**
 * Disposes the frequency analyzer and disconnects it from Tone.Destination.
 * Handles errors gracefully to prevent crashes during cleanup.
 */
export function disposeFrequencyAnalyzer(
  analyzer: MutableRefObject<Tone.Analyser | null>,
): void {
  if (analyzer.current) {
    try {
      Tone.Destination.disconnect(analyzer.current);
    } catch (error) {
      // Disconnection may fail if already disconnected or destination changed
      console.warn("Error disconnecting analyzer from destination:", error);
    }

    try {
      analyzer.current.dispose();
    } catch (error) {
      console.warn("Error disposing analyzer:", error);
    }

    analyzer.current = null;
  }
}
