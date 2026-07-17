import { useEffect } from "react";
import type { SceneId } from "@haus/bridge";
import { useSession, type SessionController } from "@haus/bridge-react";

import { createMetronome, type Metronome } from "./metronome";

const SCENES: SceneId[] = [0, 1, 2, 3];

type AppProps = {
  controller: SessionController;
};

function App({ controller }: AppProps) {
  const { state, peers, isConductor, play, stop, setBpm, setScene } =
    useSession(controller);
  const peerCount = peers.length + 1;

  // The session is connected from load, but the AudioContext (autoplay
  // policy) exists only after a user gesture. Any pointerdown qualifies -
  // pressing play covers a fresh start, and any click at all covers joining
  // a session that is already mid-playback. The metronome follows the
  // controller directly (not the render cycle): audio scheduling has no
  // reason to wait for React.
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let metronome: Metronome | null = null;
    function startAudio(): void {
      ctx = new AudioContext();
      void ctx.resume();
      metronome = createMetronome(ctx);
      metronome.update(controller.getSnapshot().state);
    }
    window.addEventListener("pointerdown", startAudio, { once: true });
    const unsubscribe = controller.subscribe(() => {
      metronome?.update(controller.getSnapshot().state);
    });
    return () => {
      window.removeEventListener("pointerdown", startAudio);
      unsubscribe();
      metronome?.dispose();
      void ctx?.close();
    };
  }, [controller]);

  const bpm = Math.round(state.bpm);

  return (
    <main className="app">
      <h1 className="wordmark">pulse</h1>

      <div className="controls">
        <button
          type="button"
          className="transport"
          data-playing={state.playing}
          onClick={() => (state.playing ? stop() : play())}
        >
          {state.playing ? "stop" : "play"}
        </button>

        <div className="tempo">
          <button
            type="button"
            aria-label="tempo down"
            onClick={() => setBpm(bpm - 1)}
          >
            -
          </button>
          <output className="bpm" aria-label="tempo">
            {bpm}
          </output>
          <button
            type="button"
            aria-label="tempo up"
            onClick={() => setBpm(bpm + 1)}
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
              onClick={() => setScene(scene)}
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
