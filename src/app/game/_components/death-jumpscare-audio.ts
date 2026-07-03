"use client";

/** Public path to the committed jump-scare sound effect. */
export const JUMPSCARE_AUDIO_SRC = "/sounds/jumpscare.wav";

/** ID of the preload `<audio>` element rendered in the game shell. */
export const JUMPSCARE_AUDIO_ELEMENT_ID = "everdoomie-jumpscare-audio";

/** DOM-attached audio element primed during the first user gesture. */
let scareAudioElement: HTMLAudioElement | null = null;

/** Whether a user gesture successfully unlocked HTML audio playback. */
let isAudioUnlocked = false;

/** Prevents double-firing the scare sound on the same death frame. */
let lastDeathPlayAt = 0;

/**
 * Logs jump-scare audio diagnostics in development builds only.
 *
 * @param message - Short description of the audio event.
 * @param detail - Optional structured detail payload.
 */
function logJumpScareAudio(message: string, detail?: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  if (detail === undefined) {
    console.log(`[everdoomie jumpscare] ${message}`);
    return;
  }
  console.log(`[everdoomie jumpscare] ${message}`, detail);
}

/**
 * Creates (once) and appends the scare audio element to the document body.
 *
 * Browsers often block playback for detached `new Audio()` instances — keeping
 * the element in the DOM is required for reliable death playback.
 */
function getScareAudioElement(): HTMLAudioElement {
  if (typeof document === "undefined") {
    throw new Error("Jump-scare audio requires a browser environment.");
  }

  if (scareAudioElement) return scareAudioElement;

  const preloaded = document.getElementById(JUMPSCARE_AUDIO_ELEMENT_ID);
  if (preloaded instanceof HTMLAudioElement) {
    scareAudioElement = preloaded;
    logJumpScareAudio("using preloaded DOM audio element");
    return preloaded;
  }

  scareAudioElement = document.createElement("audio");
  scareAudioElement.src = JUMPSCARE_AUDIO_SRC;
  scareAudioElement.preload = "auto";
  scareAudioElement.volume = 1;
  scareAudioElement.style.display = "none";
  scareAudioElement.setAttribute("aria-hidden", "true");
  document.body.appendChild(scareAudioElement);

  logJumpScareAudio("audio element created and appended to DOM");
  return scareAudioElement;
}

/**
 * Unlocks jump-scare audio during a user gesture (click, pointer lock, shot).
 *
 * Runs a near-silent play/pause on the DOM audio element so death playback is
 * allowed later even outside a gesture call stack.
 */
export function unlockJumpScareAudio(): void {
  if (typeof document === "undefined") return;

  const audio = getScareAudioElement();

  if (audio.readyState < HTMLMediaElement.HAVE_METADATA) {
    audio.load();
  }

  audio.volume = 0.02;
  audio.currentTime = 0;

  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      isAudioUnlocked = true;
      logJumpScareAudio("audio unlocked successfully", {
        readyState: audio.readyState,
      });
    })
    .catch((error: unknown) => {
      logJumpScareAudio("audio unlock rejected", error);
    });
}

/**
 * Plays a loud jump-scare burst from the DOM audio element.
 *
 * @param audio - Prepared scare audio element.
 */
function playScareFromElement(audio: HTMLAudioElement): void {
  audio.volume = 1;
  audio.currentTime = 0;

  logJumpScareAudio("play() called on death", {
    unlocked: isAudioUnlocked,
    readyState: audio.readyState,
    paused: audio.paused,
  });

  void audio
    .play()
    .then(() => {
      logJumpScareAudio("play() succeeded");
    })
    .catch((error: unknown) => {
      logJumpScareAudio("play() rejected — trying fallback clone", error);

      const fallback = document.createElement("audio");
      fallback.src = JUMPSCARE_AUDIO_SRC;
      fallback.volume = 1;
      fallback.style.display = "none";
      fallback.setAttribute("aria-hidden", "true");
      document.body.appendChild(fallback);

      void fallback
        .play()
        .then(() => logJumpScareAudio("fallback clone play() succeeded"))
        .catch((fallbackError: unknown) => {
          logJumpScareAudio("fallback clone play() rejected", fallbackError);
        })
        .finally(() => {
          fallback.remove();
        });
    });
}

/**
 * Plays the death jump-scare sound effect immediately.
 *
 * Call synchronously when the player dies (e.g. from `damagePlayer`). Safe to
 * call once per death; duplicate calls within 500ms are ignored.
 */
export function playDeathJumpScareAudio(): void {
  if (typeof document === "undefined") return;

  const now = performance.now();
  if (now - lastDeathPlayAt < 500) return;
  lastDeathPlayAt = now;

  const primary = getScareAudioElement();
  playScareFromElement(primary);

  // Second clone layered for extra loudness — staggered slightly.
  const booster = document.createElement("audio");
  booster.src = JUMPSCARE_AUDIO_SRC;
  booster.volume = 1;
  booster.style.display = "none";
  booster.setAttribute("aria-hidden", "true");
  document.body.appendChild(booster);

  void booster
    .play()
    .catch((error: unknown) => {
      logJumpScareAudio("booster clone play() rejected", error);
    })
    .finally(() => {
      window.setTimeout(() => booster.remove(), 3000);
    });
}

/**
 * Resets death-play deduplication when a new run starts.
 */
export function resetJumpScareAudioSession(): void {
  lastDeathPlayAt = 0;
}
