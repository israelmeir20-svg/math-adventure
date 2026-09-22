/**
 * "ספר הטריקים של תמר" - friendly mental-math shortcuts for 3rd graders.
 *
 * ================================================================================================
 * FOUR TABS RATHER THAN ONE LONG LIST
 * ================================================================================================
 *
 * See the note on `TRICK_TABS` for why the book is divided. What matters here is the interaction: a child
 * arrives stuck on a problem with ONE table in mind ("nines"), so the tabs are the fastest possible route
 * to a single chapter - one tap, and the other seven tricks are simply not on screen competing.
 *
 * THE NUMBERS ARE THE CONTENT AND THE PROSE IS THE FOOTNOTE. The example line is the largest thing in a
 * card, set in tabular figures so the columns of digits line up and the arithmetic can be read as
 * arithmetic rather than as a sentence. A third grader scanning this book is looking for a pattern in
 * digits, and a paragraph explaining that pattern is the slower path to it.
 *
 * THE CARD SHAPE IS SHARED WITH THE PROBLEM VIEW ON PURPOSE. Every trick here is reachable from a
 * question - Teacher Tamar's button opens this same modal - so the child sees one visual language for
 * "how this works" whether they arrived from the map or from a wrong answer.
 */
import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { TRICKS, TRICK_TABS, type TrickTabId } from './tricksData';

export default function TricksBookModal({ onClose }: { onClose: () => void }) {
  /*
   * THE FIRST TAB IS THE DEFAULT, AND IT IS THE ONE MOST CHILDREN NEED. The easy tables are where the
   * book is entered - a child who is confident enough to want the nines will tap once to get there, and
   * one who does not yet know where to start is never asked to choose before seeing anything useful.
   */
  const [tab, setTab] = useState<TrickTabId>(TRICK_TABS[0].id);
  const shown = TRICKS.filter((trick) => trick.tab === tab);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ספר הטריקים של תמר"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="flex max-h-[88vh] w-full max-w-2xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-violet-300 bg-violet-50 p-4 shadow-2xl sm:rounded-3xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3 flex shrink-0 items-center gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-[0_4px_0_rgba(0,0,0,0.12)]"
          >
            <BookOpen className="h-6 w-6 text-violet-600" />
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-black text-violet-900">ספר הטריקים של תמר</h2>
            <p className="text-sm font-bold text-violet-900/60">
              קיצורי דרך לחישוב מהיר בחשבון
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-stone-500 shadow-[0_3px_0_rgba(0,0,0,0.15)] transition hover:bg-stone-100 active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/*
          THE TAB STRIP SCROLLS HORIZONTALLY ON A PHONE RATHER THAN WRAPPING.
          Four Hebrew labels do not fit one row on a narrow screen, and a wrapped strip puts the fourth
          tab on a second line where it reads as a separate control rather than a sibling. A scroll keeps
          them one group; `shrink-0` stops the browser from squeezing the labels into ellipses.
        */}
        <div
          role="tablist"
          aria-label="פרקי הספר"
          className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1"
        >
          {TRICK_TABS.map((entry) => {
            const active = entry.id === tab;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.id)}
                className={`flex shrink-0 flex-col items-center rounded-2xl px-3 py-1.5 text-center transition ${
                  active
                    ? 'bg-violet-600 text-white shadow-[0_3px_0_#4c1d95]'
                    : 'bg-white/90 text-violet-900 shadow-[0_3px_0_rgba(0,0,0,0.1)] hover:bg-white'
                } active:translate-y-[2px] active:shadow-none`}
              >
                <span className="flex items-center gap-1 text-sm font-black whitespace-nowrap">
                  <span aria-hidden>{entry.emoji}</span>
                  {entry.label}
                </span>
                <span
                  className={`text-[10px] font-bold whitespace-nowrap ${
                    active ? 'text-violet-100' : 'text-violet-900/50'
                  }`}
                >
                  {entry.hint}
                </span>
              </button>
            );
          })}
        </div>

        {/* The panel scrolls, so a chapter with three cards still fits one screen height. */}
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((trick) => (
              <li
                key={trick.title}
                className="flex flex-col rounded-2xl bg-white/90 p-3 shadow-[0_4px_0_rgba(0,0,0,0.08)]"
              >
                <h3 className="mb-1 flex items-center gap-1.5 text-base font-black text-violet-900">
                  <span aria-hidden>{trick.emoji}</span>
                  {trick.title}
                </h3>

                {/*
                  THE EXAMPLE IS THE BIGGEST TEXT IN THE CARD, AND THAT IS THE WHOLE POINT OF THE OVERHAUL.
                  It was a small pill under a paragraph, which made the explanation the headline and the
                  arithmetic a footnote - backwards for a reference a child opens mid-problem. Tabular
                  figures and `text-lg` make the digits scannable; `dir="ltr"` keeps the equation reading
                  left-to-right even though the card is in an RTL document, because "70 − 7 = 63" reversed
                  would be nonsense.
                */}
                <p
                  dir="ltr"
                  className="mb-2 rounded-xl bg-violet-100 px-3 py-2 text-center text-lg font-black tabular-nums text-violet-900"
                >
                  {trick.example}
                </p>

                <p className="text-sm font-bold leading-snug text-stone-600">{trick.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
