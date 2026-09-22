/**
 * Per-round state for "סל הפיקניק": the phase machine, the crate, and the tap.
 *
 * THE PHASE IS DERIVED, NOT STORED SEPARATELY. There is one piece of stored truth
 * here - whether the crate is covered - and the phase is read off it together with
 * the answer. A stored phase enum and a stored `answered` flag can disagree after a
 * fast tap, and the disagreement shows up as a lid that stays open after the round is
 * over, which is the bug this shape makes impossible.
 *
 * THE PHASE NO LONGER DRIVES THE CLOCK. An earlier revision charged time only in
 * QUESTION, so looking at the crate and reading the explanation were both free. The
 * countdown now runs continuously from the first deal to zero, and the phase is purely
 * about what the child can see and tap - which is why nothing here mentions timing.
 */
import { useCallback, useMemo, useState } from 'react';
import { buildPicnicRound } from './picnicGenerator';
import { PICNIC_TIERS } from './picnicTiers';
import type { PicnicPhase, PicnicRound } from './picnicTypes';

export interface PicnicRoundState {
  /** 1-based round number in the run. */
  roundNumber: number;
  round: PicnicRound;
  /** The fruit tapped, or null. */
  picked: string | null;
  /** The tapped fruit, but only when it was correct. */
  right: string | null;
  /** The tapped fruit, but only when it was wrong. */
  wrong: string | null;
  /** True when the tap was the answer. False before any tap. */
  correct: boolean;
  /** True once a tap has been registered. */
  answered: boolean;
  /** Where the round currently is. */
  phase: PicnicPhase;
  /** True while the cloth covers the crate. */
  covered: boolean;
  /** The species present this round, in the tier's order. */
  choices: string[];
  /** How long the crate should stay open, in milliseconds. */
  inspectMs: number;
  /** Marks the inspection over - the lid shuts and the question begins. */
  closeLid: () => void;
  /** Records a tap. No-op once the round is answered. */
  pick: (fruit: string) => void;
  /** Installs a fresh crate and reopens the lid. */
  deal: (round: number) => PicnicRound;
}

export function usePicnicRound(): PicnicRoundState {
  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<PicnicRound>(() => buildPicnicRound(1));
  const [picked, setPicked] = useState<string | null>(null);
  const [covered, setCovered] = useState(false);

  const closeLid = useCallback(() => setCovered(true), []);

  const deal = useCallback((next: number): PicnicRound => {
    const fresh = buildPicnicRound(next);
    setRoundNumber(next);
    setRound(fresh);
    setPicked(null);
    setCovered(false);
    return fresh;
  }, []);

  const pick = useCallback((fruit: string) => {
    setPicked((current) => (current === null ? fruit : current));
  }, []);

  return useMemo(() => {
    const answered = picked !== null;
    const correct = answered && picked === round.answer;
    // THE PHASE IS READ OFF THE STATE, not stored alongside it. One source of
    // truth means the lid and the clock cannot disagree about what is happening.
    const phase: PicnicPhase = answered ? 'FEEDBACK' : covered ? 'QUESTION' : 'INSPECTING';

    return {
      roundNumber,
      round,
      picked,
      correct,
      answered,
      phase,
      covered,
      right: correct ? picked : null,
      wrong: answered && !correct ? picked : null,
      choices: round.choices,
      // Read from the round's own tier, so the timing and the difficulty always come
      // from the same place and a level change cannot desync the two.
      inspectMs: (PICNIC_TIERS[round.level] ?? PICNIC_TIERS[1]!).inspectMs,
      closeLid,
      pick,
      deal,
    };
  }, [roundNumber, round, picked, covered, closeLid, pick, deal]);
}
