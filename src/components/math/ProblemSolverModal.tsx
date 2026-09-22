/**
 * The core math solver: big question, visual helper, 4 tactile options,
 * lifelines and immediate feedback. Powers tile unlocks and street drills.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import type { MathProblem } from '../../types/game.types';
import { useGame } from '../../context/GameContext';
import TeacherTamar from '../classroom/TeacherTamar';
import TricksBookModal from '../classroom/TricksBookModal';
import SolverPlayArea, { type UsedLifelines } from './SolverPlayArea';
import SolverQuestion from './SolverQuestion';
import { useAnswerFeedback } from './useAnswerFeedback';
import { ENCOURAGE_HEBREW, FIFTY_FIFTY_REMOVALS, PRAISE_HEBREW, sampleOne } from './problemText';

interface ProblemSolverModalProps {
  problem: MathProblem;
  /** Tile being unlocked - used to load a retry problem and pay rewards. */
  tileId: string;
  /** Title of the district being unlocked, for context. */
  tileLabel: string;
  onClose: () => void;
  /** Called after a correct answer has been recorded + rewards paid. */
  onSolved: () => void;
  /** Bumping this re-mounts the solver and clears local state. */
  attempt?: number;
}

const COOKIES_PER_CORRECT = 5;

export default function ProblemSolverModal(props: ProblemSolverModalProps) {
  // Re-mounting on a new problem id / retry resets all local solver state.
  const { problem, attempt = 0 } = props;
  return <SolverSession key={`${problem.id}-${attempt}`} {...props} />;
}

function SolverSession({
  problem,
  tileId,
  tileLabel,
  onClose,
  onSolved,
}: ProblemSolverModalProps) {
  const { state, recordAnswer, loadProblemForTile } = useGame();
  const [picked, setPicked] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  const [used, setUsed] = useState<UsedLifelines>({});
  const [dotGridOn, setDotGridOn] = useState(false);
  const [eraserArmed, setEraserArmed] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [tricksOpen, setTricksOpen] = useState(false);
  const [praise, setPraise] = useState('');
  const feedback = useAnswerFeedback();

  const cookiesEarned = COOKIES_PER_CORRECT * state.streak.multiplier;

  const handlePick = (value: number) => {
    if (isCorrect !== null) return;
    const correct = value === problem.correctAnswer;
    setPicked(value);
    setIsCorrect(correct);
    setPraise(correct ? sampleOne(PRAISE_HEBREW) : sampleOne(ENCOURAGE_HEBREW));
    feedback(correct);
    // A successful eraser use forgives this mistake so the streak survives.
    recordAnswer(correct, tileId, !correct && eraserArmed);
    if (!correct && eraserArmed) setEraserArmed(false);
  };

  const handleFiftyFifty = () => {
    const wrong = problem.options.filter((option) => option !== problem.correctAnswer);
    const removable = wrong.slice(0, FIFTY_FIFTY_REMOVALS);
    setHidden((current) => [...current, ...removable]);
    setUsed((current) => ({ ...current, fiftyFifty: true }));
    setShowChallenge(false);
  };

  const handleRevealArray = () => {
    setDotGridOn(true);
    setUsed((current) => ({ ...current, dotGrid: true }));
  };

  const handleEraser = () => {
    setEraserArmed(true);
    setUsed((current) => ({ ...current, eraser: true }));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-stone-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`תרגיל: ${tileLabel}`}
    >
      <div
        dir="rtl"
        className="w-full max-w-2xl animate-[rise_.2s_ease-out] rounded-t-3xl border-4 border-amber-300 bg-amber-50 p-4 shadow-2xl sm:rounded-3xl sm:p-5"
      >
        <header className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור את התרגיל"
            className="ms-auto grid h-10 w-10 place-items-center rounded-2xl bg-white text-stone-500 shadow-[0_3px_0_rgba(0,0,0,0.15)] transition hover:bg-stone-100 active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <SolverQuestion
          problem={problem}
          tileLabel={tileLabel}
          cookiesEarned={cookiesEarned}
          shaking={isCorrect === false}
        />

        <TeacherTamar problem={problem} onOpenTricks={() => setTricksOpen(true)} />

        <SolverPlayArea
          problem={problem}
          hidden={hidden}
          picked={picked}
          isCorrect={isCorrect}
          praise={praise}
          used={used}
          dotGridOn={dotGridOn}
          eraserArmed={eraserArmed}
          showChallenge={showChallenge}
          cookiesEarned={cookiesEarned}
          onPick={handlePick}
          onFiftyFifty={handleFiftyFifty}
          onCancelChallenge={() => setShowChallenge(false)}
          onOpenChallenge={() => setShowChallenge(true)}
          onRevealArray={handleRevealArray}
          onToggleDotGrid={() => setDotGridOn((current) => !current)}
          onEraser={handleEraser}
          onContinue={onSolved}
          onRetry={() => loadProblemForTile(tileId, problem.type)}
        />
      </div>

      {tricksOpen && <TricksBookModal onClose={() => setTricksOpen(false)} />}
    </div>
  );
}
