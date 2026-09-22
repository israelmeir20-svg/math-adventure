/**
 * The app shell.
 *
 * THERE IS NO ROUTER HERE, AND THAT IS THE EXISTING DESIGN. This project is an Electron-packaged
 * single-page game with no URL routing: the map is the app, and every activity opens over it as a
 * modal that owns its own close handler. Adding a `'mystery'` view state to this file would be a
 * half-router - one screen with a back button, every other screen a modal - which is two mental
 * models for the player and two code paths for the developer.
 *
 * So the Detective Office is a map anchor like the picnic basket, the clock post and the
 * constellation dome: it opens from the map, it closes back to the map, and the map stays mounted
 * underneath. That is also what makes the reward settlement free - the cookie counter in the top
 * bar is reading the SAME live store the case pays into, so it is already correct when the office
 * closes, with no refresh and no navigation.
 */
import { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { ProfileProvider } from './context/ProfileContext';
import TopBar from './components/common/TopBar';
import TownMap from './components/town/TownMap';
import TileActionModal from './components/kingdom/TileActionModal';

export default function App() {
  const [inspectedTileId, setInspectedTileId] = useState<string | null>(null);

  return (
    /*
      PROFILES WRAP THE GAME, NOT THE OTHER WAY ROUND.

      The profile directory is what will eventually decide WHICH game save to load, so it has to be
      mounted above `GameProvider` - a provider cannot read a context its own parent has not yet
      supplied. In this step nothing reads it from inside the game yet, so the nesting is a statement of
      intent rather than a live dependency.
    */
    <ProfileProvider>
      <GameProvider>
        <div dir="rtl" lang="he" className="min-h-screen bg-amber-50 font-sans text-stone-800">
          <TopBar />
          <main>
            <TownMap onInspectTile={setInspectedTileId} />
          </main>
          <TileActionModal
            tileId={inspectedTileId}
            onClose={() => setInspectedTileId(null)}
          />
        </div>
      </GameProvider>
    </ProfileProvider>
  );
}
