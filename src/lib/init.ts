import { Sample } from "@/types/types";
import * as Tone from "tone/build/esm/index";

// __Initialization__
// Define initial sample URLs
const samples: { name: string; url: string }[] = [
  { name: "Kick", url: "kick/debug_kick.wav" },
  { name: "Kick2", url: "kick2/debug_kick2.wav" },
  { name: "Snare", url: "snare/debug_snare.wav" },
  { name: "Clap", url: "clap/debug_clap.wav" },
  { name: "Hat", url: "hat/debug_hat.wav" },
  { name: "OHat", url: "ohat/debug_ohat.wav" },
  { name: "Bell", url: "bell/debug_bell.wav" },
  { name: "Crash", url: "crash/debug_crash.wav" },
];

// Create initial Drumhaus sampler objects
export const _samples: Sample[] = samples.map((sample, id) => {
  const filter = new Tone.Filter(0, "highpass");
  const envelope = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
  const panner = new Tone.Panner(0);

  const sampler = new Tone.Sampler({
    urls: {
      ["C2"]: sample.url,
    },
    baseUrl: "/samples/",
    onload: () => {
      console.log(`DHSampler created for ${sample.name}`);
    },
  }).chain(envelope, filter, panner, Tone.Destination);

  return {
    id: id,
    name: sample.name,
    url: sample.url,
    sampler: sampler,
    envelope: envelope,
    filter: filter,
    panner: panner,
  };
});

// Create initial global parameters
export const _bpm = 100;
export const _swing = 0;
export const _masterVolume = 90;
export const _sequences = Array(8).fill(Array(16).fill(false));

// Create initial arrays of slot parameters
export const _attacks = [0, 0, 0, 0, 0, 0, 0, 0];
export const _releases = [10, 10, 10, 10, 10, 100, 40, 100];
export const _filters = [50, 50, 50, 50, 50, 50, 50, 50];
export const _volumes = [92, 92, 92, 92, 92, 92, 92, 70];
export const _pans = [50, 50, 50, 50, 50, 50, 50, 50];
export const _solos = [false];
export const _mutes = [false];
