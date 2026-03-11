import type { RefObject } from "react";
import { Analyser, getDestination } from "tone/build/esm/index";

/**
 * Creates a frequency analyzer and connects it to Tone.Destination
 */
export function createFrequencyAnalyzer(
  analyzer: RefObject<Analyser | null>,
  size: number = 512,
  type: "fft" | "waveform" = "fft",
): void {
  if (analyzer.current) {
    disposeFrequencyAnalyzer(analyzer);
  }

  analyzer.current = new Analyser(type, size);
  getDestination().connect(analyzer.current);
}

/**
 * Disposes the frequency analyzer and disconnects it from Tone.Destination.
 * Handles errors gracefully to prevent crashes during cleanup.
 */
export function disposeFrequencyAnalyzer(
  analyzer: RefObject<Analyser | null>,
): void {
  if (analyzer.current) {
    try {
      getDestination().disconnect(analyzer.current);
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
