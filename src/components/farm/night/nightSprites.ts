/**
 * Sprite urls for "האסם בלילה".
 *
 * SEPARATE FROM `nightNames.ts` ON PURPOSE. This is the only module in the
 * station that imports a `.png`, and only the stage layer imports IT. That keeps
 * asset resolution out of the puzzle generator, so the arithmetic can be tested
 * in plain Node - no bundler, no loader hooks, no stubbed image modules.
 *
 * Artwork comes from `src/assets/farm/`, the same set the rest of the farm uses,
 * so the barn reads as one world rather than a separate night mode.
 */
import duck from '../../../assets/farm/duck.png';
import rabbit from '../../../assets/farm/rabbit.png';
import cat from '../../../assets/farm/cat.png';
import dog from '../../../assets/farm/dog.png';
import sheep from '../../../assets/farm/sheep.png';
import donkey from '../../../assets/farm/donkey.png';
import cow from '../../../assets/farm/cow.png';
import horse from '../../../assets/farm/horse.png';
import type { NightAnimal } from './nightTypes';

/** Sprite url for each species. */
export const NIGHT_SPRITES: Record<NightAnimal, string> = {
  duck,
  rabbit,
  cat,
  dog,
  sheep,
  donkey,
  cow,
  horse,
};
