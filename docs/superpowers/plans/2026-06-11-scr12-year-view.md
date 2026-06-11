# SCR-12 年単位表示 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 12ヶ月のミニカレンダーを3列×4行で表示する年単位ビュー（SCR-12）を実装し、SCR-11・SCR-10 との Y/M/W 切り替えを完成させる。

**Architecture:** vanilla TS のページとして `frontend/src/pages/year/` を新設する。年ページは API を呼ばず、ローカルで 12 ヶ月分のミニカレンダーを生成する。上下スワイプは `history.replaceState` + DOM 再描画で年を切り替える（フルリマウントなし）。SCR-11 の Y ボタン有効化・右スワイプ追加・`?month` パラメータ対応も同時に行う。

**Tech Stack:** TypeScript (vanilla), Vite, CSS

**仕様書:** `docs/superpowers/specs/2026-06-11-scr12-year-view-design.md`

---

## ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 修正 | `frontend/src/utils/router.ts` | `/year` ルート追加 |
| 新規 | `frontend/src/pages/year/year.css` | SCR-12 スタイル |
| 新規 | `frontend/src/pages/year/index.ts` | SCR-12 ページロジック全体 |
| 修正 | `frontend/src/pages/home/index.ts` | Y ボタン有効化・右スワイプ追加・`?month` 対応 |

---

## Task 1: ルーターに `/year` ルートを追加

**Files:**
- Modify: `frontend/src/utils/router.ts`

- [ ] **Step 1: router.ts に `/year` ルートを追加する**

```typescript
// frontend/src/utils/router.ts
// 画面IDとページモジュールのマッピング
type PageLoader = () => Promise<{ mount: (app: HTMLElement) => void }>;

const routes: Record<string, PageLoader> = {
  '/': () => import('../pages/login'),
  '/home': () => import('../pages/home'),
  '/day': () => import('../pages/day'),
  '/week': () => import('../pages/week'),
  '/year': () => import('../pages/year'),
};

export async function navigate(path: string, replace = false): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const pathname = path.split('?')[0];
  if (replace) {
    window.history.replaceState(null, '', path);
  } else {
    window.history.pushState(null, '', path);
  }

  const loader = routes[pathname];
  if (!loader) {
    app.innerHTML = `<p>画面が見つかりません: ${pathname}</p>`;
    return;
  }

  const page = await loader();
  app.innerHTML = '';
  page.mount(app);
}

export function initRouter(): void {
  window.addEventListener('popstate', () =>
    navigate(location.pathname + location.search, true),
  );
}
```

- [ ] **Step 2: ビルドエラーがないことを確認する（/year モジュール未作成なので TS エラーが出る可能性あり）**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待: `/year` モジュールが存在しない旨のエラーのみ（次 Task で解消）

- [ ] **Step 3: コミット**

```bash
git add frontend/src/utils/router.ts
git commit -m "feat: register /year route in router"
```

---

## Task 2: SCR-12 CSS を作成する

**Files:**
- Create: `frontend/src/pages/year/year.css`

- [ ] **Step 1: `frontend/src/pages/year/year.css` を作成する**

```css
/* === ページレイアウト === */
.year-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: #1a1a1a;
  color: #e0e0e0;
  overflow: hidden;
  user-select: none;
}

/* === ヘッダー（年表示） === */
.year-header {
  font-size: 1.75rem;
  font-weight: 700;
  padding: 1.25rem 1rem 0.75rem;
  flex-shrink: 0;
  line-height: 1.1;
}

/* === 12ヶ月グリッド === */
.year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  padding: 0 0.75rem 0.5rem;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* === ミニカレンダーカード === */
.year-month-card {
  background-color: #222;
  border-radius: 6px;
  padding: 0.4rem 0.35rem 0.45rem;
  cursor: pointer;
  transition: background 0.15s;
}

.year-month-card:hover {
  background-color: #2e2e2e;
}

/* === 月名 === */
.year-month-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: #bbb;
  margin-bottom: 0.2rem;
  letter-spacing: 0.03em;
}

/* === 曜日ヘッダー行 === */
.year-dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 0.1rem;
}

.year-dow-cell {
  font-size: 0.45rem;
  text-align: center;
  color: #666;
}

.year-dow-cell.sun { color: #e57373; }
.year-dow-cell.sat { color: #64b5f6; }

/* === 日付グリッド === */
.year-date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px 0;
}

.year-date-cell {
  font-size: 0.5rem;
  text-align: center;
  color: #aaa;
  padding: 1px 0;
  border-radius: 50%;
  line-height: 1.5;
}

.year-date-cell.empty {
  color: transparent;
  pointer-events: none;
}

.year-date-cell.today {
  background-color: var(--theme-color, #5c9ad6);
  color: #fff;
  font-weight: 700;
}

/* === フッター === */
.year-footer {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem 1.5rem;
  flex-shrink: 0;
}

.year-footer-btn {
  background: none;
  border: 1px solid #444;
  color: #e0e0e0;
  border-radius: 50%;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.year-footer-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 2: コミット**

```bash
git add frontend/src/pages/year/year.css
git commit -m "feat: add SCR-12 year view CSS"
```

---

## Task 3: SCR-12 ページロジックを作成する

**Files:**
- Create: `frontend/src/pages/year/index.ts`

- [ ] **Step 1: `frontend/src/pages/year/index.ts` を作成する**

```typescript
import './year.css';
import { navigate } from '../../utils/router';

// ─── 定数 ─────────────────────────────────────────────
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DOW_LABELS  = ['S','M','T','W','T','F','S'];

// ─── ユーティリティ ────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 = Sun
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ─── ミニカレンダーカード生成 ──────────────────────────
function buildMonthCard(year: number, month: number, today: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'year-month-card';

  // 月名
  const name = document.createElement('div');
  name.className   = 'year-month-name';
  name.textContent = MONTH_NAMES[month];
  card.appendChild(name);

  // 曜日ヘッダー
  const dowRow = document.createElement('div');
  dowRow.className = 'year-dow-row';
  DOW_LABELS.forEach((label, i) => {
    const cell = document.createElement('span');
    cell.className   = `year-dow-cell${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`;
    cell.textContent = label;
    dowRow.appendChild(cell);
  });
  card.appendChild(dowRow);

  // 日付グリッド
  const grid = document.createElement('div');
  grid.className = 'year-date-grid';

  const firstDay = firstDayOfWeek(year, month);
  const total    = daysInMonth(year, month);

  // 空セル（月の最初の曜日まで）
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('span');
    empty.className   = 'year-date-cell empty';
    empty.textContent = '';
    grid.appendChild(empty);
  }

  // 日付セル
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    const cell    = document.createElement('span');
    cell.className   = 'year-date-cell';
    cell.textContent = String(d);
    if (dateStr === today) cell.classList.add('today');
    grid.appendChild(cell);
  }

  card.appendChild(grid);
  return card;
}

// ─── 年グリッドを再描画 ───────────────────────────────
function renderYear(
  grid: HTMLElement,
  header: HTMLElement,
  year: number,
  onMonthTap: (month: number) => void,
): void {
  const today = todayStr();
  header.textContent = String(year);
  grid.innerHTML = '';

  for (let m = 0; m < 12; m++) {
    const card = buildMonthCard(year, m, today);
    card.addEventListener('click', () => onMonthTap(m));
    grid.appendChild(card);
  }
}

// ─── マウント ──────────────────────────────────────────
export function mount(app: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  let currentYear = parseInt(params.get('year') ?? '', 10);
  if (isNaN(currentYear)) currentYear = new Date().getFullYear();

  app.innerHTML = `
    <div class="year-page" id="year-page">
      <div class="year-header" id="year-header">${currentYear}</div>
      <div class="year-grid"   id="year-grid"></div>
      <div class="year-footer">
        <button class="year-footer-btn" id="btn-to-home" aria-label="月表示へ">→</button>
      </div>
    </div>
  `;

  const page   = app.querySelector<HTMLElement>('#year-page')!;
  const grid   = app.querySelector<HTMLElement>('#year-grid')!;
  const header = app.querySelector<HTMLElement>('#year-header')!;

  function onMonthTap(month: number): void {
    navigate(`/home?month=${currentYear}-${pad2(month + 1)}`);
  }

  renderYear(grid, header, currentYear, onMonthTap);

  // → ボタン → /home
  app.querySelector('#btn-to-home')!
    .addEventListener('click', () => navigate('/home'));

  // ─── スワイプジェスチャー ───────────────────────────
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

  function onStart(x: number, y: number): void {
    startX = x; startY = y; isDragging = true;
  }

  function onEnd(x: number, y: number): void {
    if (!isDragging) return;
    isDragging = false;

    const dx    = x - startX;
    const dy    = y - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 右スワイプ → /home
    if (absDx > absDy && absDx > 50 && dx > 0) {
      navigate('/home');
      return;
    }

    // 上下スワイプ → 年切り替え（replaceState でヒストリーを汚さない）
    if (absDy > absDx && absDy > 50) {
      currentYear += dy < 0 ? 1 : -1;
      window.history.replaceState(null, '', `/year?year=${currentYear}`);
      renderYear(grid, header, currentYear, onMonthTap);
    }
  }

  page.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  page.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

  if (mouseUpHandler !== null) window.removeEventListener('mouseup', mouseUpHandler);
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientX, e.clientY); };
  page.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mouseup', mouseUpHandler);
}
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/pages/year/year.css frontend/src/pages/year/index.ts
git commit -m "feat: add SCR-12 year view page (mini calendars, year swipe, navigation)"
```

---

## Task 4: SCR-11 ホームページを更新する

**Files:**
- Modify: `frontend/src/pages/home/index.ts`

### 変更内容

1. `?month=YYYY-MM` パラメータを読んでその月を初期表示
2. Y ボタンを有効化し `/year?year=YYYY` へのクリックハンドラを追加
3. `attachSwipe` に右スワイプ（dx > 0）→ `/year?year=YYYY` を追加

- [ ] **Step 1: `frontend/src/pages/home/index.ts` を以下の完全なコードに書き換える**

```typescript
import './home.css';
import { schedules, type Schedule } from '../../api/schedules';
import { buildCalendarGrid } from './calendar';
import { navigate } from '../../utils/router';

let currentYear      = 0;
let currentMonth     = 0;
let currentSchedules: Schedule[] = [];
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let didSwipe = false;
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  let startX     = 0;
  let startY     = 0;
  let isDragging = false;

  function onStart(x: number, y: number): void {
    startX     = x;
    startY     = y;
    isDragging = true;
    wrapper.classList.add('grabbing');
  }

  function onEnd(x: number, y: number): void {
    if (!isDragging) return;
    isDragging = false;
    wrapper.classList.remove('grabbing');

    const dx    = x - startX;
    const dy    = y - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 右スワイプ → SCR-12（年ビュー）
    if (absDx > absDy && absDx > 50 && dx > 0) {
      didSwipe = true;
      navigate(`/year?year=${currentYear}`);
      return;
    }

    // 左スワイプ → SCR-10（週ビュー）
    if (absDx > absDy && absDx > 50 && dx < 0) {
      didSwipe = true;
      navigate(`/week?start=${todayStr()}`);
      return;
    }

    // 縦スワイプ → 月を変える
    if (Math.abs(dy) < 50) return;

    didSwipe = true;

    const grid = wrapper.querySelector<HTMLElement>('.calendar-grid');
    if (grid) {
      grid.style.transform = `translateY(${dy < 0 ? '-40px' : '40px'})`;
      grid.style.opacity   = '0';
    }

    if (dy < 0) {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    } else {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    }

    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(
      () => refreshCalendar(wrapper, label).catch(() => {}),
      150,
    );
  }

  wrapper.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  wrapper.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

  if (mouseUpHandler !== null) {
    window.removeEventListener('mouseup', mouseUpHandler);
  }
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientX, e.clientY); };
  wrapper.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mouseup', mouseUpHandler);
}

function attachCellClick(wrapper: HTMLElement): void {
  wrapper.addEventListener('click', (e) => {
    if (didSwipe) { didSwipe = false; return; }
    const cell = (e.target as Element).closest<HTMLElement>('.calendar-cell');
    if (!cell?.dataset.date) return;
    navigate(`/day?date=${cell.dataset.date}`);
  });
}

export function mount(app: HTMLElement): void {
  // ?month=YYYY-MM パラメータがあればその月を初期表示
  const monthParam = new URLSearchParams(location.search).get('month');
  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      currentYear  = y;
      currentMonth = m - 1;
    } else {
      const now    = new Date();
      currentYear  = now.getFullYear();
      currentMonth = now.getMonth();
    }
  } else {
    const now    = new Date();
    currentYear  = now.getFullYear();
    currentMonth = now.getMonth();
  }

  app.innerHTML = `
    <div class="home-page">
      <div class="home-header">
        <h2 class="month-label" id="month-label">${monthLabel(currentYear, currentMonth)}</h2>
        <button class="icon-btn" id="btn-settings" aria-label="設定">⚙</button>
      </div>
      <div class="calendar-wrapper" id="calendar-wrapper"></div>
      <div class="view-tab-bar">
        <button class="tab-btn" id="btn-year-tab">Y</button>
        <button class="tab-btn active">M</button>
        <button class="tab-btn" id="btn-week-tab">W</button>
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

  app.querySelector<HTMLElement>('#btn-year-tab')!
    .addEventListener('click', () => navigate(`/year?year=${currentYear}`));
  app.querySelector<HTMLElement>('#btn-week-tab')!
    .addEventListener('click', () => navigate(`/week?start=${todayStr()}`));
  app.querySelector<HTMLElement>('#btn-settings')!
    .addEventListener('click', () => navigate('/settings'));
  app.querySelector<HTMLElement>('#btn-notes')!
    .addEventListener('click', () => navigate('/notes'));
  app.querySelector<HTMLElement>('#btn-new-schedule')!
    .addEventListener('click', () => navigate('/schedule/new'));

  refreshCalendar(wrapper, label).catch(() => {});
}
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/pages/home/index.ts
git commit -m "feat: SCR-11 enable Y tab, right swipe to /year, support ?month param"
```

---

## Task 5: 動作確認（手動）

- [ ] **Step 1: バックエンドを起動する**

```bash
docker start scheduleapp-sqlserver
dotnet run --project /Users/yoshizawayuki/ScheduleApp/backend/ScheduleApp.Api &
```

期待: `Now listening on: http://localhost:5296` のログが出る

- [ ] **Step 2: フロントエンド dev サーバーを起動する**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run dev
```

期待: `http://localhost:5173/` で dev server が起動する

- [ ] **Step 3: ゴールデンパスを確認する**

1. `http://localhost:5173` でログイン（`admin` / `Admin1234!`）
2. SCR-11（月カレンダー）左下に **Y・M・W** ボタンが表示される（M がハイライト）
3. **Y ボタン**をタップ → `/year?year=2026` に遷移し、12 ヶ月グリッドが表示される
4. **SCR-11 右スワイプ**（またはマウスドラッグ右方向）→ `/year?year=2026` に遷移する
5. 年ページで今日の日付がハイライトされている
6. **上スワイプ**（または下から上にマウスドラッグ）→ 2027 年に切り替わる
7. **下スワイプ** → 2025 年に切り替わる
8. **右スワイプ** → `/home` に戻る
9. **→ ボタン** → `/home` に戻る
10. **月セルをタップ**（例: 5月）→ `/home?month=2026-05` に遷移し、SCR-11 が 5 月表示で開く
11. 5月表示の SCR-11 で左下のタブは M がハイライトされている
12. デスクトップ: マウスドラッグで上下・左右スワイプが機能する

- [ ] **Step 4: 問題があれば修正してコミット**

```bash
git add -p
git commit -m "fix: SCR-12 manual verification fixes"
```

---

## 参照

- 仕様書: `docs/superpowers/specs/2026-06-11-scr12-year-view-design.md`
- 参考実装（スワイプパターン）: `frontend/src/pages/home/index.ts`
- 参考実装（CSS ダークテーマ）: `frontend/src/pages/week/week.css`
