"use client";

/**
 * Haptic feedback met dual-layer-aanpak.
 *
 * 1) Android / desktop met Vibration API → echte vibratie via navigator.vibrate.
 * 2) iOS Safari (geen Vibration API) → fallback: een sub-bas-puls via Web Audio.
 *    De speaker beweegt fysiek in je hand bij lage frequenties, wat als
 *    haptisch tikje voelt. Niet zo sterk als Taptic Engine in een native app,
 *    maar goed merkbaar mits je de telefoon vasthoudt.
 *
 * AudioContext moet binnen een user gesture geactiveerd worden — call
 * `haptic.unlock()` bij eerste pointerdown om browser-restricties weg te halen.
 */

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

/**
 * Activeer audio-fallback. Roep aan bij de eerste echte user gesture
 * (pointerdown). iOS Safari blokkeert audio buiten gestures.
 */
export function unlock(): void {
  if (unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    // Stilte-buffer afspelen om de context volledig te ontgrendelen
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* zwijg */
  }
}

function nativeVibrate(pattern: number | number[]): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

type Intensity = "soft" | "med" | "hard";

/**
 * Korte sub-bas-puls. Frequenties 30-60Hz: te laag om een duidelijke toon
 * te zijn, hoog genoeg om de speaker te laten "thumpen".
 */
function audioPulse(intensity: Intensity) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  if (!unlocked) {
    // Niet ontgrendeld — iOS zal dit silently blokkeren. Probeer alsnog.
    unlock();
  }

  try {
    const t0 = ctx.currentTime;
    const dur =
      intensity === "soft" ? 0.015 : intensity === "med" ? 0.025 : 0.04;
    const freq =
      intensity === "soft" ? 60 : intensity === "med" ? 45 : 35;
    const vol =
      intensity === "soft" ? 0.06 : intensity === "med" ? 0.12 : 0.18;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0);

    // Snel attack + decay zodat het als tikje voelt, niet als toon
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  } catch {
    /* zwijg */
  }
}

/** Combineerde feedback: probeer Vibration API; val anders terug op audio. */
function feedback(pattern: number | number[], audio: Intensity) {
  if (nativeVibrate(pattern)) return;
  audioPulse(audio);
}

/** 5 ms — fluistering, voor pickup of zachte cue */
export function whisper() {
  feedback(5, "soft");
}

/** 8 ms — kleine tick, voor undo / kleine acties */
export function tick() {
  feedback(8, "soft");
}

/** 15 ms — duidelijk maar kort, voor threshold-crossing */
export function pulse() {
  feedback(15, "med");
}

/** 25 ms — stevige feedback, voor commit */
export function strong() {
  feedback(25, "hard");
}

/** Patroon — voor match: kort-pauze-langer */
export function success() {
  if (nativeVibrate([20, 50, 35])) return;
  audioPulse("med");
  window.setTimeout(() => audioPulse("hard"), 70);
}

/** Patroon — voor conflict / waarschuwing */
export function warn() {
  if (nativeVibrate([12, 40, 12])) return;
  audioPulse("med");
  window.setTimeout(() => audioPulse("med"), 55);
}

/** Stop alle lopende vibraties (Vibration API only). */
export function cancel() {
  nativeVibrate(0);
}
