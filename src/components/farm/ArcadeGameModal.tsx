/**
 * Standalone host for a farm arcade station.
 *
 * The farm hub renders a station as a bare body inside its own shell, so the
 * station itself owns no backdrop, no close button and no cookie bookkeeping -
 * `FarmModal` does all three. Reaching a station straight from a town-map anchor
 * leaves nobody to do that job, and this is the nobody: the smallest possible
 * shell that still pays a medal's cookies and gives the child a way out.
 *
 * It deliberately does NOT reuse `MiniGameShell`. That shell draws its own
 * header, which would sit above the station's own `*Header` status bar (round,
 * score, clock) and duplicate the title. The station already looks like a game;
 * it only needed a frame and an exit.
 *
 * Rewards are fire-and-forget: there is no medal board out here, so the cookies
 * are paid and the run ends. A gold run still celebrates, because the cheer is
 * the child's only feedback that they nailed it.
 */
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { GameMetaKey } from '../kingdom/districtRouting';
import {
  GOLD_MEDALS_PER_LEVEL,
  LEVELS,
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import type { FarmMedal } from './farmTimerData';

/**
 * The contract is spelled out here rather than imported from `farmStations`.
 *
 * Only two things need the wider shape - this host and the two station wrappers -
 * so declaring it locally keeps them off `farmStations` and means a station file
 * never has to be touched when a wrapper is added.
 */
interface HostedStationProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /** Heading the station shows, e.g. "חווה · סל הפיקניק". */
  titleLine?: string;
  /**
   * Handed down so the station's own end-of-run card can offer a way out. The
   * frame's ✕ sits at the top of a scrolling document, so once the results card
   * covers the game the child has nothing to aim at; the card needs its own.
   */
  onClose?: () => void;
  /**
   * The level chosen on the launch card, passed down to the station.
   *
   * DECLARED OPTIONAL, AND THE STATIONS ALL DEFAULT IT. The host is also used by stations whose
   * launch card has not been wired to a level yet, and a required prop would have turned that into
   * a type error in files this change has no business editing.
   */
  level?: StationLevel;
}

interface ArcadeGameModalProps {
  /** Standalone station to host. */
  Game: ComponentType<HostedStationProps>;
  /** Heading the station shows, e.g. "חווה · סל הפיקניק". */
  title: string;
  /** Emoji for the floating exit bubble. */
  icon: string;
  /** Shows the shared launch card before the station mounts. */
  launchMeta?: GameMetaKey;
  onClose: () => void;
}

export default function ArcadeGameModal({
  Game,
  title,
  icon,
  launchMeta,
  onClose,
}: ArcadeGameModalProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();

  /**
   * Whether the child has got past the launch card.
   *
   * A CARD IS SWAPPED IN FOR THE WHOLE FRAME RATHER THAN LAYERED OVER IT. `GameLaunchModal` is a
   * full-screen dialog, and these stations deal their first round AND start their own clock on
   * mount - so a card drawn on top of a running game would burn the child's opening seconds behind
   * a panel. Returning the card instead of the frame keeps the game unmounted until play is pressed.
   *
   * For the same reason this is initialised, not toggled: a station with no card is already
   * "launched" and must not flash a launch screen it never wanted.
   */
  const [launched, setLaunched] = useState(launchMeta === undefined);

  /**
   * The level the card was set to when play was pressed.
   *
   * THE SHELL HAS TO CARRY THIS, not the game, because the card is rendered before the game is
   * mounted - the game has no chance to read the selection for itself. It is handed down as the
   * `level` prop that every station's game now accepts.
   */
  const [level, setLevel] = useState<StationLevel>(1);

  /**
   * The station's progression, for the level strip.
   *
   * KEYED ON `launchMeta`, WHICH IS THE STATION'S PROGRESSION KEY. The hook requires a key even
   * when there is no card, so a station hosted without one is read under an empty string - which
   * is a key nothing ever writes, and therefore always returns the fresh record. That keeps the
   * hook call unconditional without inventing a second code path for the no-card case.
   */
  const { progress } = useStationProgress(launchMeta ?? '');

  /**
   * Remount token. `Game` seeds its round and starts its clock once on mount, so
   * replaying has to mean a genuinely new component: resetting pieces of it from
   * out here would mean reaching into state this shell cannot see.
   */
  const [run, setRun] = useState(0);

  // Esc closes, matching every other overlay in the app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleReward = useCallback(
    (medal: FarmMedal) => {
      addCookies(medal.cookies);
      if (medal.id === 'gold') feedback.celebrate();
      else feedback(true);
    },
    [addCookies, feedback],
  );

  if (!launched && launchMeta) {
    return (
      <GameLaunchModal
        meta={launchMeta}
        onStart={(chosen) => {
          setLevel(chosen);
          setLaunched(true);
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
        <div className="relative w-full">
          <span
            aria-hidden
            className="sticky top-0 z-10 float-right grid h-10 w-10 place-items-center rounded-2xl bg-white text-xl shadow-[0_3px_0_rgba(0,0,0,0.35)]"
          >
            {icon}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="sticky top-0 z-10 float-left grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_3px_0_rgba(0,0,0,0.35)] transition active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>

          {/*
            A LEVEL-BY-LEVEL STRIP, SHOWN ONLY ONCE A STATION IS IN PROGRESSION.
            ---------------------------------------------------------------------
            `launchMeta` doubles as the progression key: a station hosted without one - the clock,
            which keeps its own single-difficulty flow for now - has no ladder to choose from, and
            rendering three chips over it would offer a choice the game cannot honour. So the strip
            appears exactly where a card was pressed and a level was captured.
          */}
          {launchMeta && (
            <div dir="rtl" className="mb-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-black text-white/70">בחרו רמה</span>
              {LEVELS.map((value) => {
                const unlocked = value <= progress.unlockedLevel;
                const selected = unlocked && value === level;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!unlocked}
                    aria-pressed={selected}
                    onClick={() => setLevel(value)}
                    className={`rounded-2xl px-3 py-1.5 text-xs font-black transition ${
                      selected
                        ? 'bg-emerald-500 text-white shadow-[0_3px_0_#047857]'
                        : unlocked
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'cursor-not-allowed bg-white/5 text-white/30'
                    }`}
                  >
                    רמה {value} · {progress.medals[value]}/{GOLD_MEDALS_PER_LEVEL}
                  </button>
                );
              })}
            </div>
          )}

          <Game
            key={run}
            level={level}
            onReward={handleReward}
            titleLine={title}
            onClose={onClose}
          />

          {/* The station deals round 1 and starts its own 30s clock on mount, so a
              fresh run only needs a fresh component. */}
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setRun((n) => n + 1)}
              className="rounded-2xl bg-white/15 px-4 py-2 text-xs font-black text-white transition hover:bg-white/25 active:translate-y-[2px]"
            >
              סיבוב חדש
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
