# Juno

An always-on-top pixel-art desktop widget for a DSA placement study plan, built for two study buddies.
Tick topics, schedule spaced reviews, see each other's progress, and chat.

- **LIST**: phases → topics → subtopics with ✓ DONE / ★ REVIEW, track (DS/ML · SDE · Everything) and hours/day, "≈ weeks left"
- **GOALS**: your own to-do list (add, tick off, delete, clear done), synced to your account
- **REVIEW**: flagged items with reviews at +1 / +7 / +30 days and short notes
- **BUDDY**: both players side by side (each computed with their own settings) and an activity feed
- **CHAT**: real-time messages, progress shares and nudges, with desktop notifications
- **SET**: 6 pixel themes + custom accent, character, opacity, always-on-top, start on login
- Collapsed 300×70 pill mode, system tray, offline support, auto-updates

Friends just need [FRIEND-SETUP.md](FRIEND-SETUP.md).

## Develop

```bash
npm install
cp firebase.config.example.js firebase.config.js   # fill in your Firebase web config
npm start
```

Firebase: enable **Email/Password** auth, create Firestore, deploy `firestore.rules`
(`npx firebase-tools deploy --only firestore:rules`), and add one document per invited
email to the `allowed` collection (document ID = the email, lowercase).

## Release

```bash
npm version patch     # bump version (commit + tag)
npm run release       # push, build, publish to GitHub Releases
```

Installed copies download the update in the background and install it on the next restart.
`npm run dist` builds the installer locally without publishing.

## Project structure

| Path | What it does |
|---|---|
| `src/main/main.js` | Electron main process: frameless window, single-instance lock, IPC handlers, notifications, auto-updates |
| `src/main/windowState.js` | Saves size/position (expanded + collapsed), opacity, always-on-top, start-on-login; pulls off-screen windows back |
| `src/main/tray.js` | Tray icon and menu (show/hide, always on top, start on login, restart to update, quit); unread dot |
| `src/main/pixelIcon.js` | Tray/notification icon drawn from a pixel grid |
| `src/preload/preload.js` | The only bridge to the page: a small `window.juno` API via `contextBridge` |
| `src/data/plan.js` | The study plan plus pure progress maths (track filter, weeks-left, LV, current topic, summary) |
| `src/data/review.js` | Pure spaced-review scheduling (+1/+7/+30 days) |
| `src/renderer/app.js` | Renderer entry: store, actions, shell, auth/sync/chat wiring, notifications, read tracking |
| `src/renderer/core/` | `store.js` (tiny observable store), `dom.js` (`h()` helper, text-only by default), `prefs.js` (prefs defaults + local cache) |
| `src/renderer/firebase/` | `init.js` (Auth + Firestore with offline cache), `auth.js` (sign-up/in/verify), `sync.js` (debounced per-item sync), `buddy.js` (read-only buddy data + activity log), `chat.js` (messages + read position) |
| `src/renderer/views/` | One file per screen: `list`, `review`, `buddy`, `chat`, `settings`, `auth` (sign-in gate), `placeholder` |
| `src/renderer/ui/` | Shell pieces: `titlebar`, `statusbar`, `scene` (sky, mascot, dialogue box), `nav`, `pill` (collapsed mode), `toast` (pixel errors), `themes`, `avatarPicker` |
| `src/renderer/art/` | Pixel-art engine (`pixel.js`: grid → SVG with theme colours), `sprites.js` (icons, decorations), `mascot.js` (Juno + moods), `avatars.js` (player characters) |
| `src/renderer/styles/` | `base.css` (fonts, reset), `pixel.css` (notched borders, buttons, bars), `shell.css` (handheld layout, pill), `views.css` (per-tab styles) |
| `firestore.rules` | Security rules: invited + verified users only; read both, write only your own data; validated, immutable chat |
| `scripts/build.mjs` | esbuild bundle of the renderer into `dist/` (fonts and Firebase included) |
| `scripts/make-icon.cjs` | Generates `build/icon.png` / `icon.ico` from pixel grids |
| `scripts/release.cjs` | Safe release: clean-tree and version checks, push, build, publish |
| `scripts/shot.cjs` | Dev tool: screenshots of every theme using preview data |

All art is original pixel art drawn in code. Fonts: Pixelify Sans and Silkscreen (SIL Open Font License).
