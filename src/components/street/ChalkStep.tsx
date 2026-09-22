/**
 * One square of chalk hopscotch on asphalt.
 *
 * The tile is drawn rather than filled: a hand-drawn chalk border in one of
 * three pastel chalks, with the choices written straight onto the asphalt in
 * chalk lettering. Once a square is cleared it keeps a pair of stamped
 * footprints, so the route behind the player visibly accumulates.
 */
import { CHOICE_STYLES, CHALK_BORDERS } from './chalkStyles';

interface ChalkStepProps {
  index: number;
  choices: number[];
  cleared: boolean;
  isCurrent: boolean;
  /** The wrong choice, briefly, so only that number shakes. */
  wrongChoice: number | null;
  /** A hop landed on this square just now - drives the dust puff. */
  justLanded: boolean;
  isLast: boolean;
  onChoose: (choice: number) => void;
}

export default function ChalkStep({
  index,
  choices,
  cleared,
  isCurrent,
  wrongChoice,
  justLanded,
  isLast,
  onChoose,
}: ChalkStepProps) {
  const chalk = CHALK_BORDERS[index % CHALK_BORDERS.length]!;

  return (
    <div className="relative w-full px-1">
      <div
        className={`relative flex w-full flex-wrap items-center justify-center gap-2 rounded-[18px] border-[3px] px-3 py-3 transition-opacity duration-300 ${
          isLast ? CHALK_BORDERS[2]!.border : chalk.border
        } ${isCurrent ? 'animate-[chalkIn_.28s_ease-out]' : ''} ${
          cleared ? 'opacity-70' : ''
        }`}
      >
        {/* Step number, scrawled in the corner like a real pavement game. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -top-4 start-3 text-xs font-black ${
            isLast ? 'text-emerald-200' : 'text-white/45'
          }`}
        >
          {index + 1}
        </span>

        {isLast && (
          <span className="pointer-events-none absolute -top-3 end-3 rounded-full bg-emerald-400/90 px-2 py-0.5 text-[10px] font-black text-emerald-950">
            קו הסיום 🏁
          </span>
        )}

        {choices.map((choice) => {
          const isWrong = wrongChoice === choice;
          const style = CHOICE_STYLES[choice % CHOICE_STYLES.length]!;
          // Only the active square accepts taps; cleared and future squares are
          // inert so a stray tap can never skip a step.
          return (
            <button
              key={choice}
              type="button"
              disabled={!isCurrent}
              onClick={() => onChoose(choice)}
              aria-label={`${choice}${cleared ? ' (כבר דילגתם)' : ''}`}
              className={`rounded-[14px] border-[3px] border-dashed px-4 py-2 text-2xl font-black tabular-nums transition ${
                isCurrent
                  ? 'cursor-pointer active:scale-95'
                  : 'cursor-default'
              } ${style} ${isWrong ? 'animate-[shake_.4s_ease-in-out]' : ''} ${
                cleared ? 'opacity-40' : ''
              } ${!isCurrent && !cleared ? 'opacity-60' : ''}`}
            >
              {choice}
            </button>
          );
        })}

        {/* Permanent chalk footprints once this square has been cleared. */}
        {cleared && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-1 flex animate-[stampIn_.35s_ease-out] justify-center gap-1 text-2xl leading-none"
          >
            <span className="-rotate-12">👣</span>
            <span className="rotate-6">👣</span>
          </span>
        )}

        {justLanded && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-[chalkDust_.5s_ease-out_forwards] rounded-[18px] bg-[radial-gradient(circle,rgba(255,255,255,0.75)_0%,transparent_65%)]"
          />
        )}
      </div>
    </div>
  );
}
