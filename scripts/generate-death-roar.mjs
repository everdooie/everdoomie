/**
 * Synthesizes a demonic beast growl/roar WAV for everdoomie.
 * Run once: node scripts/generate-death-roar.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const DURATION_SEC = 1.75;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);
const DT = 1 / SAMPLE_RATE;

/**
 * One-pole low-pass filter.
 *
 * @param {number} input - Sample input.
 * @param {number} cutoffHz - Cutoff frequency in Hz.
 * @param {{ state: number }} state - Mutable filter state holder.
 */
function lowPass(input, cutoffHz, state) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = DT / (rc + DT);
  state.state += alpha * (input - state.state);
  return state.state;
}

/**
 * Two-pole resonant bandpass (formant) filter.
 *
 * @param {number} input - Excitation sample.
 * @param {number} freqHz - Center frequency in Hz.
 * @param {number} q - Resonance Q factor.
 * @param {{ y1: number, y2: number, cosW: number, alpha: number, freq: number }} bank - Filter state.
 */
function formantFilter(input, freqHz, q, bank) {
  if (Math.abs(freqHz - bank.freq) > 0.5) {
    bank.freq = freqHz;
    const w = (2 * Math.PI * freqHz) / SAMPLE_RATE;
    bank.cosW = Math.cos(w);
    bank.alpha = Math.sin(w) / (2 * q);
  }

  const a0 = 1 + bank.alpha;
  const b0 = bank.alpha / a0;
  const b1 = 0;
  const b2 = -bank.alpha / a0;
  const a1 = (-2 * bank.cosW) / a0;
  const a2 = (1 - bank.alpha) / a0;

  const out = b0 * input + b1 * bank.y1 + b2 * bank.y2 - a1 * bank.y1 - a2 * bank.y2;
  bank.y2 = bank.y1;
  bank.y1 = out;
  return out;
}

/** Creates mutable formant filter state. */
function createFormantBank() {
  return { y1: 0, y2: 0, cosW: 0, alpha: 0, freq: -1 };
}

/**
 * Smooth pitch contour: low attack, brief rise, long guttural fall.
 * No LFO or vibrato — modulation reads as wobble/static on death playback.
 *
 * @param {number} t - Time in seconds.
 */
function pitchEnvelope(t) {
  const riseEnd = 0.38;
  const holdEnd = 0.88;
  const fStart = 34;
  const fPeak = 62;
  const fEnd = 38;

  if (t < riseEnd) {
    const p = t / riseEnd;
    const ease = p * p * (3 - 2 * p);
    return fStart + (fPeak - fStart) * ease;
  }

  if (t < holdEnd) {
    return fPeak;
  }

  const p = (t - holdEnd) / (DURATION_SEC - holdEnd);
  const ease = 1 - (1 - p) ** 2;
  return fPeak + (fEnd - fPeak) * ease;
}

/**
 * Amplitude envelope: quick attack, long sustain, gradual decay.
 *
 * @param {number} t - Time in seconds.
 */
function ampEnvelope(t) {
  const attack = 0.05;
  const sustainEnd = 0.78;

  if (t < attack) {
    const p = t / attack;
    return p * p * (3 - 2 * p);
  }
  if (t < sustainEnd) return 1;

  const decayT = (t - sustainEnd) / (DURATION_SEC - sustainEnd);
  return Math.max(0, 1 - decayT ** 1.5);
}

/**
 * Band-limited sawtooth from phase 0–1 — throaty harmonic source.
 *
 * @param {number} phase - Wrapped phase 0–1.
 */
function sawFromPhase(phase) {
  return 2 * phase - 1;
}

/**
 * Low monster formants — deep chest/throat resonances with moderate Q
 * to avoid ringing that reads as static.
 *
 * @param {number} fundamentalHz - Current pitch.
 */
function formantCenters(fundamentalHz) {
  const stretch = 0.5 + (fundamentalHz / 62) * 0.5;
  return [
    { freq: 165 * stretch, q: 2.8, gain: 1.0 },
    { freq: 310 * stretch, q: 2.4, gain: 0.55 },
    { freq: 520 * stretch, q: 2.1, gain: 0.22 },
  ];
}

const rumbleLp = { state: 0 };
const bodyLp = { state: 0 };
const finalLp = { state: 0 };
const f1 = createFormantBank();
const f2 = createFormantBank();
const f3 = createFormantBank();
const formantBanks = [f1, f2, f3];

/** Running phase for the primary growl oscillator. */
let growlPhase = 0;

const samples = new Float32Array(NUM_SAMPLES);

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  const env = ampEnvelope(t);
  const fundamental = pitchEnvelope(t);

  growlPhase += fundamental / SAMPLE_RATE;
  if (growlPhase >= 1) growlPhase -= Math.floor(growlPhase);

  const saw = sawFromPhase(growlPhase);
  const body = lowPass(saw, 120 + fundamental * 2.2, bodyLp);

  const formants = formantCenters(fundamental);
  let vocal = 0;
  for (let f = 0; f < formants.length; f++) {
    const { freq, q, gain } = formants[f];
    vocal += formantFilter(body, freq, q, formantBanks[f]) * gain;
  }

  const rumble = lowPass(body, 72, rumbleLp);

  const raw = vocal * 0.82 + rumble * 0.48;
  const shaped = Math.tanh(raw * 1.05);
  const dark = lowPass(shaped, 680 + fundamental * 3.5, finalLp);
  samples[i] = dark * env;
}

let peak = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  peak = Math.max(peak, Math.abs(samples[i]));
}
const gain = 0.8 / peak;
for (let i = 0; i < NUM_SAMPLES; i++) {
  samples[i] = Math.tanh(samples[i] * gain * 1.15);
}

/**
 * Writes 16-bit mono PCM WAV.
 *
 * @param {string} path - Output file path.
 * @param {Float32Array} floatSamples - Normalized float samples in -1..1.
 */
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

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "sounds",
  "death-roar.wav",
);
writeWav(outPath, samples);
console.log(`Wrote ${outPath} (${NUM_SAMPLES} samples, ${DURATION_SEC}s)`);
