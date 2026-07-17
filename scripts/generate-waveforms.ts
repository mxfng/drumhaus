#!/usr/bin/env tsx
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { WAVEFORM_BUCKET_COUNT } from "../src/core/audio/cache/constants";
import { bucketizeAmplitude } from "../src/core/audio/cache/waveform";

const fsp = fs.promises;

interface ParsedWav {
  sampleRate: number;
  channels: Float32Array[];
  durationMs: number;
}

interface WavFormat {
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const samplesDir = path.join(repoRoot, "public", "samples");
const waveformsDir = path.join(repoRoot, "public", "waveforms");

function readWavFormat(buffer: Buffer, offset: number): WavFormat {
  const audioFormat = buffer.readUInt16LE(offset);
  const numChannels = buffer.readUInt16LE(offset + 2);
  const sampleRate = buffer.readUInt32LE(offset + 4);
  const bitsPerSample = buffer.readUInt16LE(offset + 14);

  return { audioFormat, numChannels, sampleRate, bitsPerSample };
}

function decodeSample(
  buffer: Buffer,
  offset: number,
  format: WavFormat,
): number {
  const { bitsPerSample, audioFormat } = format;

  if (audioFormat === 3) {
    // IEEE float
    if (bitsPerSample === 32) {
      return buffer.readFloatLE(offset);
    }
    throw new Error(`Unsupported float bit depth: ${bitsPerSample}`);
  }

  // PCM integer formats
  switch (bitsPerSample) {
    case 8:
      return (buffer.readUInt8(offset) - 128) / 128;
    case 16:
      return buffer.readInt16LE(offset) / 32768;
    case 24:
      return buffer.readIntLE(offset, 3) / 0x800000;
    case 32:
      return buffer.readInt32LE(offset) / 2147483648;
    default:
      throw new Error(`Unsupported PCM bit depth: ${bitsPerSample}`);
  }
}

function parseWav(buffer: Buffer): ParsedWav {
  if (buffer.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Invalid WAV file (missing RIFF header)");
  }
  if (buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Invalid WAV file (missing WAVE header)");
  }

  let format: WavFormat | null = null;
  let dataOffset = -1;
  let dataSize = 0;

  let cursor = 12; // skip RIFF/WAVE
  while (cursor + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", cursor, cursor + 4);
    const chunkSize = buffer.readUInt32LE(cursor + 4);
    const chunkStart = cursor + 8;

    if (chunkId === "fmt ") {
      format = readWavFormat(buffer, chunkStart);
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      dataSize = chunkSize;
      break;
    }

    // Chunks are word-aligned; account for padding byte on odd sizes
    cursor = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!format) {
    throw new Error("Missing fmt chunk in WAV file");
  }
  if (dataOffset < 0 || dataSize === 0) {
    throw new Error("Missing data chunk in WAV file");
  }

  const bytesPerSample = format.bitsPerSample / 8;
  const frameCount = Math.floor(
    dataSize / (bytesPerSample * format.numChannels),
  );
  const channels = Array.from(
    { length: format.numChannels },
    () => new Float32Array(frameCount),
  );

  let sampleCursor = dataOffset;
  for (let frame = 0; frame < frameCount; frame++) {
    for (let channel = 0; channel < format.numChannels; channel++) {
      const sample = decodeSample(buffer, sampleCursor, format);
      channels[channel][frame] = sample;
      sampleCursor += bytesPerSample;
    }
  }

  return {
    sampleRate: format.sampleRate,
    channels,
    durationMs: Math.round((frameCount / format.sampleRate) * 1000),
  };
}

function toMonoMagnitude(channels: Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0;
  const mono = new Float32Array(length);
  const channelCount = channels.length || 1;

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channelCount; ch++) {
      sum += Math.abs(channels[ch][i] ?? 0);
    }
    mono[i] = sum / channelCount;
  }

  return mono;
}

async function findWavFiles(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findWavFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".wav")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

function getOutputPath(wavPath: string): string {
  const relative = path.relative(samplesDir, wavPath);
  const dir = path.dirname(relative);
  const base = path.basename(relative, path.extname(relative));
  return path.join(waveformsDir, dir === "." ? "" : dir, `${base}.json`);
}

async function writeWaveform(
  targetPath: string,
  waveformBuckets: number[],
  meta: { sampleRate: number; durationMs: number },
) {
  await ensureDir(path.dirname(targetPath));

  const payload = JSON.stringify(
    {
      version: 1,
      bucketCount: waveformBuckets.length,
      buckets: waveformBuckets,
      sampleRate: meta.sampleRate,
      durationMs: meta.durationMs,
    },
    null,
    0,
  );

  await fsp.writeFile(targetPath, payload, "utf8");
}

async function cleanDir(dir: string) {
  try {
    await fsp.rm(dir, { recursive: true, force: true });
  } catch {
    // Directory may not exist, that's fine
  }
}

async function main() {
  console.log("Generating transient waveforms (TypeScript)...");
  console.log("Cleaning existing waveforms...");
  await cleanDir(waveformsDir);
  await ensureDir(waveformsDir);

  const wavFiles = await findWavFiles(samplesDir);
  wavFiles.sort();

  if (wavFiles.length === 0) {
    console.warn("No .wav files found under public/samples/");
    return;
  }

  let generated = 0;
  for (const wavFile of wavFiles) {
    try {
      const buffer = await fsp.readFile(wavFile);
      const parsed = parseWav(buffer);
      const mono = toMonoMagnitude(parsed.channels);
      const buckets = bucketizeAmplitude(mono, WAVEFORM_BUCKET_COUNT);
      const targetPath = getOutputPath(wavFile);
      await writeWaveform(targetPath, buckets, parsed);
      generated += 1;
    } catch (error) {
      console.error(`Failed to process ${wavFile}:`, error);
    }
  }

  console.log(
    `Processed ${generated}/${wavFiles.length} samples into ${waveformsDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
