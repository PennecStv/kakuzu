# Kakuzu

Budget tracker for mobile, shipped as an installable PWA. No ads, no account, no server: data stays in the browser storage of the device. The UI is in French.

## Commands

```bash
npm run dev        # dev server (add --host to open it from a phone on the same Wi-Fi)
npm run build      # type check + production build in dist/
npm run preview    # serve the production build
npm run lint
npm test           # vitest, logic only
npm run build:android  # build without the service worker, synced into android/ (Capacitor)
```

## Stack

- Vite + React 19 + TypeScript (strict). No UI kit, no CSS framework: plain CSS with custom properties in `src/styles/`.
- State: one zustand store persisted to `localStorage` (`src/store/`). Amounts are integer hundredths whatever the currency (`SCALE` in `src/lib/money.ts`), so switching currency never rescales them. Dates are `YYYY-MM-DD` strings. Never store floats for money.
- PWA through `vite-plugin-pwa` (auto update, offline precache).
- Background: a hand-written ASCII renderer on a single `<canvas>` (`src/ascii/`). No dependency.
- Notifications: `@capacitor/local-notifications` schedules the goal reminders, in the Android app only (`src/native/notifications.ts`). A goal with a deadline turns red, with its warning triangle, `settings.reminders.days` before it, whatever the notifications. The bell switch in Réglages (`settings.reminders.notify`) adds the phone notification, so only the Android app shows it: a web page cannot wake up once closed. Every change to the goals or the reminder settings cancels the pending notifications and schedules them again. `isExactNotification` stays off: an exact alarm would send the user to the system alarm settings. The status bar icon is `android/app/src/main/res/drawable/ic_stat_kakuzu.xml`, the coin of `public/icon.svg` in white.
- Android: Capacitor 8 wraps `dist/` in `android/`, which is committed. The `android` Vite mode drops the service worker: the APK ships its files. `.github/workflows/apk.yml` builds the signed APK on each `vX.Y.Z` tag: versionName is the tag, versionCode is major × 10000 + minor × 100 + patch (minor and patch stay under 100), the key comes from the repo secrets. Never commit a keystore. Launcher icons and splash screens in `android/app/src/main/res` were rendered from `public/icon.svg` with sharp: redo them if the icon changes. Gradle 8.14 needs JDK 21.

## Layout

```
src/
  ascii/        canvas engine, grid buffer, one file per animal scene
  components/   UI pieces (sheet, donut, nav, forms)
  screens/      one file per tab
  store/        zustand store, types, default categories, migrations
  lib/          pure functions (money, dates, stats, csv, xlsx reader, recurring, goals) with tests next to them
  native/       Capacitor plugin calls (notifications)
  styles/       tokens.css (colors, spacing, type) and global rules
```

## Rules

### Code

- Pure logic goes in `src/lib/` and gets a test. Components stay thin.
- No `any`, no non-null `!` unless the invariant is obvious on the line above.
- Comments explain why, never what. No commented-out code, no TODO left in a commit.
- No dependency for something under 50 lines of code.
- Names in English, UI copy in French.

### Design

- Dark only: near-black navy surfaces, the ASCII scene stays behind and dimmed so text keeps a 4.5:1 contrast.
- Monospace everywhere (Geist Mono). The header title is the wordmark (`components/Wordmark.tsx`): a still K in ASCII art in the accent, then "aku乙u" in heavy Geist Mono, the z swapped for the kanji 乙 (drawn as SVG so its weight matches on every phone), over a stroke of the accent behind the foot of the letters. `docs/wordmark-*.png` are its static copies for the README.
- Icons are Lucide line icons. Lucide has none of the theme animals, so `components/ThemeIcon.tsx` draws them on its 24 px grid with its 2 px stroke; a new icon follows the same grid. No kanji as icons, no emoji in the UI.
- Each animal theme in `src/ascii/themes.ts` sets the accent: buttons, income figures, the income line, the wordmark's K. Category colors do not follow the theme (shades of one hue were too hard to tell apart): a category is a slot of the validated palette in `tokens.css` or a `#rrggbb` the user picked (four extra presets or the system picker), and the color follows the category, never its rank. Theme changes happen in Réglages only. Its `still` lines are the animal drawn still, in the accent, over an empty state.
- No native `<select>` and no native date input: pickers use `components/Dropdown.tsx`, dates `components/DatePicker.tsx` (a calendar in a sheet over the form, Monday first), which keep the app's look on Android. A sheet opened from another one closes alone: `Sheet` stops React from passing `close` up.
- No gradients on text, no glow on everything, no purple-to-pink hero, no card-in-card-in-card. Hairline borders, flat fills, generous spacing.
- Touch targets ≥ 44 px. Everything reachable with one thumb: primary actions at the bottom.
- Respect `prefers-reduced-motion`: the scene renders still frames and tabs switch without the slide.
- Cards, lists and charts come in once when they mount (the entrances block at the end of `app.css`: opacity, transform and stroke dashes only). The Animations switch in Réglages (`settings.motion`) puts `.is-still` on `.app`, which drops them with the scene, the flow's moving band and the shine that runs across the share saved of each goal.
- Switching tabs slides the pages: the one going out is pinned where it was on screen, the one coming in enters from the side of its tab in the bar. Pages stay in tab order in the DOM so React never moves or remounts them.

### Copy

- Short, plain French. Say what the button does ("Ajouter", "Supprimer"), not marketing ("Libérez votre potentiel financier").
- No exclamation marks in the UI, no filler like "Oups !" or "Super !".
- The one exception to plain copy: the floating message after an entry (`src/lib/quips.ts`), green for income, red for expenses, owner-picked lines in the Kakuzu-money meme tone. Each line stays under 36 characters.

### Charts

- The split by category is a donut (the owner asked for a "camembert"), expenses or income, with at most 6 segments: the tail folds into "Autres". 2 px surface gap between segments.
- Income and expenses over six months is a line chart on one axis: income in the accent with a 10 % wash, expenses in ink, a readout above it for the month under the finger.
- The donut never stands alone: it sits above a list giving each category's name, amount and share, so color is never the only key.
- Cash-flow is a flow diagram read top to bottom (`components/FlowChart.tsx`): the period's total, then a ribbon per category as thick as its share, at most 6 like the donut. The first category's ribbon starts rightmost and turns first, so ribbons never cross. Each leaf names its category, amount and share. Ribbons draw in when the kind or the period changes, and a band of brighter color runs down each one (SMIL on the gradient, no glow: it clashes with the themes); with reduced motion or the Animations switch off they stand still. A period still to come counts the recurring entries it will get (`plannedEntries`), with a line saying how many.

### Money over time

- The balance carries over by default (`settings.carryOver`): a period opens with what every earlier entry left, deficits included.
- A recurring entry adds a normal entry dated the 1st of each month, when the app opens or comes back to the foreground, months missed included. Its `next` month moves on as soon as it is added, so a month never gets it twice; editing it changes the months to come only. The Chaque mois switch of a new entry starts one: the entry is its first month, the next comes on the 1st of the month after.
- The store is at version 3: a new persisted field gets a default in `src/store/migrations.ts` and a check in `src/store/backup.ts`.

### Git

- Conventional commits in English (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`), one logical change per commit.
- No `Co-Authored-By` trailer.
- Work on a branch, merge into `main` through a pull request.
