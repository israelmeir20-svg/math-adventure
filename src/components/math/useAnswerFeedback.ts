/**
 * Feedback side effects for answering: confetti burst, a soft chime and a
 * gentle "try again" tone.
 *
 * Audio lives in `audioTone.ts` on a shared context. Confetti is reserved for
 * *finishing* something - on a per-tap game it is far too expensive, and the
 * details are in `celebrate()` below.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { playTone, warmAudio } from './audioTone';

/**
 * A small sparkle that never touches the DOM.
 *
 * This deliberately avoids `confetti()`: the default confetti instance is built
 * with `{ useWorker: true, resize: true }`, and its first call in a session
 * synchronously creates a full-viewport canvas, forces a document reflow via
 * `canvas.width = document.documentElement.clientWidth`, and spins up a Web
 * Worker from a blob URL to take over the canvas. That is several milliseconds
 * of main-thread work, and because it only happens once it lands as a single
 * unexplained hitch partway through the first balloons.
 *
 * `confetti.create` with a caller-owned canvas still allocates a canvas, so the
 * only zero-DOM cost is a canvas we make ourselves, once.
 */
let localCanvas: HTMLCanvasElement | null = null;
let localBurst: confetti.CreateTypes | null = null;

function sparkle() {
  try {
    if (!localCanvas) {
      localCanvas = document.createElement('canvas');
      localCanvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:40';
      document.body.appendChild(localCanvas);
      // No worker: the transfer of an OffscreenCanvas is one-shot, so reusing a
      // worker across pops is not possible anyway.
      localBurst = confetti.create(localCanvas, { resize: true, useWorker: false });
    }
    void localBurst?.({
      particleCount: 22,
      spread: 55,
      startVelocity: 26,
      ticks: 45,
      origin: { x: 0.5, y: 0.65 },
      colors: ['#f59e0b', '#fbbf24', '#ec4899', '#6366f1'],
    });
  } catch {
    /* decorative only */
  }
}

/** A full-screen celebration - reserved for finishing a whole game. */
function bigBurst() {
  try {
    void confetti({
      particleCount: 160,
      spread: 110,
      startVelocity: 48,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#f59e0b', '#10b981', '#ec4899', '#6366f1', '#f43f5e'],
    });
  } catch {
    /* confetti is decorative only */
  }
}

export function useAnswerFeedback() {
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /** Light per-question feedback: a sparkle and a chime on success. */
  const onAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      sparkle();
      playTone('success');
      return;
    }
    playTone('gentle');
  }, []);

  /** Full confetti celebration - only when a whole game is completed. */
  const celebrate = useCallback(() => {
    bigBurst();
    playTone('success');
  }, []);

  return useMemo(() => Object.assign(onAnswer, { celebrate }), [onAnswer, celebrate]);
}

export { sparkle as burst, warmAudio, playTone };
