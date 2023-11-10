// Triggers a sample
export function sample() {
  // Update the path to your sample in the public folder
  const audioFileUrl = "/samples/909_kick.wav";

  // Use the next/audio context
  const context = new window.AudioContext();

  // Use fetch API to load the audio file
  fetch(audioFileUrl)
    .then((response) => response.arrayBuffer())
    .then((data) => {
      return new Promise<AudioBuffer>((resolve, reject) => {
        // Decode the audio data
        context.decodeAudioData(
          data,
          (audioBuffer) => resolve(audioBuffer),
          reject
        );
      });
    })
    .then((audio) => {
      // Create a buffer source and play the audio
      const buffer = context.createBufferSource();
      buffer.connect(context.destination);
      buffer.buffer = audio;
      buffer.start(0);
    })
    .catch((error) => console.error("Error loading audio:", error));
}
