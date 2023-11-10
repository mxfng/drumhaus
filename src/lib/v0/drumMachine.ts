import Clock from "./clock";
import Drum from "./drum";

export default class DrumMachine {
  drums: Record<string, Drum>;
  clock: Clock;
  basePath: string;
  instruments: Record<string, string>;
  pattern: Record<string, { hits: string[]; velocities: number[] }>;
  readyCount: number = 0;
  totalCount: number = 0;
  audioContext: AudioContext;
  isPlaying: boolean = false;

  constructor(options: {
    clock: Clock;
    basePath: string;
    instruments: Record<string, string>;
    pattern: Record<string, { hits: string[]; velocities: number[] }>;
    audioContext: AudioContext;
  }) {
    this.drums = {};
    this.clock = options.clock;
    this.basePath = options.basePath;
    this.instruments = options.instruments;
    this.pattern = options.pattern;
    this.audioContext = options.audioContext;
    this.load();
  }

  private load() {
    this.readyCount = 0;
    this.totalCount = Object.keys(this.instruments).length;

    for (const name in this.instruments) {
      const path = this.instruments[name];
      const url = this.basePath + path;
      this.drums[name] = new Drum(this.audioContext);
      this.drums[name].load(url, this.loaded.bind(this));
    }
  }

  private loaded() {
    this.readyCount++;
  }

  private play(_now: number, beat: number) {
    for (const instrument in this.pattern) {
      const currentPattern = this.pattern[instrument];
      const hitType = currentPattern.hits[beat];
      const velocity = currentPattern.velocities[beat] || 1; // Default to 1 if velocity is not provided

      if (beat < currentPattern.hits.length && hitType === "x") {
        this.drums[instrument].play(velocity);
      }
    }
  }

  startPlayback() {
    console.log("startPlayback");
    if (this.readyCount === this.totalCount) {
      this.clock.add(this.play.bind(this));
    }
  }

  stopPlayback() {
    this.isPlaying = false;
    // Optionally, stop any ongoing audio playback
    for (const name in this.drums) {
      this.drums[name].stop();
    }
  }
}
