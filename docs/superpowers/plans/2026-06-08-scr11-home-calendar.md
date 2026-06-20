# SCR-11 月単位ホームカレンダー画面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SCR-11 月単位ホームカレンダー画面を実装する。timepage風ダークテーマで当月の予定をカラーバー表示し、スワイプ/マウスドラッグで月を切り替えられる SPA ページ。

**Architecture:** 既存の `mount(app)` パターンに従う。状態（year/month/schedules）は `index.ts` が保持し、`calendar.ts` はデータを受け取ってグリッド DOM を返す純粋関数。タッチ・マウスイベントを共通ハンドラで統合。

**Tech Stack:** Vanilla TypeScript, Vite, CSS custom properties（`var(--theme-color)`）, `api.get` from `api/client.ts`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/api/schedules.ts` | Create | Schedule 型 + `GET /api/schedules` API 呼び出し |
| `frontend/src/utils/router.ts` | Modify | `/home` ルート追加 |
| `frontend/src/pages/home/home.css` | Create | ダークテーマ全スタイル |
| `frontend/src/pages/home/calendar.ts` | Create | 純粋関数 `buildCalendarGrid()` |
| `frontend/src/pages/home/index.ts` | Create | `mount()`, 状態管理, スワイプ, レンダリング |

---

## Task 1: API モジュール — schedules.ts

**Files:**
- Create: `frontend/src/api/schedules.ts`

- [ ] **Step 1: Create schedules.ts**

```typescript
import { api } from './client';

export interface ScheduleGenre {
  id: number;
  name: string;
  colorHex: string;
}

export interface Schedule {
  id: number;
  creatorId: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  detail: string | null;
  visibility: string;
  notificationTime: string;
  genre: ScheduleGenre | null;
}

export const schedules = {
  getSchedules: (from: string, to: string) =>
    api.get<Schedule[]>(`/schedules?from=${from}&to=${to}`),
};
```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/schedules.ts
git commit -m "feat: add schedules API module with Schedule types"
```

---

## Task 2: ルーター — /home ルート追加

**Files:**
- Modify: `frontend/src/utils/router.ts`

- [ ] **Step 1: /home ルートを追加**

`router.ts` の `routes` を以下に変更：

```typescript
const routes: Record<string, PageLoader> = {
  '/':     () => import('../pages/login'),
  '/home': () => import('../pages/home'),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/router.ts
git commit -m "feat: register /home route in router"
```

---

## Task 3: CSS — home.css

**Files:**
- Create: `frontend/src/pages/home/home.css`

- [ ] **Step 1: Create home.css**

```css
/* === レイアウト === */
.home-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: #1a1a1a;
  color: #e0e0e0;
  overflow: hidden;
  user-select: none;
}

/* === ヘッダー === */
.home-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1rem 0.5rem;
  flex-shrink: 0;
}

.icon-btn {
  background: none;
  border: none;
  color: #e0e0e0;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.25rem;
  line-height: 1;
  border-radius: 4px;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.month-label {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex: 1;
}

/* === カレンダーラッパー === */
.calendar-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: grab;
  padding: 0 0.5rem;
}

.calendar-wrapper.grabbing {
  cursor: grabbing;
}

/* === カレンダーグリッド === */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 100%;
  gap: 1px;
  background-color: #2a2a2a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

/* === ヘッダー行 === */
.calendar-header-cell {
  background-color: #1a1a1a;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.4rem 0;
  color: #888;
  letter-spacing: 0.05em;
}

.calendar-header-cell.sun { color: #e57373; }
.calendar-header-cell.sat { color: #64b5f6; }

/* === 日付セル === */
.calendar-cell {
  background-color: #222;
  padding: 0.2rem 0.2rem 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  overflow: hidden;
}

.calendar-cell.out-of-month {
  background-color: #1e1e1e;
  opacity: 0.35;
  pointer-events: none;
}

/* === 日付数字 === */
.cell-date {
  font-size: 0.75rem;
  font-weight: 500;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  color: #e0e0e0;
}

.cell-date.sun { color: #e57373; }
.cell-date.sat { color: #64b5f6; }

.cell-date.today {
  background-color: var(--theme-color);
  color: #fff;
  font-weight: 700;
}

/* === 予定バー === */
.schedule-bar {
  display: flex;
  align-items: center;
  font-size: 0.6rem;
  line-height: 1.2;
  border-radius: 2px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 1px 2px;
  flex-shrink: 0;
  color: #e0e0e0;
  border-left: 3px solid var(--bar-color, #9e9e9e);
  background-color: rgba(255, 255, 255, 0.05);
}

.schedule-more {
  font-size: 0.55rem;
  color: #888;
  padding-left: 3px;
}

/* === ビュータブバー === */
.view-tab-bar {
  display: flex;
  justify-content: flex-start;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  flex-shrink: 0;
}

.tab-btn {
  background: none;
  border: 1px solid #444;
  color: #888;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab-btn.active {
  background-color: var(--theme-color);
  border-color: var(--theme-color);
  color: #fff;
}

.tab-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* === FAB === */
.fab-group {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.fab {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: none;
  background-color: var(--theme-color);
  color: #f0f0f0;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: opacity 0.15s;
}

.fab:hover { opacity: 0.85; }

/* === ローディング / エラー === */
.calendar-loading,
.calendar-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.875rem;
}

.calendar-loading { color: #555; }
.calendar-error   { color: #e57373; }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/home/home.css
git commit -m "feat: add home calendar CSS (timepage dark theme)"
```

---

## Task 4: カレンダーグリッド生成 — calendar.ts

**Files:**
- Create: `frontend/src/pages/home/calendar.ts`

- [ ] **Step 1: Create calendar.ts**

```typescript
import type { Schedule } from '../../api/schedules';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_BARS = 3;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildCalendarGrid(
  year: number,
  month: number,
  scheduleList: Schedule[],
): HTMLElement {
  const today    = new Date();
  const todayStr = formatDate(today);

  const firstDow   = new Date(year, month, 1).getDay();      // 0=Sun
  const lastDate   = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + lastDate) / 7) * 7;

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // ヘッダー行（Sun〜Sat）
  DAY_LABELS.forEach((label, i) => {
    const cell = document.createElement('div');
    cell.className = `calendar-header-cell${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`;
    cell.textContent = label;
    grid.appendChild(cell);
  });

  // 日付セル
  for (let i = 0; i < totalCells; i++) {
    const date           = new Date(year, month, i - firstDow + 1);
    const isCurrentMonth = date.getMonth() === month;
    const dateStr        = formatDate(date);
    const dow            = date.getDay();

    const cell = document.createElement('div');
    cell.className = `calendar-cell${isCurrentMonth ? '' : ' out-of-month'}`;
    if (isCurrentMonth) cell.dataset.date = dateStr;

    // 日付数字
    const dateEl = document.createElement('div');
    let dateClass = 'cell-date';
    if (dateStr === todayStr) {
      dateClass += ' today';
    } else if (dow === 0) {
      dateClass += ' sun';
    } else if (dow === 6) {
      dateClass += ' sat';
    }
    dateEl.className  = dateClass;
    dateEl.textContent = String(date.getDate());
    cell.appendChild(dateEl);

    // 予定バー（当月のみ）
    if (isCurrentMonth) {
      const daySchedules = scheduleList.filter(s => s.date === dateStr);

      daySchedules.slice(0, MAX_BARS).forEach(s => {
        const bar = document.createElement('div');
        bar.className = 'schedule-bar';
        bar.style.setProperty('--bar-color', s.genre?.colorHex ?? '#9E9E9E');
        bar.textContent = s.title;
        cell.appendChild(bar);
      });

      if (daySchedules.length > MAX_BARS) {
        const more = document.createElement('div');
        more.className  = 'schedule-more';
        more.textContent = `+${daySchedules.length - MAX_BARS}`;
        cell.appendChild(more);
      }
    }

    grid.appendChild(cell);
  }

  return grid;
}
```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/home/calendar.ts
git commit -m "feat: add buildCalendarGrid pure function"
```

---

## Task 5: ページマウント — index.ts

**Files:**
- Create: `frontend/src/pages/home/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
import './home.css';
import { schedules, type Schedule } from '../../api/schedules';
import { buildCalendarGrid } from './calendar';
import { navigate } from '../../utils/router';

let currentYear      = 0;
let currentMonth     = 0;
let currentSchedules: Schedule[] = [];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function monthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

async function refreshCalendar(
  wrapper: HTMLElement,
  label: HTMLElement,
): Promise<void> {
  wrapper.innerHTML = '<div class="calendar-loading">読み込み中…</div>';

  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const from    = `${currentYear}-${pad(currentMonth + 1)}-01`;
  const to      = `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`;

  const result = await schedules.getSchedules(from, to);

  if (!result.success || !result.data) {
    wrapper.innerHTML = '<div class="calendar-error">予定を取得できませんでした</div>';
    return;
  }

  currentSchedules  = result.data;
  label.textContent = monthLabel(currentYear, currentMonth);

  const grid = buildCalendarGrid(currentYear, currentMonth, currentSchedules);
  wrapper.innerHTML = '';
  wrapper.appendChild(grid);
}

function attachSwipe(wrapper: HTMLElement, label: HTMLElement): void {
  let startY     = 0;
  let isDragging = false;

  function onStart(y: number): void {
    startY     = y;
    isDragging = true;
    wrapper.classList.add('grabbing');
  }

  function onEnd(y: number): void {
    if (!isDragging) return;
    isDragging = false;
    wrapper.classList.remove('grabbing');

    const delta = y - startY;
    if (Math.abs(delta) < 50) return;

    // スライドアウトアニメーション
    const grid = wrapper.querySelector<HTMLElement>('.calendar-grid');
    if (grid) {
      grid.style.transform = `translateY(${delta < 0 ? '-40px' : '40px'})`;
      grid.style.opacity   = '0';
    }

    if (delta < 0) {
      // 上スワイプ → 翌月
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    } else {
      // 下スワイプ → 前月
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    }

    setTimeout(() => refreshCalendar(wrapper, label), 150);
  }

  // タッチ
  wrapper.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  wrapper.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientY));

  // マウス
  wrapper.addEventListener('mousedown', e => onStart(e.clientY));
  window.addEventListener('mouseup',    e => { if (isDragging) onEnd(e.clientY); });
}

function attachCellClick(wrapper: HTMLElement): void {
  wrapper.addEventListener('click', (e) => {
    const cell = (e.target as Element).closest<HTMLElement>('.calendar-cell');
    if (!cell?.dataset.date) return;
    navigate(`/day?date=${cell.dataset.date}`);
  });
}

export function mount(app: HTMLElement): void {
  const now    = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();

  app.innerHTML = `
    <div class="home-page">
      <div class="home-header">
        <button class="icon-btn" id="btn-settings" aria-label="設定">⚙</button>
        <h2 class="month-label" id="month-label">${monthLabel(currentYear, currentMonth)}</h2>
      </div>
      <div class="calendar-wrapper" id="calendar-wrapper"></div>
      <div class="view-tab-bar">
        <button class="tab-btn" disabled>Y</button>
        <button class="tab-btn active">M</button>
        <button class="tab-btn" disabled>W</button>
      </div>
      <div class="fab-group">
        <button class="fab" id="btn-notes" aria-label="共有事項">!</button>
        <button class="fab" id="btn-new-schedule" aria-label="予定追加">+</button>
      </div>
    </div>
  `;

  const wrapper = app.querySelector<HTMLElement>('#calendar-wrapper')!;
  const label   = app.querySelector<HTMLElement>('#month-label')!;

  attachSwipe(wrapper, label);
  attachCellClick(wrapper);

  app.querySelector('#btn-settings')
    ?.addEventListener('click', () => navigate('/settings'));
  app.querySelector('#btn-notes')
    ?.addEventListener('click', () => navigate('/notes'));
  app.querySelector('#btn-new-schedule')
    ?.addEventListener('click', () => navigate('/schedule/new'));

  refreshCalendar(wrapper, label);
}
```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npx tsc --noEmit
```

Expected: エラーなし。全ファイルが揃ったのでインポートエラーも発生しない。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/home/index.ts
git commit -m "feat: add SCR-11 home calendar page (mount, swipe, render)"
```

---

## Task 6: ブラウザ動作確認

- [ ] **Step 1: バックエンドを起動**

```bash
docker start scheduleapp-sqlserver
dotnet run --project /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api
```

Expected: `Now listening on: http://localhost:5296`

- [ ] **Step 2: フロントエンドを起動**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run dev
```

Expected: `Local: http://localhost:5173/`

- [ ] **Step 3: 画面確認チェックリスト**

`http://localhost:5173` を開き、`admin` / `Admin1234!` でログイン後：

| 確認項目 | 期待結果 |
|---|---|
| `/home` に遷移する | 月カレンダーが表示される |
| ヘッダーに「2026年6月」と表示 | 当月が表示されている |
| Sun列が赤、Sat列が青のテキスト | 色分けが正しい |
| 今日の日付がテーマカラーの円 | ハイライトされている |
| 上方向マウスドラッグ（50px以上） | 翌月に切り替わる |
| 下方向マウスドラッグ（50px以上） | 前月に切り替わる |
| 日付セルをクリック | `/day?date=YYYY-MM-DD` へ遷移（404で良い） |
| `⚙` ボタンをクリック | `/settings` へ遷移（404で良い） |
| `!` FABをクリック | `/notes` へ遷移（404で良い） |
| `+` FABをクリック | `/schedule/new` へ遷移（404で良い） |
| Y/W タブをクリック | 何も起きない（disabled） |

---

## Self-Review Checklist

| 要件 | 対応 |
|---|---|
| 月カレンダーグリッド（Sun〜Sat）表示 | Task 4: buildCalendarGrid |
| GET /api/schedules?from=&to= でデータ取得 | Task 1 + Task 5: refreshCalendar |
| カラーバー形式（左端3px + タイトル）で予定表示 | Task 3: .schedule-bar + --bar-color / Task 4 |
| ジャンルなし予定はグレー（#9E9E9E）バー | Task 4: `s.genre?.colorHex ?? '#9E9E9E'` |
| 3件超は「+n」で省略 | Task 4: MAX_BARS = 3 |
| 上下スワイプ（タッチ + マウス両対応）で月切替 | Task 5: attachSwipe |
| 50px 未満は月切替しない | Task 5: `Math.abs(delta) < 50` |
| スライドアウトアニメーション | Task 5: translateY + opacity |
| 日付セルタップ → `/day?date=` | Task 5: attachCellClick |
| 歯車 → `/settings` | Task 5: btn-settings |
| `!` FAB → `/notes` | Task 5: btn-notes |
| `+` FAB → `/schedule/new` | Task 5: btn-new-schedule |
| Y/M/W タブ UI のみ（Y/W は disabled） | Task 5: view-tab-bar |
| timepage ダークテーマ | Task 3: #1a1a1a 背景 |
| テーマカラー適用（CSS変数） | Task 3: var(--theme-color) |
| 今日の日付: テーマカラー円 | Task 3: .cell-date.today / Task 4 |
| 日曜: #e57373 / 土曜: #64b5f6 | Task 3: .sun / .sat |
| FAB 背景: テーマカラー、アイコン: #f0f0f0 | Task 3: .fab |
| 当月外セル: グレー + タップ不可 | Task 3: .out-of-month / Task 4 |
| ローディング表示 | Task 5: refreshCalendar 冒頭 |
| エラー表示 | Task 5: refreshCalendar エラー分岐 |
| /home ルート登録 | Task 2: router.ts |
| Schedule 型がバックエンド DTO と一致 | Task 1: schedules.ts |
