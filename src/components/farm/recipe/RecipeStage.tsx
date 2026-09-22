/**
 * The kitchen stage for "המתכון של השף".
 *
 * TWO ZONES, ONE READING ORDER. The top bar holds the sequence being built; the
 * centre holds whatever the chef is showing right now. At no point do both do
 * work at once, which is what makes the game easy to follow: during the reveal
 * the child watches ONE card and the bar fills itself, and during input the bar
 * is the only thing that changes.
 *
 * THE BAR IS LAID OUT LEFT TO RIGHT ON PURPOSE. It is a sequence in time, not a
 * Hebrew sentence, so slot 1 is the leftmost - the same left-to-right order the
 * D-Pad arrows use. Hebrew text elsewhere in the app stays RTL; this row sets
 * `dir="ltr"` so the two orders cannot disagree.
 */
import type { RecipePhase, RecipeRound } from './recipeTypes';

interface RecipeStageProps {
  round: RecipeRound;
  phase: RecipePhase;
  /** How many slots are filled: the reveal cursor, or the child's progress. */
  filled: number;
  /** True while the just-entered slot should shake red. */
  shake?: boolean;
}

const SLOT = 54;
const GAP = 12;

export default function RecipeStage({ round, phase, filled, shake = false }: RecipeStageProps) {
  const total = round.sequence.length;
  const rowWidth = total * SLOT + (total - 1) * GAP;
  const startX = 400 - rowWidth / 2;
  const memorizing = phase === 'memorize';
  const showing = round.sequence[Math.min(filled, total - 1)]?.ingredient;

  return (
    <svg
      viewBox="0 0 800 360"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full select-none"
    >
      {/* Kitchen backdrop: warm wall, tiled splashback, wooden counter. */}
      <rect x="0" y="0" width="800" height="230" fill="#fdf3e3" />
      <rect x="0" y="196" width="800" height="34" fill="#e8d5b7" />
      <rect x="0" y="230" width="800" height="130" fill="#b08968" />
      <rect x="0" y="230" width="800" height="7" fill="#8a6647" />

      {/* The sequence bar. `direction: ltr` rather than a `dir` attribute,
          which is not valid on an SVG group. */}
      <g style={{ direction: 'ltr' }}>
        {round.sequence.map((step, index) => {
          const x = startX + index * (SLOT + GAP);
          const done = index < filled;
          const isNext = shake && index === filled;
          return (
            <g key={`slot-${index}`}>
              <rect
                x={x}
                y={26}
                width={SLOT}
                height={SLOT}
                rx="12"
                fill={done ? '#fffdf5' : 'rgba(255,255,255,0.45)'}
                stroke={isNext ? '#e11d48' : done ? '#c98a2c' : '#c9b79a'}
                strokeWidth={isNext ? 4 : 2.5}
                strokeDasharray={done ? undefined : '7 6'}
              />
              {done && (
                <image
                  href={step.ingredient.spriteUrl}
                  x={x + 9}
                  y={35}
                  width={36}
                  height={36}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}
              {isNext && (
                <text
                  x={x + SLOT / 2}
                  y={26 + SLOT / 2 + 5}
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="900"
                  fill="#e11d48"
                >
                  ✕
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* The centre spotlight: the chef's card, or the child's cue. */}
      {memorizing && showing ? (
        <g>
          <rect
            x="345"
            y="95"
            width="110"
            height="110"
            rx="20"
            fill="#ffffff"
            stroke="#c98a2c"
            strokeWidth="4"
          />
          <image
            href={showing.spriteUrl}
            x="362"
            y="112"
            width="76"
            height="76"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      ) : (
        <text
          x="400"
          y="158"
          textAnchor="middle"
          fontSize="22"
          fontWeight="900"
          fill="#8a6647"
        >
          {phase === 'wrong' ? 'אופס!' : phase === 'right' ? 'מעולה!' : 'התור שלך'}
        </text>
      )}
    </svg>
  );
}
