import * as Tone from "tone/build/esm/index";

/**
 * Creates a frequency analyzer and connects it to Tone.Destination
 */
export function createFrequencyAnalyzer(
  analyzer: React.MutableRefObject<Tone.Analyser | null>,
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
 * Disposes the frequency analyzer and disconnects it from Tone.Destination
 */
export function disposeFrequencyAnalyzer(
  analyzer: React.MutableRefObject<Tone.Analyser | null>,
): void {
  if (analyzer.current) {
    Tone.Destination.disconnect(analyzer.current);
    analyzer.current.dispose();
    analyzer.current = null;
  }
}
