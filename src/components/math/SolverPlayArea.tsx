/**
 * The interactive half of the solver: options, lifelines and the
 * feedback panel. Split out so the modal shell stays small.
 */
import type { LifelineId, MathProblem } from '../../types/game.types';
import { useGame } from '../../context/GameContext';
import AnswerOptions from './AnswerOptions';
import FiftyFiftyChallenge from './FiftyFiftyChallenge';
import LifelinesBar from './LifelinesBar';
import SolverFeedback from './SolverFeedback';
import VisualHelper from './VisualHelper';

export type UsedLifelines = Partial<Record<LifelineId, boolean>>;

interface SolverPlayAreaProps {
  problem: MathProblem;
  hidden: number[];
  picked: number | null;
  isCorrect: boolean | null;
  praise: string;
  used: UsedLifelines;
  dotGridOn: boolean;
  eraserArmed: boolean;
  showChallenge: boolean;
  cookiesEarned: number;
  onPick: (value: number) => void;
  onFiftyFifty: () => void;
  onCancelChallenge: () => void;
  onOpenChallenge: () => void;
  onRevealArray: () => void;
  onToggleDotGrid: () => void;
  onEraser: () => void;
  onContinue: () => void;
  onRetry: () => void;
}

export default function SolverPlayArea({
  problem,
  hidden,
  picked,
  isCorrect,
  praise,
  used,
  dotGridOn,
  eraserArmed,
  showChallenge,
  cookiesEarned,
  onPick,
  onFiftyFifty,
  onCancelChallenge,
  onOpenChallenge,
  onRevealArray,
  onToggleDotGrid,
  onEraser,
  onContinue,
  onRetry,
}: SolverPlayAreaProps) {
  const { state } = useGame();

  return (
    <>
      {(dotGridOn || used.dotGrid) && (
        <div className="mb-4 rounded-2xl bg-white/70 p-3">
          <VisualHelper problem={problem} revealed showDotGrid={dotGridOn} />
        </div>
      )}

      {showChallenge && (
        <div className="mb-3">
          <FiftyFiftyChallenge onSolved={onFiftyFifty} onCancel={onCancelChallenge} />
        </div>
      )}

      <AnswerOptions
        options={problem.options}
        hidden={hidden}
        picked={picked}
        correctAnswer={problem.correctAnswer}
        isCorrect={isCorrect}
        onPick={onPick}
      />

      <div className="mt-4">
        <LifelinesBar
          charges={state.inventory.lifelines}
          disabled={isCorrect !== null}
          used={used}
          dotGridOn={dotGridOn}
          eraserArmed={eraserArmed}
          onFiftyFifty={onOpenChallenge}
          onRevealArray={onRevealArray}
          onToggleDotGrid={onToggleDotGrid}
          onEraser={onEraser}
        />
      </div>

      {isCorrect !== null && (
        <div className="mt-4">
          <SolverFeedback
            isCorrect={isCorrect}
            praise={praise}
            hintHebrew={problem.hintHebrew}
            cookiesEarned={cookiesEarned}
            streakMultiplier={state.streak.multiplier}
            eraserSaved={eraserArmed}
            onContinue={onContinue}
            onRetry={onRetry}
          />
        </div>
      )}
    </>
  );
}
