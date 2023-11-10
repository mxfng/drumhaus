export default class Drum {
  audio!: AudioBuffer;
  audioContext: AudioContext;
  currentSource: AudioBufferSourceNode | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async load(url: string, done: () => void) {
    const drum = this;

    try {
      const response = await fetch(url);
      const data = await response.arrayBuffer();

      this.audioContext.decodeAudioData(data, function (audio) {
        drum.audio = audio;
        done();
      });
    } catch (error) {
      console.error("Error loading audio:", error);
    }
  }

  play(velocity: number = 1) {
    this.stop(); // Stop any ongoing playback before starting a new one

    const buffer = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    buffer.buffer = this.audio;
    gainNode.gain.value = velocity;

    buffer.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    buffer.start(0);
    this.currentSource = buffer; // Save the current source for potential stopping
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }
}
