# Kakuzu

Budget tracker for mobile, shipped as an installable PWA. No ads, no account, no server: data stays in the browser storage of the device. The UI is in French.

## Commands

```bash
npm run dev        # dev server (add --host to open it from a phone on the same Wi-Fi)
npm run build      # type check + production build in dist/
npm run preview    # serve the production build
npm run lint
npm test           # vitest, logic only
```

## Stack

- Vite + React 19 + TypeScript (strict). No UI kit, no CSS framework: plain CSS with custom properties in `src/styles/`.
- State: one zustand store persisted to `localStorage` (`src/store/`). Amounts are integer hundredths whatever the currency (`SCALE` in `src/lib/money.ts`), so switching currency never rescales them. Dates are `YYYY-MM-DD` strings. Never store floats for money.
- PWA through `vite-plugin-pwa` (auto update, offline precache).
- Background: a hand-written ASCII renderer on a single `<canvas>` (`src/ascii/`). No dependency.

## Layout

```
src/
  ascii/        canvas engine, grid buffer, one file per animal scene
  components/   UI pieces (sheet, donut, nav, forms)
  screens/      one file per tab
  store/        zustand store, types, default categories, migrations
  lib/          pure functions (money, dates, stats, csv) with tests next to them
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
- Monospace everywhere (Geist Mono), kanji as category glyphs. No emoji in the UI.
- One accent color per animal theme, taken from `src/ascii/themes.ts`. Category colors come from the fixed categorical palette in `tokens.css` and follow the category, never its rank.
- No gradients on text, no glow on everything, no purple-to-pink hero, no card-in-card-in-card. Hairline borders, flat fills, generous spacing.
- Touch targets ≥ 44 px. Everything reachable with one thumb: primary actions at the bottom.
- Respect `prefers-reduced-motion`: the scene renders still frames.

### Copy

- Short, plain French. Say what the button does ("Ajouter", "Supprimer"), not marketing ("Libérez votre potentiel financier").
- No exclamation marks in the UI, no filler like "Oups !" or "Super !".

### Charts

- Expense split is a donut (the owner asked for a "camembert") with at most 6 segments: the tail folds into "Autres". 2 px surface gap between segments.
- The donut never stands alone: it sits above a list giving each category's name, amount and share, so color is never the only key.

### Git

- Conventional commits in English (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`), one logical change per commit.
- No `Co-Authored-By` trailer.
- Work on a branch, merge into `main` through a pull request.
