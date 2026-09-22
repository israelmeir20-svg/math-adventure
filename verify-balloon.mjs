/**
 * Temporary check for the balloon lifecycle + animations. Deleted after running.
 *   node verify-balloon.mjs
 */
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const hook = read('src/components/town/useBalloonEvent.ts');
const balloon = read('src/components/town/HotAirBalloon.tsx');
const map = read('src/components/town/TownMap.tsx');
const css = read('src/index.css');

/* ---------------- 1. 10-minute cooldown ---------------- */
check('cooldown is 600,000ms (10 minutes)', /const COOLDOWN_MS = 10 \* 60 \* 1000;/.test(hook));
check('cooldown is tracked as a timestamp, not a bare delay', /const nextVisitAt = useRef<number>\(Date\.now\(\) \+ COOLDOWN_MS\)/.test(hook));
check('remaining time is recomputed from the timestamp', /const remaining = Math\.max\(0, nextVisitAt\.current - Date\.now\(\)\)/.test(hook));
check('cooldown is re-armed at the END of the visit', /setPhase\('hidden'\);[\s\S]{0,200}nextVisitAt\.current = Date\.now\(\) \+ COOLDOWN_MS/.test(hook));
check('the streak trigger is gone (no STREAK_INTERVAL)', !/STREAK_INTERVAL/.test(hook));
check('the old 6-minute ambient interval is gone', !/AMBIENT_INTERVAL_MS/.test(hook) && !/setInterval/.test(hook));
check('the hook no longer takes a streak argument', /export function useBalloonEvent\(\)/.test(hook));
check('TownMap calls it with no arguments', /useBalloonEvent\(\)/.test(map) && !/useBalloonEvent\(state/.test(map));
check('the re-arm is idempotent (guarded on the live phase)', /if \(phaseRef\.current === 'hidden'\) arrive\(\)/.test(hook));

/* ---------------- 2. single gentle descent, no double bounce ---------------- */
const descend = css.match(/@keyframes balloonDescend \{([\s\S]*?)\n  \}/)?.[1] ?? '';
check('balloonDescend keyframe found', descend.length > 0);
check('descent ends at rest translateY(0)', /100% \{\s*transform: translateY\(0\);/.test(descend));
// A descent must move STRICTLY DOWNWARD across its keyframes: no value may be higher than the
// one before it. This is the assertion that would have caught the original bug.
const descendVals = [...descend.matchAll(/transform: translateY\((-?[\d.]+)px\)/g)].map((m) => Number(m[1]));
check('descent has keyframe values', descendVals.length >= 2, descendVals.join(' -> '));
check(
  'descent is strictly downward (no upward reversal / second descent)',
  descendVals.every((v, i) => i === 0 || v >= descendVals[i - 1]),
  descendVals.join(' -> '),
);
check('only the first keyframe is above rest', descendVals.filter((v) => v < 0).length === 1, `${descendVals.filter((v) => v < 0).length} negative`);
check('descent starts well above the meadow (>=200px)', /translateY\(-(\d+)px\)/.test(descend) && Number(descend.match(/translateY\(-(\d+)px\)/)[1]) >= 200);

const bob = css.match(/@keyframes balloonBob \{([\s\S]*?)\n  \}/)?.[1] ?? '';
check('balloonBob keyframe found', bob.length > 0);
check('bob is ANCHORED AT 0/rest, not at -6px (the jog bug)', !/translateY\(-6px\)/.test(bob));
check('bob travel is small (<=4px either way)', [...bob.matchAll(/translateY\((-?[\d.]+)px\)/g)].every((m) => Math.abs(Number(m[1])) <= 4), 'gentle');

// The structural fix: descent and bob must NOT be on the same element.
check('descent is on the OUTER wrapper', /<div className=\{ANIMATION\[phase\]\}>/.test(balloon));
check('bob is on an INNER element', /phase === 'landed'\s*\?\s*'block animate-\[balloonBob_5s_ease-in-out_infinite\]/.test(balloon));
check('the two animations are on different nodes', (() => {
  const outer = balloon.indexOf('{ANIMATION[phase]}');
  const inner = balloon.indexOf('animate-[balloonBob');
  return outer !== -1 && inner !== -1 && inner > outer;
})());
check('landing uses ease-out (smooth deceleration)', /animate-\[balloonDescend_4\.5s_ease-out_both\]/.test(balloon));
check('descent duration is in the 4-6s band', /balloonDescend_4\.5s/.test(balloon));
check('the old 3.5s descent is gone', !/balloonDescend_3\.5s/.test(balloon));
check('the old 3.4s bob is gone', !/balloonBob_3\.4s/.test(balloon));
check('landed phase no longer runs an outer animation', /landed: ''/.test(balloon));

/* ---------------- 3. 60-second grounded window ---------------- */
check('grounded window is exactly 60s', /const GROUNDED_MS = 60 \* 1000;/.test(hook));
check('the 90s linger is gone', !/LINGER_MS/.test(hook));
check('grounded timer starts when the descent completes', /setPhase\('landed'\);[\s\S]{0,200}schedule\(\(\) => depart\(\), GROUNDED_MS\)/.test(hook));
check('the visit is ONE chained sequence, not three competing effects', (hook.match(/useEffect\(/g) || []).length <= 3, `${(hook.match(/useEffect\(/g) || []).length} effects`);
check('the balloon stays clickable while grounded', /pointer-events-auto/.test(balloon) && /cursor-pointer/.test(balloon));
check('no literal disabled attribute on the balloon button', !/\sdisabled=/.test(balloon));
check('a tap during the climb-out is ignored', /if \(phaseRef\.current !== 'landed'\) return;/.test(hook));

/* ---------------- animation/length agreement ---------------- */
const landingMs = Number(hook.match(/const LANDING_MS = (\d+);/)?.[1]);
const departingMs = Number(hook.match(/const DEPARTING_MS = (\d+);/)?.[1]);
const cssDescend = Number(balloon.match(/balloonDescend_([\d.]+)s/)?.[1]) * 1000;
const cssDepart = Number(balloon.match(/balloonDepart_([\d.]+)s/)?.[1]) * 1000;
check('LANDING_MS matches the CSS descent duration', landingMs === cssDescend, `${landingMs}ms vs ${cssDescend}ms`);
check('DEPARTING_MS matches the CSS departure duration', departingMs === cssDepart, `${departingMs}ms vs ${cssDepart}ms`);

/* ---------------- depart keyframe ---------------- */
const depart = css.match(/@keyframes balloonDepart \{([\s\S]*?)\n  \}/)?.[1] ?? '';
check('depart keyframe found', depart.length > 0);
check('depart ascends and drifts', /translate\(-?\d+px, -\d+px\)/.test(depart));
check('depart fades out', /opacity: 0;/.test(depart));

/* ---------------- CSS integrity ---------------- */
const o = (css.match(/\{/g) || []).length;
const c = (css.match(/\}/g) || []).length;
check('index.css braces balanced', o === c, `${o}/${c}`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
