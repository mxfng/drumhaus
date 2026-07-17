import { useEffect, useSyncExternalStore } from "react";
import type { SceneId } from "@haus/bridge";

import { createMetronome, type Metronome } from "./metronome";
import type { PulseSession } from "./session";

const SCENES: SceneId[] = [0, 1, 2, 3];

type AppProps = {
  session: PulseSession;
};

function App({ session }: AppProps) {
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const peerCount = useSyncExternalStore(
    session.subscribe,
    session.getPeerCount,
  );
  const isConductor = useSyncExternalStore(
    session.subscribe,
    session.getIsConductor,
  );

  // The session is connected from load, but the AudioContext (autoplay
  // policy) exists only after a user gesture. Any pointerdown qualifies -
  // pressing play covers a fresh start, and any click at all covers joining
  // a session that is already mid-playback.
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let metronome: Metronome | null = null;
    function startAudio(): void {
      ctx = new AudioContext();
      void ctx.resume();
      metronome = createMetronome(ctx);
      metronome.update(session.getState());
    }
    window.addEventListener("pointerdown", startAudio, { once: true });
    const unsubscribe = session.subscribe(() => {
      metronome?.update(session.getState());
    });
    return () => {
      window.removeEventListener("pointerdown", startAudio);
      unsubscribe();
      metronome?.dispose();
      void ctx?.close();
    };
  }, [session]);

  const bpm = Math.round(state.bpm);

  return (
    <main className="app">
      <h1 className="wordmark">pulse</h1>

      <div className="controls">
        <button
          type="button"
          className="transport"
          data-playing={state.playing}
          onClick={() => (state.playing ? session.stop() : session.play())}
        >
          {state.playing ? "stop" : "play"}
        </button>

        <div className="tempo">
          <button
            type="button"
            aria-label="tempo down"
            onClick={() => session.setBpm(bpm - 1)}
          >
            -
          </button>
          <output className="bpm" aria-label="tempo">
            {bpm}
          </output>
          <button
            type="button"
            aria-label="tempo up"
            onClick={() => session.setBpm(bpm + 1)}
          >
            +
          </button>
        </div>

        <div className="scenes" role="group" aria-label="scene">
          {SCENES.map((scene) => (
            <button
              key={scene}
              type="button"
              aria-label={`scene ${scene}`}
              aria-pressed={state.scene === scene}
              onClick={() => session.setScene(scene)}
            >
              {scene}
            </button>
          ))}
        </div>
      </div>

      <footer className="status">
        <span className="peers">peers {peerCount}</span>
        <span
          className="conductor"
          data-conductor={isConductor}
          title="conductor"
        />
      </footer>
    </main>
  );
}

export { App };
