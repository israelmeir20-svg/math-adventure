/**
 * Station 3 - the chase, where the case is closed or lost.
 *
 * ================================================================================================
 * THIS FILE IS A DISPATCHER, NOT A CHASE
 * ================================================================================================
 *
 * The case carries a `type`, and there are four genuinely different chases behind it: a net on a
 * post, a puddle with a key in it, two runners meeting at a gate, and a burrow to dig out. They
 * share the number line and the two callbacks and nothing else, so all this component does is pick
 * one, size it to the screen, and remind the child what they are working with.
 *
 * ================================================================================================
 * `solutionX` IS A PROP RATHER THAN A READ OF `config.targetPosition`
 * ================================================================================================
 *
 * That is the point of the whole three-station design. The number used here is the one the CHILD
 * produced in station 2, so a wrong answer in the notebook produces a chase aimed at the wrong
 * place. If this read the case file instead, every chase would be winnable regardless of the
 * previous two stations and the arithmetic would stop mattering.
 *
 * The two numbers are genuinely different in the shipped cases - `targetPosition` is a point on the
 * chase's own line, not the notebook's unknown - so this component does NOT compare them, and the
 * four chases below derive their own answers from `solutionX` rather than from `targetPosition`.
 * That keeps the child's answer load-bearing while letting each chase compute the position its own
 * story arrives at.
 *
 * ================================================================================================
 * THE ERROR CALLBACK IS A RECORD, NOT A FAILURE
 * ================================================================================================
 *
 * `onComplete` means the suspect was caught and the case may close. `onError` means the child tried
 * and missed: it increments the error counter and nothing else. No chase here is abandoned, no
 * attempt is limited, and a wrong choice leaves the board playable so the child can try again -
 * which is deliberate, because a child who is ejected for guessing stops guessing and stops
 * learning.
 */
import type { Station3Config } from '../caseData';
import AmbushChase from './station3/AmbushChase';
import BurrowChase from './station3/BurrowChase';
import IntersectionChase from './station3/IntersectionChase';
import PuddleChase from './station3/PuddleChase';

interface Station3ChaseProps {
  config: Station3Config;
  /** The unknown the child solved for in Station 2. Drives every chase's arithmetic. */
  solutionX: number;
  onComplete: () => void;
  onError: () => void;
}

export default function Station3Chase({
  config,
  solutionX,
  onComplete,
  onError,
}: Station3ChaseProps) {
  const chaseProps = { config, solutionX, onComplete, onError };

  return (
    /*
      NO CARD, NO MISSION HEADER - the chase is the track and nothing else.

      This used to be an indigo `rounded-3xl border-4` panel with a title, an instruction line and
      a step badge above the number line. The title and instruction were the same sentence the top
      bar now shows, so they are gone; the badge stays, because it is the one thing here that is
      NOT duplication - the chase runs on the child's own answer and showing it back is what keeps
      the arithmetic visible rather than hidden in the notebook.

      `flex-1 min-h-0` hands the track the rest of the column so `PuzzleStage` can size the path
      artwork from the height actually available.
    */
    <section
      dir="rtl"
      aria-label={config.title}
      className="flex w-full min-h-0 flex-1 flex-col items-center justify-center"
      data-testid="station3"
      data-chase={config.type}
    >
      {/*
        THE REMINDER BADGE.
        The chase's arithmetic is done with the child's own answer, so it is shown back to them
        throughout rather than left in the notebook. Without it the child would be doing a
        multiplication they cannot see the input to - and a chase that runs on an invisible
        number teaches nothing about the number.

        The value is rendered `direction: ltr` because the app is RTL: a bare number under an RTL
        ancestor is fine, but it sits beside a Hebrew label and mixing the two without pinning the
        direction is how a two-digit answer ends up reading backwards.
      */}
      <span
        className="mb-2 shrink-0 rounded-xl border-2 border-amber-900/25 bg-white/90 px-3 py-1.5 text-[11px] font-black text-indigo-900"
        data-testid="step-badge"
      >
        צעד הגנב:{' '}
        <span style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>X = {solutionX}</span>
      </span>

      {/*
        THE PUZZLE IS KEYED ON THE CASE AND THE ANSWER.
        Re-running the same chase type with a different `solutionX` - which is exactly what happens
        on a replay, since the case is re-drawn at random - would otherwise reuse the previous run's
        state: a solved board, or worse a board mid-animation. Keying means a new answer always
        mounts a fresh chase.
      */}
      <div
        key={`${config.type}-${solutionX}`}
        className="relative min-h-0 w-full flex-1"
      >
        {config.type === 'ambush' && <AmbushChase {...chaseProps} />}
        {config.type === 'puddle' && <PuddleChase {...chaseProps} />}
        {config.type === 'common-multiple' && <IntersectionChase {...chaseProps} />}
        {config.type === 'burrow' && <BurrowChase {...chaseProps} />}
      </div>
    </section>
  );
}
