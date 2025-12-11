/**
 * Normalizes an audio file path to a waveform cache key.
 * Strips leading slashes, removes /samples/ prefix, and removes file extension.
 *
 * @example
 * normalizeSamplePath("/samples/kit-name/kick.wav") => "kit-name/kick"
 * normalizeSamplePath("samples/kit-name/snare.wav") => "kit-name/snare"
 */
export function normalizeSamplePath(audioFile: string): string {
  const normalizedPath = audioFile
    .replace(/^\/+/, "")
    .replace(/^samples\//, "");
  return normalizedPath.replace(/\.[^.]+$/, "");
}
