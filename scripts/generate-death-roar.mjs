/**
 * Synthesizes a loud, scary death-roar WAV for everdoomie.
 * Run once: node scripts/generate-death-roar.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const DURATION_SEC = 1.8;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);

/** Simple deterministic pseudo-random for reproducible noise. */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const rand = seededRandom(0xdeadbeef);

/** Amplitude envelope: sharp attack, sustain, long decay. */
function envelope(t) {
  const attack = 0.04;
  const sustainEnd = 0.55;
  const release = DURATION_SEC;

  if (t < attack) return t / attack;
  if (t < sustainEnd) return 1;
  const decayT = (t - sustainEnd) / (release - sustainEnd);
  return Math.max(0, 1 - decayT ** 1.4);
}

/** Low-frequency pitch wobble for organic roar feel. */
function pitchMod(t) {
  return 1 + 0.08 * Math.sin(2 * Math.PI * 4.5 * t) + 0.04 * Math.sin(2 * Math.PI * 11 * t);
}

const samples = new Float32Array(NUM_SAMPLES);

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const env = envelope(t);
  const pm = pitchMod(t);

  // Core rumble — stacked low harmonics
  const f1 = 72 * pm;
  const f2 = 108 * pm;
  const f3 = 156 * pm;
  const rumble =
    0.55 * Math.sin(2 * Math.PI * f1 * t) +
    0.35 * Math.sin(2 * Math.PI * f2 * t + 0.3) +
    0.25 * Math.sin(2 * Math.PI * f3 * t + 0.7);

  // Gritty noise burst (band-limited via moving average)
  const rawNoise = rand() * 2 - 1;
  const grit = rawNoise * 0.45;

  // Sub-bass punch at start
  const punch = t < 0.12 ? Math.sin(2 * Math.PI * 45 * t) * (1 - t / 0.12) * 0.7 : 0;

  // Growl overtones that rise then fall
  const growlFreq = 220 + 180 * Math.exp(-t * 3);
  const growl = 0.2 * Math.sin(2 * Math.PI * growlFreq * t) * Math.exp(-t * 1.2);

  samples[i] = (rumble + grit + punch + growl) * env;
}

// Normalize with moderate headroom — avoids clipping when layered with jumpscare SFX
let peak = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  peak = Math.max(peak, Math.abs(samples[i]));
}
const gain = 0.78 / peak;
for (let i = 0; i < NUM_SAMPLES; i++) {
  const x = samples[i] * gain;
  samples[i] = Math.tanh(x * 1.35); // light saturation
}

/** Writes 16-bit mono PCM WAV. */
function writeWav(path, floatSamples) {
  const numSamples = floatSamples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sounds", "death-roar.wav");
writeWav(outPath, samples);
console.log(`Wrote ${outPath} (${NUM_SAMPLES} samples, ${DURATION_SEC}s)`);
