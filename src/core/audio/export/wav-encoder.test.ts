import { describe, expect, it } from "vitest";

import { encodeWav } from "./wav-encoder";

/**
 * Minimal structural stand-in for AudioBuffer (not constructible in node).
 * Covers exactly the properties encodeWav reads.
 */
function makeMockAudioBuffer(
  channels: Float32Array[],
  sampleRate: number,
): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length,
    duration: length / sampleRate,
    getChannelData: (channel: number) => channels[channel],
  } as unknown as AudioBuffer;
}

function readAscii(view: DataView, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(view.getUint8(offset + i));
  }
  return out;
}

describe("encodeWav", () => {
  it("writes a valid RIFF/WAVE 16-bit PCM header", () => {
    const sampleRate = 44100;
    const numSamples = 100;
    const buffer = encodeWav(
      makeMockAudioBuffer(
        [new Float32Array(numSamples), new Float32Array(numSamples)],
        sampleRate,
      ),
    );
    const view = new DataView(buffer);

    const numChannels = 2;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = numSamples * blockAlign;

    expect(readAscii(view, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8);
    expect(readAscii(view, 8, 4)).toBe("WAVE");
    expect(readAscii(view, 12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16); // fmt chunk size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(numChannels);
    expect(view.getUint32(24, true)).toBe(sampleRate);
    expect(view.getUint32(28, true)).toBe(sampleRate * blockAlign);
    expect(view.getUint16(32, true)).toBe(blockAlign);
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(readAscii(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(dataSize);
  });

  it("produces the correct total byte length", () => {
    const numSamples = 123;
    const mono = encodeWav(
      makeMockAudioBuffer([new Float32Array(numSamples)], 22050),
    );
    expect(mono.byteLength).toBe(44 + numSamples * 2);

    const stereo = encodeWav(
      makeMockAudioBuffer(
        [new Float32Array(numSamples), new Float32Array(numSamples)],
        22050,
      ),
    );
    expect(stereo.byteLength).toBe(44 + numSamples * 2 * 2);
  });

  it("round-trips a known ramp within 16-bit quantization error", () => {
    const numSamples = 201;
    const ramp = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      ramp[i] = -1 + (2 * i) / (numSamples - 1); // -1 .. +1
    }

    const buffer = encodeWav(makeMockAudioBuffer([ramp], 44100));
    const view = new DataView(buffer);

    // Encoder scales negatives by 0x8000 and positives by 0x7fff, with
    // DataView truncating toward zero: allow 1 LSB plus float32 error.
    const tolerance = 1 / 0x7fff + 1e-6;
    for (let i = 0; i < numSamples; i++) {
      const int16 = view.getInt16(44 + i * 2, true);
      const decoded = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
      expect(Math.abs(decoded - ramp[i])).toBeLessThanOrEqual(tolerance);
    }
  });

  it("clamps out-of-range samples to full scale", () => {
    const buffer = encodeWav(
      makeMockAudioBuffer([new Float32Array([2.0, -3.0, 1.0, -1.0])], 44100),
    );
    const view = new DataView(buffer);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
    expect(view.getInt16(48, true)).toBe(0x7fff);
    expect(view.getInt16(50, true)).toBe(-0x8000);
  });

  it("interleaves stereo channels sample by sample", () => {
    const left = new Float32Array([0.5, 0.5]);
    const right = new Float32Array([-0.5, -0.5]);
    const buffer = encodeWav(makeMockAudioBuffer([left, right], 44100));
    const view = new DataView(buffer);

    // L0 R0 L1 R1
    expect(view.getInt16(44, true)).toBeGreaterThan(0);
    expect(view.getInt16(46, true)).toBeLessThan(0);
    expect(view.getInt16(48, true)).toBeGreaterThan(0);
    expect(view.getInt16(50, true)).toBeLessThan(0);
  });
});
