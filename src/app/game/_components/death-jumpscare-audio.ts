"use client";

/** HTML media volume for jump-scare playback (0–1). */
export const JUMPSCARE_PLAYBACK_VOLUME = 0.6;

/** HTML media volume for death-roar playback (0–1). */
export const DEATH_ROAR_PLAYBACK_VOLUME = 0.55;

/** Public path to the committed jump-scare sound effect. */
export const JUMPSCARE_AUDIO_SRC = "/sounds/jumpscare.wav";

/** Public path to the synthesized death-roar sound effect. */
export const DEATH_ROAR_AUDIO_SRC = "/sounds/death-roar.wav";

/** ID of the preload `<audio>` element rendered in the game shell. */
export const JUMPSCARE_AUDIO_ELEMENT_ID = "everdoomie-jumpscare-audio";

/** ID of the preload `<audio>` element for the death roar. */
export const DEATH_ROAR_AUDIO_ELEMENT_ID = "everdoomie-death-roar-audio";

/** DOM-attached audio element primed during the first user gesture. */
let scareAudioElement: HTMLAudioElement | null = null;

/** DOM-attached roar audio element primed during the first user gesture. */
let roarAudioElement: HTMLAudioElement | null = null;

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
 * Creates (once) and appends an audio element to the document body.
 *
 * Browsers often block playback for detached `new Audio()` instances — keeping
 * the element in the DOM is required for reliable death playback.
 *
 * @param existing - Cached element reference, if already resolved.
 * @param preloadId - ID of a pre-rendered `<audio>` tag in the game shell.
 * @param src - Public URL of the sound file.
 * @param label - Short label for development logs.
 */
function resolveDomAudioElement(
  existing: HTMLAudioElement | null,
  preloadId: string,
  src: string,
  label: string,
): HTMLAudioElement {
  if (typeof document === "undefined") {
    throw new Error("Jump-scare audio requires a browser environment.");
  }

  if (existing) return existing;

  const preloaded = document.getElementById(preloadId);
  if (preloaded instanceof HTMLAudioElement) {
    preloaded.volume =
      label === "jumpscare" ? JUMPSCARE_PLAYBACK_VOLUME : DEATH_ROAR_PLAYBACK_VOLUME;
    logJumpScareAudio(`using preloaded DOM audio element (${label})`);
    return preloaded;
  }

  const element = document.createElement("audio");
  element.src = src;
  element.preload = "auto";
  element.volume =
    label === "jumpscare" ? JUMPSCARE_PLAYBACK_VOLUME : DEATH_ROAR_PLAYBACK_VOLUME;
  element.style.display = "none";
  element.setAttribute("aria-hidden", "true");
  document.body.appendChild(element);

  logJumpScareAudio(`audio element created and appended to DOM (${label})`);
  return element;
}

/**
 * Returns the primary jump-scare DOM audio element.
 */
function getScareAudioElement(): HTMLAudioElement {
  scareAudioElement = resolveDomAudioElement(
    scareAudioElement,
    JUMPSCARE_AUDIO_ELEMENT_ID,
    JUMPSCARE_AUDIO_SRC,
    "jumpscare",
  );
  return scareAudioElement;
}

/**
 * Returns the death-roar DOM audio element.
 */
function getRoarAudioElement(): HTMLAudioElement {
  roarAudioElement = resolveDomAudioElement(
    roarAudioElement,
    DEATH_ROAR_AUDIO_ELEMENT_ID,
    DEATH_ROAR_AUDIO_SRC,
    "death-roar",
  );
  return roarAudioElement;
}

/**
 * Unlocks a single audio element during a user gesture.
 *
 * @param audio - DOM audio element to prime.
 * @param label - Log label for diagnostics.
 */
function unlockAudioElement(
  audio: HTMLAudioElement,
  label: string,
  playbackVolume: number,
): void {
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
      audio.volume = playbackVolume;
      logJumpScareAudio(`audio unlocked successfully (${label})`, {
        readyState: audio.readyState,
      });
    })
    .catch((error: unknown) => {
      logJumpScareAudio(`audio unlock rejected (${label})`, error);
    });
}

/**
 * Unlocks jump-scare audio during a user gesture (click, pointer lock, shot).
 *
 * Runs a near-silent play/pause on the DOM audio elements so death playback is
 * allowed later even outside a gesture call stack.
 */
export function unlockJumpScareAudio(): void {
  if (typeof document === "undefined") return;

  unlockAudioElement(getScareAudioElement(), "jumpscare", JUMPSCARE_PLAYBACK_VOLUME);
  unlockAudioElement(getRoarAudioElement(), "death-roar", DEATH_ROAR_PLAYBACK_VOLUME);
  isAudioUnlocked = true;
}

/**
 * Plays a one-shot burst from a DOM audio element, with fallback clone on rejection.
 *
 * @param audio - Prepared audio element.
 * @param src - Source URL for fallback clone.
 * @param label - Log label for diagnostics.
 * @param playbackVolume - HTML media volume for this clip (0–1).
 */
function playFromElement(
  audio: HTMLAudioElement,
  src: string,
  label: string,
  playbackVolume: number,
): void {
  audio.volume = playbackVolume;
  audio.currentTime = 0;

  logJumpScareAudio(`play() called on death (${label})`, {
    unlocked: isAudioUnlocked,
    readyState: audio.readyState,
    paused: audio.paused,
  });

  void audio
    .play()
    .then(() => {
      logJumpScareAudio(`play() succeeded (${label})`);
    })
    .catch((error: unknown) => {
      logJumpScareAudio(`play() rejected — trying fallback clone (${label})`, error);

      const fallback = document.createElement("audio");
      fallback.src = src;
      fallback.volume = playbackVolume;
      fallback.style.display = "none";
      fallback.setAttribute("aria-hidden", "true");
      document.body.appendChild(fallback);

      void fallback
        .play()
        .then(() => logJumpScareAudio(`fallback clone play() succeeded (${label})`))
        .catch((fallbackError: unknown) => {
          logJumpScareAudio(`fallback clone play() rejected (${label})`, fallbackError);
        })
        .finally(() => {
          fallback.remove();
        });
    });
}

/**
 * Plays the death jump-scare and roar sound effects immediately.
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
  playFromElement(primary, JUMPSCARE_AUDIO_SRC, "jumpscare", JUMPSCARE_PLAYBACK_VOLUME);

  const roar = getRoarAudioElement();
  playFromElement(roar, DEATH_ROAR_AUDIO_SRC, "death-roar", DEATH_ROAR_PLAYBACK_VOLUME);
}

/**
 * Resets death-play deduplication when a new run starts.
 */
export function resetJumpScareAudioSession(): void {
  lastDeathPlayAt = 0;
}
