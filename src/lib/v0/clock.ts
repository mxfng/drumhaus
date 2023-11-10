// This is a central clock so that different modules will all use the same timing. Takes tempo and numberOfBeats.
export default class Clock {
  tempo: number;
  numberOfBeats: number;
  handlers: ((now: number, beat: number, bar: number) => void)[];
  beat: number;
  bar: number;
  start: number;
  audioContext: AudioContext;

  constructor(options: {
    tempo: number;
    numberOfBeats: number;
    audioContext: AudioContext;
  }) {
    this.tempo = options.tempo;
    this.numberOfBeats = options.numberOfBeats;
    this.handlers = [];
    this.beat = -1;
    this.bar = 0;
    this.audioContext = options.audioContext;
    this.start = this.audioContext.currentTime;
    this._tick = this.tick.bind(this);
    this._tick();
  }

  startClock() {
    console.log("startClock");
    this._tick();
  }

  add(fn: (now: number, beat: number, bar: number) => void) {
    this.handlers.push(fn);
  }

  tick() {
    const now = this.audioContext.currentTime;
    const time = now - this.start;
    const currentBeat = Math.floor((time * this.tempo) / 60);

    if (currentBeat >= this.numberOfBeats) {
      this.start = now;
      this.beat = 0;
      this.bar++;
      this.trigger(now);
    } else if (this.beat < currentBeat) {
      this.beat = currentBeat;
      this.trigger(now);
    }

    setTimeout(this._tick, 0);
  }

  trigger(now: number) {
    this.handlers.forEach((fn) => {
      fn(now, this.beat, this.bar);
    });
  }

  private _tick: () => void;
}
