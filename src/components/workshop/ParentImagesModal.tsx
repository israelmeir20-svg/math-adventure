/**
 * The parent photo manager for the mystery mosaic.
 *
 * This is the one screen in the game written for an ADULT, not a child, and it is
 * deliberately plainer for it: no bouncing, no rewards, no oversized tap targets.
 * A parent is here to accomplish a task, and a screen that treats them like a
 * seven-year-old is slower to use.
 *
 * IT IS REACHED FROM A SMALL CAMERA BUTTON IN THE CORNER of the studio header
 * rather than being a mode, so a child never lands here by accident while tapping
 * around the puzzle.
 */
import { useRef, useState } from 'react';
import { Trash2, Upload, X } from 'lucide-react';
import {
  MAX_IMAGES,
  type CustomImagesHandle,
} from './useCustomImages';

interface ParentImagesModalProps {
  images: CustomImagesHandle;
  onClose: () => void;
}

export default function ParentImagesModal({ images, onClose }: ParentImagesModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    setMessage(null);
    const { added, error } = await images.add(files);
    setBusy(false);
    if (error) setMessage(error);
    else if (added > 0) setMessage(`נוספו ${added} תמונות ✓`);
    // Clear the input so re-picking the SAME file fires `change` again.
    if (inputRef.current) inputRef.current.value = '';
  };

  const full = images.images.length >= MAX_IMAGES;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="הגדרת תמונות אישיות"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-2 border-slate-300 bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <span aria-hidden className="text-xl">📷</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900">הגדרת תמונות אישיות</h2>
            <p className="text-[11px] font-bold text-slate-500">
              הוסיפו תמונות משלכם והן יופיעו בחידות
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-90"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {/* The picker. A real <input type="file"> behind a styled label, because
              the native control cannot be restyled and a div cannot open it. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={(event) => void onFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={busy || full}
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-black text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 active:translate-y-[2px] disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {busy ? 'מעבד תמונות…' : full ? `הגעתם למקסימום (${MAX_IMAGES})` : 'בחירת תמונות מהמכשיר'}
          </button>

          {message && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800">
              {message}
            </p>
          )}

          {images.images.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-3 py-6 text-center text-xs font-bold text-slate-500">
              עדיין אין תמונות אישיות. החידות ישתמשו בתמונות המצוירות של המשחק.
            </p>
          ) : (
            <>
              <p className="text-[11px] font-black text-slate-500">
                {images.images.length} מתוך {MAX_IMAGES} תמונות
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {images.images.map((image) => (
                  <li key={image.id} className="relative">
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="aspect-square w-full rounded-xl border-2 border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => images.remove(image.id)}
                      aria-label={`מחיקת ${image.name}`}
                      className="absolute -end-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white shadow-md transition hover:bg-rose-600 active:scale-90"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <p className="mt-1 truncate text-[10px] font-bold text-slate-500">
                      {image.name}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Storage note. A parent who uploads twenty photos deserves to know
              why the eighth was refused. */}
          <p className="text-[10px] font-bold leading-relaxed text-slate-400">
            התמונות נשמרות במכשיר הזה בלבד ואינן נשלחות לשום מקום. כל תמונה מוקטנת
            אוטומטית כדי לחסוך מקום.
          </p>
        </div>
      </div>
    </div>
  );
}
