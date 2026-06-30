# SCR-10 Week View Redesign + Float Button Unification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix SCR-10 week view layout regression, convert footer buttons to floating buttons, apply theme color gradient, and unify float button style across SCR-10/11/12/30/31.

**Architecture:** Vanilla TypeScript SPA (Vite) → no framework. CSS is per-page, shared globals in `frontend/src/styles/main.css`. Theme color is `var(--theme-color)` set on `document.documentElement` at login. No test suite for frontend (TypeScript compile is the only check: `cd frontend && npx tsc --noEmit`).

**Tech Stack:** TypeScript, CSS, Vite (no React/Vue/Angular)

## Global Constraints

- TypeScript must compile without errors: `cd frontend && npx tsc --noEmit`
- Never modify backend files
- No new npm packages
- `.fab` class is defined in `frontend/src/styles/main.css` (shared across all pages) — do not duplicate in page-level CSS
- `.nav-arrow-btn` class is defined in `frontend/src/styles/main.css` — do not duplicate in page-level CSS
- Float button positions: left bottom = `position: fixed; bottom: 24px; left: 24px`; right group = `position: fixed; bottom: 24px; right: 24px` (innermost) with gap between siblings
- Button sizes: all float buttons must be 52px × 52px, border-radius: 50%
- Theme color CSS variable: `var(--theme-color)` — already set on `:root` in main.css as fallback `#4169e1`
- `--theme-text-color` CSS variable — set by JS in utils/theme.ts; fallback `#f0f0f0`
- Gradient shades for week date rows: light = `color-mix(in srgb, var(--theme-color) 12%, #1a1a1a)`, medium = `color-mix(in srgb, var(--theme-color) 22%, #1a1a1a)`, dark = `color-mix(in srgb, var(--theme-color) 35%, #1a1a1a)`
- Date row cycling: 3n+1 = light, 3n+2 = medium, 3n (or 3n+0) = dark

---

## Current State (read before implementing)

### `frontend/src/pages/week/index.ts` — current HTML structure (in mount()):
```html
<div class="week-page">
  <div class="week-top">
    <div class="week-sidebar">
      <button class="week-gear-btn" id="btn-gear" aria-label="設定">⚙</button>
      <div class="week-month-wrapper">
        <div class="week-month-label" id="week-month-label">...</div>
      </div>
    </div>
    <div class="week-body" id="week-body">
      <div class="week-rows-container" id="week-rows-container"></div>
    </div>
  </div>
  <div class="week-footer">   ← DELETE THIS ENTIRE SECTION
    <button class="nav-arrow-btn" id="btn-to-month" aria-label="月表示へ">←</button>
    <button class="week-today-btn hidden" id="btn-today">Today</button>
    <button class="fab" id="btn-notes" aria-label="共有事項">!</button>
    <button class="fab" id="btn-add" aria-label="予定追加">+</button>
  </div>
</div>
```

### `frontend/src/styles/main.css` — current fab/nav sizes:
- `.fab`: 3rem (48px) — needs to change to 52px
- `.nav-arrow-btn`: 2.75rem border-only, no theme color — needs theme color + 52px

### `frontend/src/pages/notes/notes.css` — nav button is wrong position:
- `.notes-nav-btn`: `position: fixed; bottom: 24px; right: 88px` ← must change to `left: 24px`

### `frontend/src/pages/notes/memos/memos.css`:
- `.memos-nav-btn`: `position: fixed; bottom: 24px; right: 88px` ← must change to `left: 24px`

### `frontend/src/pages/year/year.css` — has footer:
```css
.year-footer { display: flex; align-items: center; justify-content: flex-end; padding: 0.75rem 1.5rem 1.5rem; flex-shrink: 0; }
```
The `→` button is inside `.year-footer`. Remove footer, make button fixed at bottom-left.

---

## Task 1: utils/theme.ts + login/main.ts

**Files:**
- Create: `frontend/src/utils/theme.ts`
- Modify: `frontend/src/pages/login/index.ts`
- Modify: `frontend/src/main.ts`

**Interfaces:**
- Produces: `applyThemeColor(hex: string | null): void` exported from `utils/theme.ts`

- [ ] **Step 1: Create `frontend/src/utils/theme.ts`**

```typescript
export function applyThemeColor(hex: string | null): void {
  if (!hex) return;
  document.documentElement.style.setProperty('--theme-color', hex);
  const luminance = computeLuminance(hex);
  const textColor = luminance > 0.4 ? '#1a1a1a' : '#f0f0f0';
  document.documentElement.style.setProperty('--theme-text-color', textColor);
}

function computeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
```

- [ ] **Step 2: Update `frontend/src/pages/login/index.ts`**

After line `document.documentElement.style.setProperty('--theme-color', result.data.themeColorHex);` add:
```typescript
import { applyThemeColor } from '../../utils/theme';
// ...
// Replace the existing setProperty call:
applyThemeColor(result.data.themeColorHex);
localStorage.setItem('themeColorHex', result.data.themeColorHex);
```
(Remove the old `document.documentElement.style.setProperty('--theme-color', ...)` line — `applyThemeColor` handles it)

- [ ] **Step 3: Update `frontend/src/main.ts`**

```typescript
import { initRouter, navigate } from './utils/router';
import { applyThemeColor } from './utils/theme';

applyThemeColor(localStorage.getItem('themeColorHex'));
initRouter();
navigate(location.pathname + location.search);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/theme.ts frontend/src/pages/login/index.ts frontend/src/main.ts
git commit -m "feat: add theme color utility with luminance-based text contrast"
```

---

## Task 2: SCR-10 Complete Redesign

**Files:**
- Modify: `frontend/src/pages/week/week.css`
- Modify: `frontend/src/pages/week/index.ts`

**Interfaces:**
- Consumes: `--theme-color`, `--theme-text-color` (set by Task 1)

- [ ] **Step 1: Update `frontend/src/pages/week/index.ts` HTML**

Replace the `app.innerHTML` template. Remove `.week-footer` entirely. Move all 4 buttons outside `.week-top` but still inside the page div as fixed-position siblings:

```html
<div class="week-page" id="year-page">
  <div class="week-top">
    <div class="week-sidebar">
      <button class="week-gear-btn" id="btn-gear" aria-label="設定">⚙</button>
      <div class="week-month-wrapper">
        <div class="week-month-label" id="week-month-label">${getMonthLabel(startDate)}</div>
      </div>
    </div>
    <div class="week-body" id="week-body">
      <div class="week-rows-container" id="week-rows-container"></div>
    </div>
  </div>
  <button class="nav-arrow-btn week-nav-btn" id="btn-to-month" aria-label="月表示へ">←</button>
  <button class="week-today-btn hidden" id="btn-today">Today</button>
  <button class="fab" id="btn-notes" aria-label="共有事項">!</button>
  <button class="fab" id="btn-add" aria-label="予定追加">+</button>
</div>
```

Note: `id="year-page"` should remain `id="week-page"` — do not add year-page id. Check the existing id.

- [ ] **Step 2: Update `frontend/src/pages/week/week.css`**

Make the following changes:

**a) `.week-page`** — ensure it's `height: 100dvh; display: flex; flex-direction: column` (already is, just verify)

**b) `.week-top`** — must fill remaining height:
```css
.week-top {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
```

**c) `.week-sidebar`** — add theme color background:
```css
.week-sidebar {
  width: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0 0.75rem;
  flex-shrink: 0;
  gap: 0.75rem;
  background-color: var(--theme-color);
}
```

**d) `.week-gear-btn`** — use theme text color:
```css
.week-gear-btn {
  background: none;
  border: none;
  color: var(--theme-text-color, #f0f0f0);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
```

**e) `.week-month-label`** — use theme text color:
```css
.week-month-label {
  font-size: 0.75rem;
  color: var(--theme-text-color, #f0f0f0);
  white-space: nowrap;
  letter-spacing: 0.05em;
  transform: rotate(-90deg);
}
```

**f) Delete `.week-footer`** block and `.week-footer .nav-arrow-btn { margin-right: auto; }` block entirely.

**g) Add `.week-nav-btn`** (fixed position for the ← button):
```css
.week-nav-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
}
```

**h) Update `.week-today-btn`** (float, appears above the ! button):
```css
.week-today-btn {
  position: fixed;
  bottom: 24px;
  right: 136px;  /* 24 + 52 + 12 + 52 + 12 = 152... calc: right of Today = 24 + (52+12)*2 = 152px */
  background: none;
  border: 1px solid var(--theme-color);
  color: var(--theme-text-color, #f0f0f0);
  border-radius: 1rem;
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
  z-index: 10;
}
.week-today-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.week-today-btn.hidden {
  display: none;
}
```

Actually, for simplicity with Today position — it should be to the LEFT of the `!` button. If `+` is at right:24px (52px wide), `!` is at right:24+52+12=88px. Today should be at right:88+52+12=152px, OR just use a flex-group approach. But since buttons are fixed individually, let's place Today at right:152px.

Wait, the `!` and `+` buttons are `.fab` class which currently doesn't have `position: fixed`. The `.fab-group` in home.css IS fixed. For week page, the fabs are direct children, not in a group.

For SCR-10, add individual fixed positioning for `!` and `+` in week.css:
```css
#btn-notes {
  position: fixed;
  bottom: 24px;
  right: 88px;  /* 24 + 52 + 12 = 88 */
  z-index: 10;
}
#btn-add {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10;
}
```

And Today at:
```css
.week-today-btn {
  position: fixed;
  bottom: 24px;
  right: 152px; /* 24 + 52 + 12 + 52 + 12 = 152 */
  ...
}
```

**i) Date row gradient — 3-shade cycle:**

Replace the existing nth-child rules for `.week-row`:
```css
.week-row:nth-child(3n + 1) {
  background-color: color-mix(in srgb, var(--theme-color) 12%, #1a1a1a);
}
.week-row:nth-child(3n + 2) {
  background-color: color-mix(in srgb, var(--theme-color) 22%, #1a1a1a);
}
.week-row:nth-child(3n) {
  background-color: color-mix(in srgb, var(--theme-color) 35%, #1a1a1a);
}
```

Remove the old `nth-child(odd)` and `nth-child(even)` rules.

- [ ] **Step 3: TypeScript compile check**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/week/week.css frontend/src/pages/week/index.ts
git commit -m "feat: SCR-10 layout fix — remove footer, float buttons, sidebar theme color, 3-shade gradient rows"
```

---

## Task 3: main.css + SCR-11 Float Button Unification

**Files:**
- Modify: `frontend/src/styles/main.css`
- Modify: `frontend/src/pages/home/home.css`

**Goal:** Unify `.fab` and `.nav-arrow-btn` sizes to 52px, make `.nav-arrow-btn` use theme color. Update SCR-11 (home) so the fab-group correctly uses the unified style.

- [ ] **Step 1: Update `.fab` in `frontend/src/styles/main.css`**

Change from:
```css
.fab {
  width: 3rem;
  height: 3rem;
  ...
  color: #f0f0f0;
  ...
}
```
To:
```css
.fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background-color: var(--theme-color);
  color: var(--theme-text-color, #f0f0f0);
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: opacity 0.15s;
  z-index: 10;
}
```

- [ ] **Step 2: Update `.nav-arrow-btn` in `frontend/src/styles/main.css`**

Change from border-only to theme-colored:
```css
.nav-arrow-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background-color: var(--theme-color);
  color: var(--theme-text-color, #f0f0f0);
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: opacity 0.15s;
  z-index: 10;
}
.nav-arrow-btn:hover { opacity: 0.85; }
```

- [ ] **Step 3: Update `frontend/src/pages/home/home.css`**

The `.fab-group` in home.css is:
```css
.fab-group {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
```
Update to use pixel values consistent with other screens:
```css
.fab-group {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  gap: 12px;
  align-items: center;
}
```

- [ ] **Step 4: TypeScript compile check**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/main.css frontend/src/pages/home/home.css
git commit -m "feat: unify float button style — 52px theme-colored fab and nav-arrow-btn"
```

---

## Task 4: SCR-12, SCR-30, SCR-31 Float Button Fix

**Files:**
- Modify: `frontend/src/pages/year/year.css`
- Modify: `frontend/src/pages/year/index.ts`
- Modify: `frontend/src/pages/notes/notes.css`
- Modify: `frontend/src/pages/notes/index.ts`
- Modify: `frontend/src/pages/notes/memos/memos.css`
- Modify: `frontend/src/pages/notes/memos/index.ts`

### SCR-12 (year view)

Current: `→` button inside `.year-footer` (flex footer, not fixed).
Target: Remove `.year-footer`, make `→` button `position: fixed; bottom: 24px; left: 24px`.

The button class is `nav-arrow-btn` (shared from main.css). Just needs a fixed position override.

- [ ] **Step 1: Update `frontend/src/pages/year/index.ts`**

In the `app.innerHTML` template, remove the `<div class="year-footer">` wrapper. Move `btn-to-home` button to be a direct child of `.year-page`:

Current:
```html
<div class="year-footer">
  <button class="nav-arrow-btn" id="btn-to-home" aria-label="月表示へ">→</button>
</div>
```
New (no wrapper):
```html
<button class="nav-arrow-btn year-nav-btn" id="btn-to-home" aria-label="月表示へ">←</button>
```
Note: change `→` to `←` (all nav buttons pointing back to home use `←`).

- [ ] **Step 2: Update `frontend/src/pages/year/year.css`**

Delete the `.year-footer` block entirely. Add:
```css
.year-nav-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
}
```

### SCR-30 (notes)

Current: `.notes-nav-btn` at `position: fixed; bottom: 24px; right: 88px` (wrong side).
Target: Move to `left: 24px`. The notes page also has its own size (52px) — after Task 3 updates main.css, replace `.notes-nav-btn` with `.nav-arrow-btn` for consistency.

- [ ] **Step 3: Update `frontend/src/pages/notes/index.ts`**

In the HTML template, change the schedule nav button class:
```html
<!-- Before -->
<button class="notes-nav-btn" id="btn-schedule" aria-label="...">⌂</button>
<!-- After -->
<button class="nav-arrow-btn notes-nav-btn-fixed" id="btn-schedule" aria-label="...">⌂</button>
```

- [ ] **Step 4: Update `frontend/src/pages/notes/notes.css`**

Replace `.notes-nav-btn` with `.notes-nav-btn-fixed` and fix position:
```css
.notes-nav-btn-fixed {
  position: fixed;
  bottom: 24px;
  left: 24px;
}
```
Delete the old `.notes-nav-btn` block (the one with `right: 88px`).

Also update `.notes-fab` to match unified size (but since notes-fab is 52px and main.css .fab will also be 52px after Task 3, just remove the duplicate size/styling from notes-fab, keep only position and z-index):

Actually — if notes/index.ts uses `class="notes-fab"` (not `class="fab"`), the shared style won't apply automatically. Check notes/index.ts to see what class is used for the + button. If it's `notes-fab`, either:
  - Change HTML class to `fab` (then CSS from main.css applies)
  - Or keep `notes-fab` but update its CSS to match

Prefer: change class to `fab` in notes/index.ts for the + button. Remove `.notes-fab` from notes.css.

### SCR-31 (memos)

Same pattern as SCR-30.

- [ ] **Step 5: Update `frontend/src/pages/notes/memos/index.ts`**

Change memos nav button class from `memos-nav-btn` to `nav-arrow-btn memos-nav-btn-fixed`.
Change memos fab button class from `memos-fab` to `fab`.

- [ ] **Step 6: Update `frontend/src/pages/notes/memos/memos.css`**

Delete `.memos-nav-btn` block. Add:
```css
.memos-nav-btn-fixed {
  position: fixed;
  bottom: 24px;
  left: 24px;
}
```
Delete `.memos-fab` block (now using shared `.fab` from main.css).

- [ ] **Step 7: TypeScript compile check**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/year/year.css frontend/src/pages/year/index.ts \
        frontend/src/pages/notes/notes.css frontend/src/pages/notes/index.ts \
        frontend/src/pages/notes/memos/memos.css frontend/src/pages/notes/memos/index.ts
git commit -m "feat: SCR-12/30/31 — unified float button positions (nav btn to bottom-left)"
```
