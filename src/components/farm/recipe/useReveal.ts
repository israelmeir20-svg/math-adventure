/**
 * The one-by-one reveal for "המתכון של השף".
 *
 * Paced progressively by round: early rounds give children ample time to
 * absorb each ingredient, with an explicit HOLD phase after the last item
 * is shown before handing control over to input.
 */
import { useEffect, useRef, useState } from 'react';

interface UseRevealOptions {
  /** Bumped by the caller to start a fresh reveal for the new round. */
  roundNumber: number;
  /** How many items this round's sequence holds. */
  length: number;
  /** True while the run is live; the revealed sequence waits otherwise. */
  running: boolean;
  /** Called once the last item has been shown and the hold phase completes. */
  onDone: () => void;
}

export function useReveal({ roundNumber, length, running, onDone }: UseRevealOptions) {
  const [step, setStep] = useState(0);

  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  // זמני תצוגה מותאמים: רגוע ואיטי בהתחלה, מתגבר בהדרגה ברמות גבוהות
  const stepMs = roundNumber <= 3 ? 900 : roundNumber <= 7 ? 750 : roundNumber <= 11 ? 600 : 500;
  // זמן השהייה שבו כל המתכון עומד גלוי למעלה כדי לקלוט את המוצר האחרון
  const holdMs = roundNumber <= 3 ? 1000 : roundNumber <= 7 ? 800 : 600;

  useEffect(() => {
    if (!running) return undefined;

    // כשכל המצרכים הוצגו – ממתינים holdMs מלא לפני שמעבירים לשלב ההקלדה
    if (step >= length) {
      const holdTimer = window.setTimeout(() => {
        doneRef.current();
      }, holdMs);
      return () => window.clearTimeout(holdTimer);
    }

    const id = window.setTimeout(() => {
      setStep((value) => value + 1);
    }, stepMs);

    return () => window.clearTimeout(id);
  }, [step, length, running, roundNumber, stepMs, holdMs]);

  // איפוס בכל סיבוב חדש
  useEffect(() => {
    setStep(0);
  }, [roundNumber]);

  return step;
}