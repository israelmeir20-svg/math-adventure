/**
 * The cash register drawer: the money the child can hand back.
 *
 * THE DRAWER IS PART OF THE LESSON, WHICH IS WHY IT IS A DRAWER AND NOT A PALETTE.
 * The register a level offers is a claim about which arithmetic is being taught -
 * Level 1 hides the 50 and the 100 because a child who can reach for a 50 note
 * stops subtracting entirely and starts covering. So the drawer renders exactly
 * the list the level hands it, in a fixed ascending order, and never a coin more.
 *
 * It is built as a wooden tray with the coins in the near well and the notes in
 * the far one, which is both how a real till is laid out and what keeps the seven
 * denominations from reading as one undifferentiated row of buttons. The wood is
 * semi-transparent so the kiosk interior still shows through underneath.
 *
 * THE CAPTION AND THE VALUE LABELS ARE GONE. A caption reading "בחרו מטבעות
 * ושטרות" over a picture of money is pure noise, and every label under every coin
 * repeated a number that is printed on the note itself at four times the size.
 * The artwork is the label. Removing both is what bought the room to enlarge the
 * money, which matters far more: a child has to READ a 20 and a 50 to pick
 * between them, and that is the entire skill this game is training.
 */
import { MoneyImage } from './KioskCounter';
import { isCoin, type Money } from './kioskMoney';

interface KioskDrawerProps {
  /** Exactly the denominations this level allows. */
  register: readonly Money[];
  onTake: (value: Money) => void;
  /** True while the celebration is running; the drawer is frozen. */
  frozen: boolean;
}

/**
 * A coin 25 to 30 percent larger than it was, and a note scaled to match.
 *
 * These are absolute pixels rather than Tailwind steps because the sizes have to
 * stay proportional to one another across the shapes: a note is drawn 1.7 times
 * as wide as it is tall, so a naive `w-16 h-16` on the wrapper would letterbox
 * it. `MoneyImage` owns the aspect ratio and these numbers only set the scale.
 */
const COIN_PX = 62;
const NOTE_PX = 84;

export default function KioskDrawer({ register, onTake, frozen }: KioskDrawerProps) {
  const coins = register.filter(isCoin);
  const notes = register.filter((value) => !isCoin(value));

  return (
    <section className="shrink-0 rounded-2xl border-2 border-amber-900/60 bg-gradient-to-b from-amber-800/80 to-amber-950/80 p-2 shadow-[0_6px_16px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.12)]">
      <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2">
        {/* Coins in the near well. */}
        {coins.length > 0 && (
          <div className="flex items-end gap-2 rounded-xl bg-amber-950/40 px-2.5 py-2">
            {coins.map((value) => (
              <DrawerButton key={value} value={value} onTake={onTake} frozen={frozen} />
            ))}
          </div>
        )}

        {/* Notes in the far well. */}
        {notes.length > 0 && (
          <div className="flex items-end gap-2 rounded-xl bg-amber-950/40 px-2.5 py-2">
            {notes.map((value) => (
              <DrawerButton key={value} value={value} onTake={onTake} frozen={frozen} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DrawerButton({
  value,
  onTake,
  frozen,
}: {
  value: Money;
  onTake: (value: Money) => void;
  frozen: boolean;
}) {
  const coin = isCoin(value);
  return (
    <button
      type="button"
      onClick={() => onTake(value)}
      disabled={frozen}
      aria-label={`הוסף ${value} שקלים`}
      className="group grid place-items-center rounded-xl p-1 transition duration-150 hover:-translate-y-2 hover:scale-[1.08] hover:brightness-110 active:translate-y-0 active:scale-95 disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:scale-100 motion-safe:active:animate-[popBounce_.25s_ease-out]"
    >
      <MoneyImage value={value} size={coin ? COIN_PX : NOTE_PX} />
    </button>
  );
}
