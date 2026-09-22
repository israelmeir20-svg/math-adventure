/**
 * Vibrant inline SVG scenes for the Mystery Picture reveal.
 *
 * These are hand-authored rather than bitmaps: no binary asset, no network
 * request, and perfectly crisp when a single scene is sliced into nine tiles
 * and scaled. Each is drawn on a 300 x 300 canvas with a full-bleed background
 * rectangle, so every one of the nine slices has opaque colour behind it -
 * a transparent region would let the frosted tile show through and spoil the
 * reveal.
 */

/** Every scene shares the same square canvas the grid slices. */
export const SCENE_SIZE = 300;

export interface MysteryScene {
  id: string;
  /** Shown in the header and in the completion message. */
  name: string;
  /** The scene body, drawn on a 300 x 300 viewBox. */
  body: string;
  /** Full-bleed backdrop, painted first so no slice is ever transparent. */
  background: string;
}

export const MYSTERY_SCENES: MysteryScene[] = [
  {
    id: 'sunset-balloon',
    name: 'כדור פורח בשקיעה',
    background: '<rect width="300" height="300" fill="url(#skySunset)"/>',
    body: `
      <circle cx="232" cy="62" r="30" fill="#fde68a"/>
      <circle cx="232" cy="62" r="46" fill="#fbbf24" opacity="0.28"/>
      <path d="M0 250 Q75 196 150 236 T300 226 L300 300 L0 300 Z" fill="#15803d"/>
      <path d="M0 274 Q90 232 180 268 T300 258 L300 300 L0 300 Z" fill="#166534"/>
      <ellipse cx="118" cy="108" rx="46" ry="54" fill="#ef4444"/>
      <ellipse cx="118" cy="108" rx="30" ry="54" fill="#f97316"/>
      <ellipse cx="118" cy="108" rx="13" ry="54" fill="#fbbf24"/>
      <path d="M96 156 L104 180 M140 156 L132 180" stroke="#78350f" stroke-width="3"/>
      <rect x="98" y="178" width="40" height="30" rx="6" fill="#a16207"/>
      <rect x="98" y="188" width="40" height="4" fill="#78350f"/>
      <path d="M40 74 q14 -14 28 0 q-14 -6 -28 0" fill="#ffffff" opacity="0.85"/>
      <path d="M186 190 q16 -16 32 0 q-16 -7 -32 0" fill="#ffffff" opacity="0.7"/>
    `,
  },
  {
    id: 'rocket-launch',
    name: 'רקטה בחלל',
    background: '<rect width="300" height="300" fill="url(#skySpace)"/>',
    body: `
      <circle cx="52" cy="58" r="7" fill="#fef08a"/>
      <circle cx="246" cy="42" r="5" fill="#fef08a"/>
      <circle cx="222" cy="118" r="4" fill="#ffffff" opacity="0.8"/>
      <circle cx="74" cy="150" r="4" fill="#ffffff" opacity="0.8"/>
      <circle cx="264" cy="212" r="5" fill="#fef08a"/>
      <circle cx="34" cy="232" r="4" fill="#ffffff" opacity="0.7"/>
      <circle cx="196" cy="86" r="16" fill="#a78bfa" opacity="0.5"/>
      <circle cx="196" cy="86" r="10" fill="#c4b5fd"/>
      <path d="M150 46 q26 40 26 84 l-52 0 q0 -44 26 -84 Z" fill="#e2e8f0"/>
      <path d="M150 46 q26 40 26 84 l-26 0 Z" fill="#cbd5e1"/>
      <circle cx="150" cy="96" r="15" fill="#38bdf8" stroke="#0f172a" stroke-width="5"/>
      <path d="M124 116 L98 158 L124 150 Z" fill="#ef4444"/>
      <path d="M176 116 L202 158 L176 150 Z" fill="#ef4444"/>
      <path d="M132 130 L168 130 L160 178 L140 178 Z" fill="#f59e0b"/>
      <path d="M140 178 q10 34 10 62 q0 -28 10 -62 Z" fill="#fbbf24"/>
    `,
  },
  {
    id: 'rainbow-meadow',
    name: 'קשת בענן',
    background: '<rect width="300" height="300" fill="url(#skyRainbow)"/>',
    body: `
      <path d="M20 236 a130 130 0 0 1 260 0" fill="none" stroke="#ef4444" stroke-width="20"/>
      <path d="M40 236 a110 110 0 0 1 220 0" fill="none" stroke="#f97316" stroke-width="20"/>
      <path d="M60 236 a90 90 0 0 1 180 0" fill="none" stroke="#facc15" stroke-width="20"/>
      <path d="M80 236 a70 70 0 0 1 140 0" fill="none" stroke="#22c55e" stroke-width="20"/>
      <path d="M100 236 a50 50 0 0 1 100 0" fill="none" stroke="#3b82f6" stroke-width="20"/>
      <ellipse cx="60" cy="72" rx="34" ry="22" fill="#ffffff"/>
      <ellipse cx="92" cy="80" rx="26" ry="17" fill="#ffffff"/>
      <ellipse cx="238" cy="60" rx="30" ry="20" fill="#ffffff"/>
      <ellipse cx="210" cy="70" rx="22" ry="14" fill="#ffffff"/>
      <path d="M0 234 Q150 210 300 234 L300 300 L0 300 Z" fill="#4ade80"/>
      <path d="M0 262 Q150 240 300 262 L300 300 L0 300 Z" fill="#22c55e"/>
      <circle cx="46" cy="272" r="8" fill="#f472b6"/>
      <circle cx="112" cy="284" r="7" fill="#fbbf24"/>
      <circle cx="188" cy="274" r="8" fill="#f472b6"/>
      <circle cx="256" cy="286" r="7" fill="#fbbf24"/>
    `,
  },
];

/**
 * Wraps a scene into a standalone SVG document URL.
 *
 * The grid needs the scene as a CSS `background-image` so each tile can slice
 * it with `background-size: 300% 300%`. Serialising to a data URI is what makes
 * that possible without shipping a single image file.
 */
export function sceneToDataUrl(scene: MysteryScene): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_SIZE} ${SCENE_SIZE}" width="${SCENE_SIZE}" height="${SCENE_SIZE}">`,
    '<defs>',
    '<linearGradient id="skySunset" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#fb923c"/><stop offset="0.55" stop-color="#f472b6"/><stop offset="1" stop-color="#fbbf24"/>',
    '</linearGradient>',
    '<linearGradient id="skySpace" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#4c1d95"/>',
    '</linearGradient>',
    '<linearGradient id="skyRainbow" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#bae6fd"/>',
    '</linearGradient>',
    '</defs>',
    scene.background,
    scene.body,
    '</svg>',
  ].join('');

  // encodeURIComponent keeps the SVG readable and avoids base64 bloat.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function pickScene(random: () => number = Math.random): MysteryScene {
  return MYSTERY_SCENES[Math.floor(random() * MYSTERY_SCENES.length)]!;
}
