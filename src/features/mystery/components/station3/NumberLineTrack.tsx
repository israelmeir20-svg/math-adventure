/**
 * The number line every chase runs on.
 *
 * ================================================================================================
 * WHY IT IS A COMPONENT AND NOT PART OF EACH CHASE
 * ================================================================================================
 *
 * The four chases differ in their decoration - nets, puddles, gates, burrows - but they all need the
 * same line: a ribbon from 0 to 30, a tick at every unit, a labelled milestone every five, and the
 * numerals in the same place. Drawn four times, the four would drift, and a child moving between
 * cases would be reading a subtly different ruler each time.
 *
 * ================================================================================================
 * THE LABELS ARE RTL, THE NUMBERS ARE NOT
 *
 * The app is Hebrew and the stage is `dir="rtl"`, but a number line does not run that way in any
 * classroom: 0 is at the left and 30 at the right, and arithmetic to the right means "further". So
 * every label here is written with `direction: ltr` and `unicode-bidi: plaintext`, which keeps the
 * digits reading correctly under an RTL ancestor WITHOUT reversing the line. Getting this wrong
 * would put 0 on the right and turn every leap into a subtraction.
 *
 * ================================================================================================
 * TICKS ARE DRAWN IN NORMALISED UNITS, STROKES IN PIXELS
 *
 * The stage stretches a 1x1 viewBox across a wide box, so a tick specified in viewBox units would
 * be a different physical length vertically than horizontally. Every stroke therefore carries
 * `vectorEffect="non-scaling-stroke"` and a width in CSS pixels, so the ruler looks the same on a
 * phone and a desktop.
 */
import { CHASE_PALETTE, LINE_INSET, LINE_Y, MAJOR_STEP, SCALE_MAX, SCALE_MIN, xForValue } from '../../station3Geometry';

interface NumberLineTrackProps {
  /**
   * Numbers to highlight as part of the puzzle, if any.
   *
   * The chases pass their `options` here so the child can see which positions are in play before
   * choosing. They are marked with a tick rather than a label, because the labels belong to the
   * milestones and a fourth set of numbers on the line would be unreadable.
   */
  marks?: number[];
  /** Which of `marks` is currently held, if any. */
  selected?: number | null;
  /** Numbers to show as struck through, after a wrong attempt. */
  missed?: number[];
  /** Draws on top of the line: the runners, nets and signposts of a specific chase. */
  children?: React.ReactNode;
}

export default function NumberLineTrack({
  marks = [],
  selected = null,
  missed = [],
  children,
}: NumberLineTrackProps) {
  const marksSet = new Set(marks);
  const missedSet = new Set(missed);

  // Every unit from 0 to 30, so the line is countable rather than merely suggesting a scale.
  const units: number[] = [];
  for (let v = SCALE_MIN; v <= SCALE_MAX; v += 1) units.push(v);

  return (
    <g data-testid="number-line">
      {/*
        THE TRACK RIBBON.
        A dark band under the line, so the numerals stay readable over the pale dirt and the line
        reads as a ruler laid on the ground rather than as a scratch in the photograph.
      */}
      <rect
        x={LINE_INSET * 0.4}
        y={LINE_Y - 0.085}
        width={1 - LINE_INSET * 0.8}
        height={0.175}
        rx={0.02}
        fill={CHASE_PALETTE.ribbon}
      />

      {/* The line itself, extending a little past 0 and 30 so they do not look cut off. */}
      <line
        x1={xForValue(SCALE_MIN) - 0.022}
        y1={LINE_Y}
        x2={xForValue(SCALE_MAX) + 0.022}
        y2={LINE_Y}
        stroke={CHASE_PALETTE.line}
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />

      {/* ---- The ticks. ---- */}
      {units.map((value) => {
        const x = xForValue(value);
        const isMajor = value % MAJOR_STEP === 0;
        const marked = marksSet.has(value);
        const isMissed = missedSet.has(value);
        const isSelected = selected === value;

        // Unit ticks are short and faint; milestones are long and bright. The difference in height
        // is what makes the ruler readable at a glance without reading any number.
        const height = isMajor ? 0.03 : 0.016;
        let stroke: string = isMajor ? CHASE_PALETTE.milestone : CHASE_PALETTE.tick;
        if (marked) stroke = isSelected ? CHASE_PALETTE.active : CHASE_PALETTE.milestone;
        if (isMissed) stroke = CHASE_PALETTE.error;

        return (
          <line
            key={`tick-${value}`}
            x1={x}
            y1={LINE_Y}
            x2={x}
            y2={LINE_Y + height}
            stroke={stroke}
            strokeWidth={isSelected ? 5 : isMajor ? 3 : 1.5}
            vectorEffect="non-scaling-stroke"
            data-testid={`tick-${value}`}
          />
        );
      })}

      {/* ---- The numerals, at every milestone. ---- */}
      {units
        .filter((value) => value % MAJOR_STEP === 0)
        .map((value) => (
          <text
            key={`label-${value}`}
            x={xForValue(value)}
            y={LINE_Y + 0.075}
            textAnchor="middle"
            fontSize="0.042"
            fontWeight="900"
            fill={CHASE_PALETTE.milestone}
            /*
              `direction: ltr` IS LOAD-BEARING. The stage inherits `dir="rtl"` from the Hebrew app,
              and without this a two-digit label renders with the digits in the wrong order - "12"
              would read as "21", which on a number line is not a cosmetic bug but a wrong answer.
            */
            style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
          >
            {value}
          </text>
        ))}

      {/* ---- A ring on each marked position, so the options are visible before choosing. ---- */}
      {marks.map((value) => {
        const x = xForValue(value);
        const isSelected = selected === value;
        const isMissed = missedSet.has(value);
        return (
          <ellipse
            key={`mark-${value}`}
            cx={x}
            cy={LINE_Y}
            rx={0.022}
            ry={0.022 / 1.792}
            fill="none"
            stroke={isMissed ? CHASE_PALETTE.error : isSelected ? CHASE_PALETTE.active : 'rgba(255,255,255,0.55)'}
            strokeWidth={isSelected ? 4 : 2}
            vectorEffect="non-scaling-stroke"
            data-testid={`mark-${value}`}
          />
        );
      })}

      {children}
    </g>
  );
}
