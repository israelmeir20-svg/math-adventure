/**
 * The round loop behind "מי באסם?".
 *
 * Owns the phase machine and the deterministic round timeline; the shared
 * 60-second clock keeps ticking independently underneath. Every scheduled step
 * carries the token of the round that created it, so a stale timer can never
 * advance a later round.
 *
 * THE TIMELINE, per round. Steps are strictly serialised so a child can count
 * one animal at a time; nothing starts before the previous step has cleared.
 *
 *   RUNNING_IN   in animals walk in, one every 1.2s   (in.length * 1.2 + 1.8)
 *   (pause)      0.8s of silence, herd is inside the barn
 *   RUNNING_OUT  out animals emerge and leave         (out.length * 1.2 + 1.8)
 *   SLAMMING     the shutter planks drop, a fixed 0.5s beat
 *   ANSWERING    only now does the keypad accept a tap
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildBarnRound, SHUTTER_DROP, PAUSE_BETWEEN_WAVES, waveMs, type BarnRound } from './barnRoundGenerator';

export type Phase =
  | 'INTRO' | 'RUNNING_IN' | 'RUNNING_OUT' | 'SLAMMING'
  | 'ANSWERING' | 'FAST_FEEDBACK' | 'GAME_OVER';

/** How long the shutters take to drop and settle, in milliseconds. */
export const SLAM_MS = SHUTTER_DROP;

export interface BarnLoop {
  phase: Phase;
  round: BarnRound;
  roundNumber: number;
  picked: number | null;
  feedback: 'none' | 'correct' | 'wrong';
  /** Begin a fresh 60-second run. */
  begin: () => void;
  /** Submit a tapped digit. Ignored unless the keypad is live. */
  pick: (digit: number) => void;
  /** True only once the shutters have finished dropping. */
  live: boolean;
}

interface Options {
  onCorrect: () => void;
  onWrong: () => void;
  /** Set when the shared clock has stopped, to raise the party. */
  over: boolean;
}

export function useBarnLoop({ onCorrect, onWrong, over }: Options): BarnLoop {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [round, setRound] = useState<BarnRound>(() => buildBarnRound(1));
  const [roundNumber, setRoundNumber] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const tokenRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void, token: number) => {
    const id = window.setTimeout(() => {
      if (tokenRef.current === token) fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /** One round's full timeline: in -> pause -> out -> slam -> answer. */
  const playRound = useCallback(
    (current: BarnRound) => {
      const token = tokenRef.current;
      // Accumulated offsets: each step provably follows the previous one.
      const inMs = waveMs(current.incoming.length);
      const waveDoneMs = inMs + PAUSE_BETWEEN_WAVES + waveMs(current.outgoing.length);
      setPicked(null);
      setPhase('RUNNING_IN');
      after(inMs, () => setPhase('RUNNING_OUT'), token);
      after(waveDoneMs, () => setPhase('SLAMMING'), token);
      after(waveDoneMs + SLAM_MS, () => setPhase('ANSWERING'), token);
    },
    [after],
  );

  const begin = useCallback(() => {
    tokenRef.current += 1;
    clearTimers();
    finishedRef.current = false;
    setRoundNumber(1);
    setFeedback('none');
    setPicked(null);
    const first = buildBarnRound(1);
    setRound(first);
    // Deferred one tick so the freshly generated round is committed first.
    window.setTimeout(() => playRound(first), 0);
  }, [clearTimers, playRound]);

  const pick = useCallback(
    (digit: number) => {
      if (phase !== 'ANSWERING') return;
      setPicked(digit);
      // Coerce both sides defensively: the keypad hands back a number today, but
      // a string from a future DOM event would silently fail `===`.
      const userGuess = Number(digit);
      const expected = Number(round.answer);
      const isCorrect = userGuess === expected;
      console.log('[Barn Answer Check]', { userGuess, expected, isCorrect });
      if (isCorrect) onCorrect();
      else onWrong();
      setPhase('FAST_FEEDBACK');
      setFeedback(isCorrect ? 'correct' : 'wrong');
      const token = tokenRef.current;
      after(isCorrect ? 400 : 650, () => {
        setFeedback('none');
        setPicked(null);
        const next = roundNumber + 1;
        const nextRound = buildBarnRound(next);
        setRoundNumber(next);
        setRound(nextRound);
        playRound(nextRound);
      }, token);
    },
    [phase, round.answer, roundNumber, onCorrect, onWrong, after, playRound],
  );

  // When the clock stops, drop the party curtain exactly once.
  useEffect(() => {
    if (!over || finishedRef.current) return;
    finishedRef.current = true;
    tokenRef.current += 1;
    clearTimers();
    setPhase('GAME_OVER');
    setFeedback('none');
    setPicked(null);
  }, [over, clearTimers]);

  return {
    phase,
    round,
    roundNumber,
    picked,
    feedback,
    begin,
    pick,
    live: phase === 'ANSWERING',
  };
}
