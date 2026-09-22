/**
 * The status bar for "משחק הכוכבים".
 *
 * Read-only by design: round, score and remaining seconds. Starting the run is the start
 * overlay's job, so there is no second "start" button competing up here.
 *
 * The remaining-seconds chip goes red and pulses under 10 seconds, matching the other farm
 * stations - the urgency cue is consistent across the hub so a child learns it once.
 */
import { Timer, Trophy, Layers } from 'lucide-react';

interface StarHeaderProps {
  /** The level the run is being played at - the child's own choice, fixed for the run. */
  level: number;
  /** 1-based question index within the run. */
  question: number;
  /** How many questions a run contains. */
  totalQuestions: number;
  correct: number;
  secondsLeft: number;
  running: boolean;
  goldScore: number;
  /** District heading, passed in when the game is opened outside the farm hub. */
  titleLine?: string;
}

export default function StarHeader({
  level,
  question,
  totalQuestions,
  correct,
  secondsLeft,
  running,
  goldScore,
  titleLine,
}: StarHeaderProps) {
  const urgent = running && secondsLeft <= 10;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir="rtl">
      {titleLine && (
        <span className="w-full truncate text-center text-base font-black text-indigo-900">
          {titleLine}
        </span>
      )}

      {/*
        THE LEVEL CHIP STATES WHAT IS BEING PLAYED; THE QUESTION CHIP STATES HOW FAR ALONG.

        This badge used to read "שלב <roundNumber>", which was both a mislabel and a
        misdirection: the number it showed was the question index, while the thing it appeared
        to describe - the difficulty - was silently escalating behind it. A child on "רמה 1" saw
        "שלב 1" become "שלב 4" and found themselves on a two-shape multiplication question,
        without ever having chosen to leave Level 1.

        So the two facts are now separated and each is labelled for what it is. The level never
        changes during a run, and the question counter reports position in the run without
        implying anything about difficulty.
      */}
      <span className="flex items-center gap-1.5 rounded-2xl bg-fuchsia-600 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#701a75]">
        <Layers className="h-4 w-4" />
        רמה <span className="tabular-nums">{level}</span>
      </span>

      <span className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#312e81]">
        שאלה{' '}
        <span className="tabular-nums">
          {question}/{totalQuestions}
        </span>
      </span>

      <span className="flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#92400e]">
        <Trophy className="h-4 w-4" />
        <span className="tabular-nums">
          {correct}/{goldScore}
        </span>
      </span>

      <span
        className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-black tabular-nums shadow-[0_3px_0_rgba(0,0,0,0.2)] ${
          urgent ? 'animate-pulse bg-rose-500 text-white' : 'bg-indigo-950/80 text-indigo-100'
        }`}
      >
        <Timer className="h-4 w-4" />
        {secondsLeft}s
      </span>
    </div>
  );
}
