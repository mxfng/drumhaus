import { useEffect } from "react";
import type { SceneId } from "@haus/bridge";
import { useSession, type SessionController } from "@haus/bridge-react";
import { Button, cn } from "@haus/ui";

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
    <main className="app flex h-full flex-col items-center justify-between px-8 py-12">
      <h1 className="wordmark font-pixel text-primary indent-[0.5em] text-xl tracking-[0.5em]">
        pulse
      </h1>

      <div className="controls neu-medium-raised surface flex flex-col items-center gap-10 rounded-xl border p-10">
        <Button
          type="button"
          variant="hardware"
          size="lg"
          className={cn(
            "transport w-36 indent-[0.3em] tracking-[0.3em]",
            state.playing && "border-primary text-primary border-2",
          )}
          data-playing={state.playing}
          onClick={() => (state.playing ? stop() : play())}
        >
          {state.playing ? "stop" : "play"}
        </Button>

        <div className="tempo flex items-center gap-6">
          <Button
            type="button"
            variant="hardware"
            size="icon-lg"
            aria-label="tempo down"
            onClick={() => setBpm(bpm - 1)}
          >
            -
          </Button>
          <output
            className="bpm bg-screen text-screen-foreground shadow-inset font-pixel min-w-28 rounded-xl px-4 py-2 text-center text-4xl tabular-nums"
            aria-label="tempo"
          >
            {bpm}
          </output>
          <Button
            type="button"
            variant="hardware"
            size="icon-lg"
            aria-label="tempo up"
            onClick={() => setBpm(bpm + 1)}
          >
            +
          </Button>
        </div>

        <div className="scenes flex gap-3" role="group" aria-label="scene">
          {SCENES.map((scene) => (
            <Button
              key={scene}
              type="button"
              variant="hardware"
              size="icon-lg"
              aria-label={`scene ${scene}`}
              aria-pressed={state.scene === scene}
              className={cn(
                state.scene === scene && "border-primary text-primary border-2",
              )}
              onClick={() => setScene(scene)}
            >
              {scene}
            </Button>
          ))}
        </div>
      </div>

      <footer className="status text-foreground-muted flex items-center gap-4 text-sm tracking-widest">
        <span className="peers">peers {peerCount}</span>
        <span
          className={cn(
            "conductor size-2 rounded-full border",
            isConductor && "bg-primary border-primary",
          )}
          data-conductor={isConductor}
          title="conductor"
        />
      </footer>
    </main>
  );
}

export { App };
