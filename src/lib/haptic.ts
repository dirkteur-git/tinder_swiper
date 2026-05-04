"use client";

/**
 * Haptic feedback helpers.
 *
 * Werkt op Android Chrome/Firefox en op desktop browsers met de Vibration
 * API. iOS Safari ondersteunt deze API niet — daar is het stilzwijgend
 * een no-op (geen native web-haptic op iOS, beperking van WebKit).
 *
 * Houd patronen kort en spaarzaam: te veel buzz voelt goedkoop.
 */

function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

function safeVibrate(pattern: number | number[]) {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* zwijg */
  }
}

/** 5 ms — fluistering, voor pickup of zachte cue */
export function whisper() {
  safeVibrate(5);
}

/** 8 ms — kleine tick, voor undo / kleine acties */
export function tick() {
  safeVibrate(8);
}

/** 15 ms — duidelijk maar kort, voor threshold-crossing */
export function pulse() {
  safeVibrate(15);
}

/** 25 ms — stevige feedback, voor commit (card vliegt weg) */
export function strong() {
  safeVibrate(25);
}

/** Patroon — voor match: kort-pauze-langer ("ta-da") */
export function success() {
  safeVibrate([20, 50, 35]);
}

/** Patroon — voor conflict / waarschuwing */
export function warn() {
  safeVibrate([12, 40, 12]);
}

/** Stop alle lopende vibraties (bv. bij navigation away). */
export function cancel() {
  safeVibrate(0);
}
