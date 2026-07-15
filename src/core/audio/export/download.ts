// --- Shared browser-download trigger for export payloads ---

/**
 * Triggers a browser download of a binary payload via a temporary object
 * URL and anchor click. Shared by the WAV, MIDI, and stem exporters.
 */
function triggerBlobDownload(
  data: ArrayBuffer | Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { triggerBlobDownload };
