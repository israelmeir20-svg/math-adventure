/**
 * The profile switcher.
 *
 * ================================================================================================
 * WHY THIS IS A PLAIN OVERLAY RATHER THAN `DistrictInteriorShell`
 * ================================================================================================
 *
 * Every other overlay in the app is a district interior - a full-bleed illustration with a wooden sign,
 * sized to stage a game. This one has no artwork and nothing to stage: it is a short list and one button,
 * and dressing it in a district frame would make switching sibling look like entering a level.
 *
 * It follows the same conventions the rest of the app's overlays do, though, because those are what make
 * a modal feel like part of the game: a dimmed backdrop that closes on tap, a `role="dialog"` with
 * `aria-modal`, Escape to close, `dir="rtl"` on the panel, and the shared `rise` entrance animation.
 */
import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { AVATARS, useProfiles } from '../../context/ProfileContext';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { profiles, activeProfileId, switchProfile, addProfile } = useProfiles();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);

  // Esc closes, matching every other overlay in the app.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /**
   * Creates the profile and closes.
   *
   * THE NEW PROFILE BECOMES ACTIVE IMMEDIATELY - `addProfile` does that itself - so there is no second
   * step asking the child to switch to the player they just made. The name is trimmed by the context; an
   * empty one falls back to the default rather than being rejected, because a sibling who taps through
   * without typing should still get a working profile rather than an error.
   */
  const create = () => {
    addProfile(name, avatar);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-900/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="בחירת שחקן"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-md animate-[rise_.2s_ease-out] flex-col gap-3 rounded-t-3xl border-4 border-amber-300/80 bg-gradient-to-b from-amber-50 to-amber-100 p-4 shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-black text-amber-900">מי משחק?</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-amber-300 text-amber-950 shadow-[0_3px_0_#b45309] transition hover:bg-amber-200 active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </header>

        {/*
          THE SIBLING LIST. A button per profile rather than a radio group, because tapping the row IS the
          action - there is no separate confirm, and making the child select then confirm would be two taps
          for one decision.
        */}
        <ul className="flex flex-col gap-2">
          {profiles.map((profile) => {
            const active = profile.id === activeProfileId;
            return (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => {
                    switchProfile(profile.id);
                    onClose();
                  }}
                  aria-current={active ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition ${
                    active
                      ? 'bg-amber-400 text-amber-950 shadow-[0_3px_0_#b45309]'
                      : 'bg-white/80 text-amber-900 shadow-[0_3px_0_#d6d3d1] hover:bg-white'
                  } active:translate-y-[2px] active:shadow-none`}
                >
                  <span aria-hidden className="text-2xl leading-none">
                    {profile.avatar}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-black">{profile.name}</span>
                  {/* The tick is the only thing marking the current player, so it is not colour alone. */}
                  {active && <Check className="h-5 w-5 shrink-0" strokeWidth={3} />}
                </button>
              </li>
            );
          })}
        </ul>

        {/*
          THE CREATE FORM IS REVEALED RATHER THAN ALWAYS OPEN. With one profile - the common case - an
          avatar grid and a text field on screen would be a lot of furniture for a screen whose only real
          content is one row.
        */}
        {creating ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-white/80 p-3 shadow-[0_3px_0_#d6d3d1]">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="שם השחקן"
              maxLength={16}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') create();
              }}
              className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-base font-black text-amber-900 outline-none placeholder:font-bold placeholder:text-amber-400 focus:border-amber-500"
            />

            {/* `aria-pressed` rather than a radio input: it is a one-of-many choice with no form submit. */}
            <div className="grid grid-cols-4 gap-1.5">
              {AVATARS.map((emoji) => {
                const chosen = emoji === avatar;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    aria-label={`בחירת ${emoji}`}
                    aria-pressed={chosen}
                    className={`grid h-11 place-items-center rounded-xl text-2xl transition ${
                      chosen
                        ? 'bg-amber-400 shadow-[0_3px_0_#b45309]'
                        : 'bg-amber-100 shadow-[0_3px_0_#e7e5e4] hover:bg-amber-200'
                    } active:translate-y-[2px] active:shadow-none`}
                  >
                    <span aria-hidden>{emoji}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={create}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#047857] transition hover:bg-emerald-400 active:translate-y-[2px] active:shadow-none"
              >
                יצירה
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setName('');
                }}
                className="rounded-xl bg-stone-200 px-4 py-2.5 text-sm font-black text-stone-700 shadow-[0_3px_0_#a8a29e] transition hover:bg-stone-100 active:translate-y-[2px] active:shadow-none"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 py-2.5 text-sm font-black text-white shadow-[0_3px_0_#4c1d95] transition hover:bg-violet-500 active:translate-y-[2px] active:shadow-none"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            שחקן חדש
          </button>
        )}
      </div>
    </div>
  );
}
