/**
 * Living details layered over the town illustration: chimney smoke drifting
 * from the bakery and rescued animals idling in their habitats.
 *
 * Data source: `state.inventory.unlockedAnimals` - the exact array the farm
 * pushes to via `adoptAnimal` (verified against gameReducer).
 *
 * This component only decides *which* animals are present. Anchors and idle
 * behaviour live in `animalRoutes`, rendering in `RoamingAnimal`, so hover and
 * balloon re-renders here cannot disturb an animal mid-bounce.
 */
import { getAnimalHabitat, STARTER_ANIMAL } from './animalRoutes';
import { ANIMAL_SPRITE_IDS } from './animalSprites';
import RoamingAnimal from './RoamingAnimal';
import ChimneySmoke from './ChimneySmoke';

interface TownOverlaysProps {
  /** Ids from `inventory.unlockedAnimals`, or undefined while hydrating. */
  animals: string[] | undefined;
}

export default function TownOverlays({ animals }: TownOverlaysProps) {
  const adopted = pickAdopted(animals);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden
    >
      <ChimneySmoke />
      {adopted.map((animalId) => {
        const habitat = getAnimalHabitat(animalId);
        if (!habitat) return null;
        return (
          <RoamingAnimal key={animalId} animalId={animalId} habitat={habitat} />
        );
      })}
    </div>
  );
}

/**
 * Falls back to a single starter pup only when nothing has been adopted yet.
 * `undefined` (still hydrating) is treated as empty rather than crashing.
 */
function pickAdopted(animals: string[] | undefined): string[] {
  if (!animals || animals.length === 0) return [STARTER_ANIMAL];
  return animals
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .slice(0, ANIMAL_SPRITE_IDS.length);
}
