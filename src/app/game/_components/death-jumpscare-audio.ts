/** Shared audio context unlocked after the player's first click-to-play gesture. */
let sharedAudioContext: AudioContext | null = null;

/**
 * Returns a resumed Web Audio context, creating one on first use.
 *
 * Call from gameplay after user interaction so browser autoplay policies allow sound.
 */
function getAudioContext(): AudioContext {
  sharedAudioContext ??= new AudioContext();
  void sharedAudioContext.resume();
  return sharedAudioContext;
}

/**
 * Builds a short burst of harsh brown noise for the death jump scare.
 *
 * @param ctx - Active audio context.
 * @param durationSec - Length of the noise buffer in seconds.
 */
function createScareNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleCount = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const channel = buffer.getChannelData(0);

  let lastSample = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const white = Math.random() * 2 - 1;
    lastSample = (lastSample + 0.02 * white) / 1.02;
    channel[index] = lastSample * 4.2;
  }

  return buffer;
}

/**
 * Plays a loud, jarring jump-scare sound once when the player dies.
 *
 * Uses synthesized noise and a descending screech — no external audio file required.
 * Safe to call multiple times; each death triggers a fresh one-shot burst.
 */
export async function playDeathJumpScareAudio(): Promise<void> {
  const ctx = getAudioContext();
  await ctx.resume();

  const durationSec = 1.85;
  const startTime = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, startTime);
  masterGain.gain.linearRampToValueAtTime(0.92, startTime + 0.015);
  masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);
  masterGain.connect(ctx.destination);

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = createScareNoiseBuffer(ctx, durationSec);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(920, startTime);
  bandpass.frequency.exponentialRampToValueAtTime(280, startTime + durationSec);
  bandpass.Q.value = 0.65;

  const distortion = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let index = 0; index < 256; index += 1) {
    const normalized = (index * 2) / 255 - 1;
    curve[index] = Math.tanh(normalized * 4.5);
  }
  distortion.curve = curve;

  noiseSource.connect(bandpass);
  bandpass.connect(distortion);
  distortion.connect(masterGain);

  const screech = ctx.createOscillator();
  screech.type = "sawtooth";
  screech.frequency.setValueAtTime(240, startTime);
  screech.frequency.exponentialRampToValueAtTime(38, startTime + 0.55);
  screech.frequency.setValueAtTime(190, startTime + 0.62);
  screech.frequency.exponentialRampToValueAtTime(28, startTime + 1.35);

  const screechGain = ctx.createGain();
  screechGain.gain.setValueAtTime(0.55, startTime);
  screechGain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

  screech.connect(screechGain);
  screechGain.connect(masterGain);

  noiseSource.start(startTime);
  noiseSource.stop(startTime + durationSec);
  screech.start(startTime);
  screech.stop(startTime + durationSec);
}
