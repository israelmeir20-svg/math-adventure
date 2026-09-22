/**
 * Electron entry point for the Math Adventure desktop build.
 *
 * WHY .cjs AND NOT .js. `package.json` declares `"type": "module"`, which makes every
 * `.js` file in this project an ES module. Electron's main process loader predates that
 * convention and expects CommonJS for the entry point, so the file is named `.cjs` to opt
 * out of the package-wide ESM setting explicitly. Renaming the project to CommonJS instead
 * would break Vite's config, so the extension is the narrower fix.
 *
 * WHAT THIS PROCESS IS AND IS NOT RESPONSIBLE FOR. It only opens a window and points it at
 * the built app. All game logic, storage, and rendering stay in the renderer, which is the
 * same code the browser runs - so a desktop build cannot drift from the web build.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

/**
 * The dev server URL, kept in one place so the window and the error page cannot disagree.
 *
 * The port is pinned to 5173 to match the `wait-on` in the `electron:dev` script. If Vite
 * were left to pick a port, it would silently move to 5174 when 5173 is taken - `wait-on`
 * would then wait forever on 5173 while the real server ran elsewhere. Vite's `strictPort`
 * is set in `vite.config.ts` so a busy port fails loudly instead of drifting.
 */
const DEV_SERVER_URL = 'http://localhost:5173';

/** True when running from a packaged installer rather than `electron .` in dev. */
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    // Below this the 3-column game layouts start clipping, so the floor is enforced by the
    // window itself rather than by CSS alone.
    minWidth: 1024,
    minHeight: 700,
    // The menu bar is a desktop-app affordance with nothing useful in it for a child; the
    // game has its own in-app controls.
    autoHideMenuBar: true,
    // Paint the window in the app's own dark slate rather than white, so launching does not
    // flash white before React mounts.
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      /*
       * THE SECURE DEFAULTS, SET EXPLICITLY RATHER THAN RELIED ON.
       *
       * `contextIsolation: true` keeps the renderer's JavaScript in a separate context from
       * Electron's internals, so page code cannot reach privileged objects. `nodeIntegration:
       * false` denies the renderer `require()` and the Node standard library entirely. Both
       * are Electron's current defaults, but stating them means a future default change -
       * or a copy of this config into another project - cannot silently reduce the sandbox.
       *
       * This app needs none of the privileged APIs: it is a self-contained game with no
       * filesystem, shell, or IPC requirements. So the narrowest configuration is also the
       * one that costs nothing.
       */
      contextIsolation: true,
      nodeIntegration: false,
      // Not needed by the game, and each one is a capability the page could be tricked into
      // using. Leaving them off keeps the renderer as close to a plain browser tab as possible.
      webviewTag: false,
      sandbox: true,
    },
  });

  // Show only once the first frame is ready, which is what makes the dark background colour
  // above actually hide the startup gap.
  win.once('ready-to-show', () => win.show());

  if (isDev) {
    void win.loadURL(DEV_SERVER_URL);
    // Open devtools detached so the game window keeps its intended 1280x800 layout while
    // still being inspectable.
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    /*
     * `dist/index.html` loaded from disk. This is why `base: './'` matters in
     * `vite.config.ts`: with the default `base: '/'`, the built HTML asks for
     * `/assets/index-xxxx.js`, which `file://` resolves to the filesystem ROOT and the
     * window opens blank. A relative base makes every asset path resolve next to the HTML.
     */
    void win.loadFile(path.join(__dirname, 'dist', 'index.html'));

    /*
     * A CONTENT SECURITY POLICY FOR THE SHIPPED APP.
     *
     * Applied here rather than as a <meta> tag in index.html because the two environments
     * need different rules, and a meta tag cannot tell them apart. In DEV, Vite's HMR client
     * needs `unsafe-eval` and inline scripts, so any policy strict enough to be worth having
     * would break the dev server. In the PACKAGED app there is no HMR, no dev server and no
     * remote origin, so the policy can be genuinely restrictive - which is why Electron was
     * printing an "Insecure Content-Security-Policy" warning against the built app.
     *
     * WHAT EACH DIRECTIVE BUYS:
     *   - `default-src 'self'` blocks any script, style or frame that is not part of the
     *     bundled app, so injected markup cannot pull in a remote payload.
     *   - `img-src` must allow `data:` because the game stores parent-uploaded photos and
     *     builds the mosaic pictures as data URLs. `blob:` covers canvas output.
     *   - `style-src 'unsafe-inline'` is required by the animation and layout code, which
     *     sets inline styles (the mosaic grid writes gridTemplateColumns inline).
     *   - `connect-src 'none'` is deliberate: the game is entirely offline. It makes any
     *     attempt to phone home fail loudly rather than silently succeeding.
     *   - `object-src 'none'` and `frame-src 'none'` remove plugin and framing vectors that
     *     this app has no use for.
     *
     * `'unsafe-eval'` is NOT included - the bundle is plain ESM and needs no eval.
     */
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "font-src 'self' data:; " +
              "media-src 'self' data: blob:; " +
              "connect-src 'none'; " +
              "object-src 'none'; " +
              "frame-src 'none'; " +
              "base-uri 'none'; " +
              "form-action 'none'",
          ],
        },
      });
    });
  }

  /*
   * EXTERNAL LINKS GO TO THE REAL BROWSER, NEVER INTO THE APP WINDOW.
   *
   * Without this, a link inside the game would navigate the window itself away from the app,
   * and there would be no back button - a dead end a child cannot escape. Opening the system
   * browser also means an external page never inherits this window's context.
   */
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // A same-window navigation to somewhere that is not the app is treated the same way.
  win.webContents.on('will-navigate', (event, url) => {
    const isDevServer = url.startsWith(DEV_SERVER_URL);
    const isLocalFile = url.startsWith('file://');
    if (!isDevServer && !isLocalFile) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  return win;
}

/*
 * A SINGLE INSTANCE, SO TWO COPIES CANNOT FIGHT OVER SAVED PROGRESS.
 *
 * The game persists cookies, stickers and unlocks in localStorage. Two windows on the same
 * profile would both read and write that store, and the second one to save would silently
 * discard the first one's progress. Focusing the existing window instead is both the
 * conventional desktop behaviour and the only way to keep the save consistent.
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('activate', () => {
    // macOS keeps the app alive with no windows; re-create one on dock click.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// The conventional desktop lifecycle: closing the last window quits the app everywhere
// except macOS, where apps are expected to stay resident.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
