# SCR-23 ボトムシート化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SCR-23（予定詳細）をスタンドアロンページから廃止し、SCR-20 の上にボトムシートとして表示する。

**Architecture:** `/schedule/:id` ルートを `pages/day` にリダイレクトし、day ページが URL を検知してシートを自動表示する。シート開閉はブラウザの history と連動し（pushState/popstate）、popstate フック機構でルーターの再マウントを防ぐ。

**Tech Stack:** Vanilla TypeScript (strict), Vite, CSS transitions (transform/opacity), touch/mouse events

## Global Constraints

- TypeScript strict モード — `npm run build` (= `tsc + vite build`) がエラーなしで通ること
- XSS 安全 — ユーザー入力文字列（title, genre.name, detail）は `.textContent` で設定、innerHTML に直接展開しない
- touch + mouse の両イベント実装 — スワイプ操作は必ず両方を付ける
- `app.querySelector` を基本とし、`document.getElementById` は使わない
- 削除は `git rm` でインデックスから除去する
- 既存テスト（`dotnet test backend/ScheduleApp.Tests`）を壊さない — バックエンドは無変更

---

## ファイル構成

| 操作 | パス | 担当 |
|---|---|---|
| 修正 | `frontend/src/utils/router.ts` | popstate フック API 追加、`/schedule/:id` → day ページ |
| 修正 | `frontend/src/pages/day/day.css` | シート・オーバーレイ CSS |
| 修正 | `frontend/src/pages/day/index.ts` | mount 分割・シート実装・popstate フック登録 |
| 修正 | `frontend/src/pages/schedule/new/index.ts` | 保存後 navigate に `true` を追加 |
| 修正 | `frontend/src/pages/schedule/edit/index.ts` | 更新後 `true`、cancel を navigate に変更 |
| 削除 | `frontend/src/pages/schedule/detail/index.ts` | 旧 SCR-23 ページ |
| 削除 | `frontend/src/pages/schedule/detail/detail.css` | 旧 SCR-23 スタイル |

---

### Task 1: Router — popstate フック + `/schedule/:id` → day ページ

**Files:**
- Modify: `frontend/src/utils/router.ts`

**Interfaces:**
- Produces:
  - `registerPopstateHook(hook: (path: string) => boolean): void` — export
  - `unregisterPopstateHook(): void` — export
  - 既存の `navigate(path, replace?)` と `initRouter()` は署名変更なし

- [ ] **Step 1: 現在の router.ts の全文を確認する**

```bash
cat -n frontend/src/utils/router.ts
```

Expected: 47 行のファイル（routes, dynamicRoutes, navigate, initRouter）

- [ ] **Step 2: router.ts を以下の内容に全置換する**

```typescript
// 画面IDとページモジュールのマッピング
type PageLoader = () => Promise<{ mount: (app: HTMLElement) => void }>;

const routes: Record<string, PageLoader> = {
  '/': () => import('../pages/login'),
  '/home': () => import('../pages/home'),
  '/day': () => import('../pages/day'),
  '/week': () => import('../pages/week'),
  '/year': () => import('../pages/year'),
  '/schedule/new': () => import('../pages/schedule/new'),
};

const dynamicRoutes: Array<{ pattern: RegExp; loader: PageLoader }> = [
  { pattern: /^\/schedule\/\d+\/edit$/, loader: () => import('../pages/schedule/edit') },
  { pattern: /^\/schedule\/\d+$/,       loader: () => import('../pages/day') },
];

let popstateHook: ((path: string) => boolean) | null = null;

export function registerPopstateHook(hook: (path: string) => boolean): void {
  popstateHook = hook;
}

export function unregisterPopstateHook(): void {
  popstateHook = null;
}

export async function navigate(path: string, replace = false): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const pathname = path.split('?')[0];
  if (replace) {
    window.history.replaceState(null, '', path);
  } else {
    window.history.pushState(null, '', path);
  }

  const loader = routes[pathname]
    ?? dynamicRoutes.find(r => r.pattern.test(pathname))?.loader;
  if (!loader) {
    app.innerHTML = `<p>画面が見つかりません: ${pathname}</p>`;
    return;
  }

  const page = await loader();
  app.innerHTML = '';
  page.mount(app);
}

export function initRouter(): void {
  window.addEventListener('popstate', () => {
    const path = location.pathname + location.search;
    if (popstateHook && popstateHook(path)) return;
    navigate(path, true);
  });
}
```

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...` でエラーなし

- [ ] **Step 4: コミット**

```bash
git add frontend/src/utils/router.ts
git commit -m "feat: router — popstate hook + /schedule/:id → day page"
```

---

### Task 2: Day CSS — シート・オーバーレイスタイル

**Files:**
- Modify: `frontend/src/pages/day/day.css`

**Interfaces:**
- Produces: 以下の CSS クラス（Task 3 の JS から使用）
  - `.day-sheet-overlay` / `.day-sheet-overlay.hidden`
  - `.day-sheet` / `.day-sheet.hidden`
  - `.day-sheet-handle`, `.day-sheet-header`, `.day-sheet-title`, `.day-sheet-edit-btn`
  - `.day-sheet-body`, `.day-sheet-time`, `.day-sheet-date`, `.day-sheet-genre-badge`
  - `.day-sheet-section`, `.day-sheet-icon`, `.day-sheet-label`, `.day-sheet-info`
  - `.day-sheet-avatar`, `.day-sheet-with-row`, `.day-sheet-memo`, `.day-sheet-memo-text`
  - `.day-sheet-loading`

- [ ] **Step 1: day.css の末尾（282行目以降）に以下を追記する**

```css
/* ========================================
   SCR-23 ボトムシート
   ======================================== */

/* オーバーレイ */
.day-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  transition: opacity 0.25s ease;
}

.day-sheet-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

/* シート本体 */
.day-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80dvh;
  background: var(--theme-color, #1a1a1a);
  border-radius: 1rem 1rem 0 0;
  z-index: 101;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  overflow: hidden;
  touch-action: none;
}

/* ドラッグハンドル */
.day-sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0.75rem auto 0;
  flex-shrink: 0;
  cursor: grab;
}

/* ヘッダー（タイトル + 編集ボタン） */
.day-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem 0.5rem;
  flex-shrink: 0;
}

.day-sheet-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  word-break: break-word;
  flex: 1;
  margin-right: 0.5rem;
}

.day-sheet-edit-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.5rem;
  flex-shrink: 0;
  line-height: 1;
  transition: opacity 0.15s;
}

.day-sheet-edit-btn:hover { opacity: 0.7; }

/* ボディ（スクロール可能） */
.day-sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

/* 時刻 */
.day-sheet-time {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
}

/* 日付 */
.day-sheet-date {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 0.5rem;
}

/* ジャンルバッジ */
.day-sheet-genre-badge {
  display: inline-block;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* セクション（アイコン + 情報） */
.day-sheet-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.day-sheet-icon {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.55);
}

.day-sheet-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
}

.day-sheet-info {
  font-size: 0.95rem;
  color: #e0e0e0;
}

/* With 行 */
.day-sheet-with-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.day-sheet-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.1);
}

/* メモ */
.day-sheet-memo {
  max-width: 90%;
  text-align: center;
  margin-top: 0.5rem;
}

.day-sheet-memo-text {
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  opacity: 0.9;
  color: #e0e0e0;
  white-space: pre-wrap;
}

/* ローディング / エラー */
.day-sheet-loading {
  font-size: 1rem;
  color: #888;
  padding: 2rem;
  text-align: center;
}
```

- [ ] **Step 2: ビルドが通ることを確認する**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/pages/day/day.css
git commit -m "feat: day page — bottom sheet CSS"
```

---

### Task 3: Day page JS — mount 分割・シート実装・popstate フック

これが最も大きなタスク。`day/index.ts` の全体を書き直す。

**Files:**
- Modify: `frontend/src/pages/day/index.ts`

**Interfaces:**
- Consumes (from Task 1):
  - `registerPopstateHook(hook: (path: string) => boolean): void`
  - `unregisterPopstateHook(): void`
- Consumes (from Task 2):
  - `.day-sheet`, `.day-sheet-overlay`, `.day-sheet.open` など Task 2 の全クラス
- Consumes (existing API):
  - `schedules.getScheduleById(id: number): Promise<ApiEnvelope<Schedule>>`
  - `schedules.getSchedules(from, to): Promise<ApiEnvelope<Schedule[]>>`
  - `type Schedule` — `id, title, date, startTime, endTime, notificationTime, visibility, detail, creatorId, genre: { colorHex, name } | null`

**Produces:**
- `export function mount(app: HTMLElement): void` — シグネチャは変わらず
- 内部: `mountDay(app, dateStr, openSheetId)`, `openScheduleSheet(id)`, `triggerCloseSheet()`, `hideSheetUI()` を定義

- [ ] **Step 1: 現在の day/index.ts の全文をバックアップとして読み確認する**

```bash
wc -l frontend/src/pages/day/index.ts
```

Expected: 457 行

- [ ] **Step 2: frontend/src/pages/day/index.ts を以下の内容で全置換する**

注意:
- `isDarkColor` と `formatDate` は旧 `detail/index.ts` にあった関数を移植する
- `openScheduleSheet` と関連関数は `mountDay()` 内クロージャとして定義する（`app.querySelector` でアクセスするため）
- `attachSheetDrag` はモジュールレベル関数として定義する（DOM 要素を引数で受け取る）
- 左右スワイプ (`attachSwipe`) はシートが開いている間は無効にする

```typescript
import './day.css';
import { schedules, type Schedule } from '../../api/schedules';
import { navigate, registerPopstateHook, unregisterPopstateHook } from '../../utils/router';

// ─── 定数 ─────────────────────────────────────────────
const VIEW_MODE_KEY = 'scr20_view_mode';
const HOUR_HEIGHT   = 60;
const DAY_NAMES_JA  = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const DELETE_PX     = 64;
const SHEET_CLOSE_THRESHOLD = 80; // px

type ViewMode = 'list' | 'timeline';

// ─── モジュール変数 ────────────────────────────────────
let didSwipe      = false;
let mouseUpHandler: ((e: MouseEvent) => void) | null = null;
let openCard: HTMLElement | null = null;

// ─── ユーティリティ ────────────────────────────────────
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${parseInt(h, 10)}:${m}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function headerText(dateStr: string): { name: string; date: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    name: DAY_NAMES_JA[d.getDay()],
    date: `${d.getMonth() + 1}月 ${d.getDate()}日`,
  };
}

function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function formatDate(dateStr: string): string {
  const days   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── カードスワイプ: 開いているカードを閉じる ─────────
function closeOpenCard(): void {
  if (!openCard) return;
  openCard.style.transform = 'translateX(0)';
  openCard = null;
}

// ─── カードスワイプ: Apple Music スタイル ────────────
function attachCardSwipe(
  card: HTMLElement,
  deleteBtn: HTMLButtonElement,
  onDelete: () => void,
): void {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let isOpen = false;
  let cardMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  let cardMouseUpHandler: ((e: MouseEvent) => void) | null = null;

  function openCard_(): void {
    closeOpenCard();
    card.style.transform = `translateX(-${DELETE_PX}px)`;
    openCard = card;
    isOpen = true;
  }

  function closeCard(): void {
    card.style.transform = 'translateX(0)';
    if (openCard === card) openCard = null;
    isOpen = false;
  }

  card.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) { tracking = false; return; }
    const base = isOpen ? -DELETE_PX : 0;
    const clamped = Math.min(0, Math.max(-DELETE_PX, base + dx));
    card.style.transform = `translateX(${clamped}px)`;
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (!isOpen && dx < -40) { openCard_(); return; }
    closeCard();
  });

  card.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    tracking = true;

    if (cardMouseMoveHandler) window.removeEventListener('mousemove', cardMouseMoveHandler);
    if (cardMouseUpHandler) window.removeEventListener('mouseup', cardMouseUpHandler);

    cardMouseMoveHandler = (me: MouseEvent) => {
      if (!tracking) return;
      const dx = me.clientX - startX;
      const base = isOpen ? -DELETE_PX : 0;
      const clamped = Math.min(0, Math.max(-DELETE_PX, base + dx));
      card.style.transform = `translateX(${clamped}px)`;
    };
    cardMouseUpHandler = (me: MouseEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = me.clientX - startX;
      if (!isOpen && dx < -40) { openCard_(); return; }
      closeCard();
    };
    window.addEventListener('mousemove', cardMouseMoveHandler);
    window.addEventListener('mouseup', cardMouseUpHandler);
  });

  card.addEventListener('click', (e) => {
    if (isOpen) {
      e.stopPropagation();
      closeCard();
    }
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete();
  });
}

// ─── シートのドラッグ（ハンドル） ────────────────────
function attachSheetDrag(
  handle: HTMLElement,
  sheet: HTMLElement,
  onClose: () => void,
): void {
  let startY = 0;
  let dragging = false;
  let sdMouseMove: ((e: MouseEvent) => void) | null = null;
  let sdMouseUp: ((e: MouseEvent) => void) | null = null;

  function onStart(y: number): void {
    startY = y;
    dragging = true;
    sheet.style.transition = 'none';
  }

  function onMove(y: number): void {
    if (!dragging) return;
    const dy = Math.max(0, y - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  }

  function onEnd(y: number): void {
    if (!dragging) return;
    dragging = false;
    const dy = Math.max(0, y - startY);
    if (dy >= SHEET_CLOSE_THRESHOLD) {
      onClose();
    } else {
      sheet.style.transition = 'transform 0.3s ease';
      sheet.style.transform = 'translateY(0)';
    }
  }

  handle.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  handle.addEventListener('touchmove', e => {
    e.preventDefault();
    onMove(e.touches[0].clientY);
  }, { passive: false });
  handle.addEventListener('touchend', e => onEnd(e.changedTouches[0].clientY));

  handle.addEventListener('mousedown', e => {
    onStart(e.clientY);
    sdMouseMove = (me: MouseEvent) => onMove(me.clientY);
    sdMouseUp   = (me: MouseEvent) => {
      onEnd(me.clientY);
      if (sdMouseMove) window.removeEventListener('mousemove', sdMouseMove);
      if (sdMouseUp)   window.removeEventListener('mouseup', sdMouseUp);
    };
    window.addEventListener('mousemove', sdMouseMove);
    window.addEventListener('mouseup', sdMouseUp);
  });
}

// ─── 描画: リストビュー ────────────────────────────────
function renderList(area: HTMLElement, list: Schedule[], currentUserId: number, onDelete: (id: number) => void): void {
  area.innerHTML = '';
  if (list.length === 0) {
    area.innerHTML = '<div class="day-empty">予定なし</div>';
    return;
  }

  list.forEach(s => {
    const wrap = document.createElement('div');
    wrap.className = 'day-card-swipe-wrap';

    const isCreator = s.creatorId === currentUserId;
    let deleteBtn: HTMLButtonElement | null = null;
    if (isCreator) {
      deleteBtn = document.createElement('button');
      deleteBtn.className = 'day-delete-btn';
      deleteBtn.textContent = '削除';
      wrap.appendChild(deleteBtn);
    }

    const card = document.createElement('div');
    card.className   = 'day-card';
    card.dataset.id  = String(s.id);

    const bar = document.createElement('div');
    bar.className = 'day-card-genre-bar';
    bar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

    const body = document.createElement('div');
    body.className = 'day-card-body';

    const titleEl = document.createElement('div');
    titleEl.className   = 'day-card-title';
    titleEl.textContent = s.title;

    const timeEl = document.createElement('div');
    timeEl.className   = 'day-card-time';
    timeEl.textContent = `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`;

    body.appendChild(titleEl);
    body.appendChild(timeEl);
    card.appendChild(bar);
    card.appendChild(body);
    wrap.appendChild(card);
    area.appendChild(wrap);

    if (isCreator && deleteBtn) {
      attachCardSwipe(card, deleteBtn, () => onDelete(s.id));
    }
  });
}

// ─── 描画: タイムラインビュー ─────────────────────────
function renderTimeline(area: HTMLElement, list: Schedule[], currentUserId: number, onDelete: (id: number) => void): void {
  area.innerHTML = '';

  if (list.length === 0) {
    area.innerHTML = '<div class="day-empty">予定なし</div>';
    return;
  }

  const container = document.createElement('div');
  container.className = 'day-timeline';

  for (let h = 0; h < 24; h++) {
    const row = document.createElement('div');
    row.className = 'day-timeline-row';
    row.style.top = `${h * HOUR_HEIGHT}px`;

    const hourEl = document.createElement('span');
    hourEl.className   = 'day-timeline-hour';
    hourEl.textContent = String(h);

    const line = document.createElement('div');
    line.className = 'day-timeline-line';

    row.appendChild(hourEl);
    row.appendChild(line);
    container.appendChild(row);
  }

  list.forEach(s => {
    if (!s.startTime || !s.endTime) return;

    const startMin = timeToMinutes(s.startTime);
    const endMin   = timeToMinutes(s.endTime);
    const top      = (startMin / 60) * HOUR_HEIGHT;
    const height   = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

    const wrap = document.createElement('div');
    wrap.className  = 'day-event-swipe-wrap';
    wrap.style.top    = `${top}px`;
    wrap.style.height = `${height}px`;

    const isCreator = s.creatorId === currentUserId;
    let deleteBtn: HTMLButtonElement | null = null;
    if (isCreator) {
      deleteBtn = document.createElement('button');
      deleteBtn.className = 'day-delete-btn';
      deleteBtn.textContent = '削除';
      wrap.appendChild(deleteBtn);
    }

    const block = document.createElement('div');
    block.className  = 'day-event-block';
    block.dataset.id = String(s.id);

    const genreBar = document.createElement('div');
    genreBar.className = 'day-event-genre-bar';
    genreBar.style.backgroundColor = s.genre?.colorHex ?? '#9e9e9e';

    const bodyEl = document.createElement('div');
    bodyEl.className = 'day-event-body';

    const titleEl = document.createElement('div');
    titleEl.className   = 'day-event-title';
    titleEl.textContent = s.title;

    const timeEl = document.createElement('div');
    timeEl.className   = 'day-event-time';
    timeEl.textContent = `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`;

    bodyEl.appendChild(titleEl);
    bodyEl.appendChild(timeEl);
    block.appendChild(genreBar);
    block.appendChild(bodyEl);
    wrap.appendChild(block);
    container.appendChild(wrap);

    if (isCreator && deleteBtn) {
      attachCardSwipe(block, deleteBtn, () => onDelete(s.id));
    }
  });

  area.appendChild(container);

  const startMinutes = list
    .filter(s => s.startTime)
    .map(s => timeToMinutes(s.startTime!));
  const scrollTo = startMinutes.length > 0 ? Math.min(...startMinutes) : 9 * 60;
  area.scrollTop = Math.max(0, (scrollTo / 60) * HOUR_HEIGHT - 40);
}

// ─── スワイプ（左右） ─────────────────────────────────
function attachSwipe(
  el: HTMLElement,
  currentDate: string,
  onSwipe: (newDate: string) => void,
  isSheetOpen: () => boolean,
): void {
  let startX     = 0;
  let isDragging = false;

  function onStart(x: number): void {
    startX     = x;
    isDragging = true;
  }

  function onEnd(x: number): void {
    if (!isDragging) return;
    isDragging = false;
    if (isSheetOpen()) return;

    const delta = x - startX;
    if (Math.abs(delta) < 50) return;

    didSwipe = true;
    onSwipe(addDays(currentDate, delta < 0 ? 1 : -1));
  }

  el.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
  el.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX));

  if (mouseUpHandler !== null) window.removeEventListener('mouseup', mouseUpHandler);
  mouseUpHandler = (e: MouseEvent) => { if (isDragging) onEnd(e.clientX); };
  el.addEventListener('mousedown', e => onStart(e.clientX));
  window.addEventListener('mouseup', mouseUpHandler);
}

// ─── エントリポイント ──────────────────────────────────
export function mount(app: HTMLElement): void {
  didSwipe = false;

  const sheetMatch = location.pathname.match(/^\/schedule\/(\d+)$/);
  const dateParam  = new URLSearchParams(location.search).get('date') ?? '';

  if (!sheetMatch && !dateParam) { navigate('/home'); return; }

  if (sheetMatch) {
    const sheetId = parseInt(sheetMatch[1], 10);
    schedules.getScheduleById(sheetId)
      .then(r => {
        if (!r.success || !r.data) { navigate('/home'); return; }
        mountDay(app, r.data.date.slice(0, 10), sheetId);
      })
      .catch(() => navigate('/home'));
    return;
  }

  mountDay(app, dateParam, null);
}

// ─── day ページ本体 ────────────────────────────────────
function mountDay(app: HTMLElement, dateStr: string, openSheetId: number | null): void {
  const currentUserId = parseInt(localStorage.getItem('currentUserId') ?? '0', 10);
  const { name, date } = headerText(dateStr);
  const savedMode = (localStorage.getItem(VIEW_MODE_KEY) ?? 'list') as ViewMode;

  app.innerHTML = `
    <div class="day-page" id="day-page">
      <div class="day-header">
        <div class="day-name">${name}</div>
        <div class="day-date">${date}</div>
      </div>
      <div class="day-content">
        <div class="day-section-label">Schedule</div>
        <div class="day-schedule-area" id="day-schedule-area">
          <div class="day-empty">読み込み中…</div>
        </div>
      </div>
      <div class="day-footer">
        <button class="day-footer-btn" id="btn-back" aria-label="戻る">←</button>
        <div class="day-toggle-wrap">
          <button class="day-toggle" id="btn-toggle" data-mode="${savedMode}" aria-label="表示切替">
            <div class="day-toggle-thumb">🕐</div>
          </button>
        </div>
        <button class="day-footer-btn" id="btn-add" aria-label="予定追加">+</button>
      </div>
    </div>
    <div class="day-sheet-overlay" id="day-sheet-overlay" style="opacity:0;pointer-events:none;"></div>
    <div class="day-sheet" id="day-sheet">
      <div class="day-sheet-handle" id="day-sheet-handle"></div>
      <div class="day-sheet-header">
        <span class="day-sheet-title" id="day-sheet-title"></span>
        <button class="day-sheet-edit-btn" id="day-sheet-edit" aria-label="編集">✏️</button>
      </div>
      <div class="day-sheet-body" id="day-sheet-body"></div>
    </div>
  `;

  const area    = app.querySelector<HTMLElement>('#day-schedule-area')!;
  const toggle  = app.querySelector<HTMLElement>('#btn-toggle')!;
  const page    = app.querySelector<HTMLElement>('#day-page')!;
  const overlay = app.querySelector<HTMLElement>('#day-sheet-overlay')!;
  const sheet   = app.querySelector<HTMLElement>('#day-sheet')!;
  const handle  = app.querySelector<HTMLElement>('#day-sheet-handle')!;
  const sheetBody  = app.querySelector<HTMLElement>('#day-sheet-body')!;
  const sheetTitle = app.querySelector<HTMLElement>('#day-sheet-title')!;
  const sheetEdit  = app.querySelector<HTMLButtonElement>('#day-sheet-edit')!;

  let currentMode: ViewMode = savedMode;
  let currentSchedules: Schedule[] = [];
  let sheetVisible = false;

  // ─── シート: 表示 ──────────────────────────────────
  function showSheetUI(): void {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'auto';
    overlay.style.transition = 'opacity 0.25s ease';
    sheet.style.transition = 'none';
    sheet.style.transform = 'translateY(100%)';
    void sheet.offsetHeight; // force reflow
    sheet.style.transition = 'transform 0.3s ease';
    sheet.style.transform = 'translateY(0)';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    sheetVisible = true;
  }

  // ─── シート: 非表示 ────────────────────────────────
  function hideSheetUI(): void {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    sheet.style.transition = 'transform 0.3s ease';
    sheet.style.transform = 'translateY(100%)';
    sheetVisible = false;
  }

  // ─── シートを閉じてブラウザ履歴を戻す ─────────────
  function triggerCloseSheet(): void {
    hideSheetUI();
    setTimeout(() => history.back(), 300);
  }

  // ─── シートを開いて予定を読み込む ─────────────────
  function openScheduleSheet(scheduleId: number): void {
    sheetTitle.textContent = '';
    sheetBody.innerHTML = '';
    const loadEl = document.createElement('div');
    loadEl.className = 'day-sheet-loading';
    loadEl.textContent = '読み込み中…';
    sheetBody.appendChild(loadEl);
    showSheetUI();

    schedules.getScheduleById(scheduleId)
      .then(result => {
        if (!result.success || !result.data) {
          sheetBody.innerHTML = '';
          const errEl = document.createElement('div');
          errEl.className = 'day-sheet-loading';
          errEl.textContent = '取得に失敗しました';
          sheetBody.appendChild(errEl);
          return;
        }
        const s = result.data;

        sheetTitle.textContent = s.title;

        sheetEdit.onclick = () => {
          hideSheetUI();
          navigate(`/schedule/${s.id}/edit`);
        };

        const timeStr = s.startTime
          ? `${s.startTime.slice(0, 5)}${s.endTime ? ` - ${s.endTime.slice(0, 5)}` : ''}`
          : '終日';
        const storedId = parseInt(localStorage.getItem('currentUserId') ?? '0', 10);
        const creatorLabel = s.creatorId === storedId ? '自分' : '他のメンバー';

        sheetBody.innerHTML = '';

        const timePara = document.createElement('p');
        timePara.className = 'day-sheet-time';
        timePara.textContent = timeStr;
        sheetBody.appendChild(timePara);

        const datePara = document.createElement('p');
        datePara.className = 'day-sheet-date';
        datePara.textContent = formatDate(s.date);
        sheetBody.appendChild(datePara);

        if (s.genre) {
          const badge = document.createElement('span');
          badge.className = 'day-sheet-genre-badge';
          badge.style.background = s.genre.colorHex;
          badge.style.color = isDarkColor(s.genre.colorHex) ? '#ffffff' : '#1a1a1a';
          badge.textContent = s.genre.name;
          sheetBody.appendChild(badge);
        }

        const notifSec = document.createElement('div');
        notifSec.className = 'day-sheet-section';
        const notifIcon = document.createElement('span');
        notifIcon.className = 'day-sheet-icon';
        notifIcon.textContent = '🔔';
        const notifInfo = document.createElement('span');
        notifInfo.className = 'day-sheet-info';
        notifInfo.textContent = s.notificationTime.slice(0, 5);
        notifSec.appendChild(notifIcon);
        notifSec.appendChild(notifInfo);
        sheetBody.appendChild(notifSec);

        const withSec = document.createElement('div');
        withSec.className = 'day-sheet-section';
        const withLabel = document.createElement('span');
        withLabel.className = 'day-sheet-label';
        withLabel.textContent = 'With';
        const withRow = document.createElement('div');
        withRow.className = 'day-sheet-with-row';
        const avatar = document.createElement('div');
        avatar.className = 'day-sheet-avatar';
        avatar.textContent = '👤';
        const withInfo = document.createElement('span');
        withInfo.className = 'day-sheet-info';
        withInfo.textContent = creatorLabel;
        withRow.appendChild(avatar);
        withRow.appendChild(withInfo);
        withSec.appendChild(withLabel);
        withSec.appendChild(withRow);
        sheetBody.appendChild(withSec);

        if (s.detail) {
          const memoSec = document.createElement('div');
          memoSec.className = 'day-sheet-memo';
          const memoText = document.createElement('p');
          memoText.className = 'day-sheet-memo-text';
          memoText.textContent = s.detail;
          memoSec.appendChild(memoText);
          sheetBody.appendChild(memoSec);
        }
      })
      .catch(() => {
        sheetBody.innerHTML = '';
        const errEl = document.createElement('div');
        errEl.className = 'day-sheet-loading';
        errEl.textContent = '取得に失敗しました';
        sheetBody.appendChild(errEl);
      });
  }

  // ─── シートインタラクション ────────────────────────
  overlay.addEventListener('click', () => triggerCloseSheet());
  attachSheetDrag(handle, sheet, triggerCloseSheet);

  // ─── popstate フック登録 ──────────────────────────
  registerPopstateHook((path: string) => {
    if (!app.querySelector('#day-page')) {
      unregisterPopstateHook();
      return false;
    }
    const m = path.match(/^\/schedule\/(\d+)/);
    if (m) {
      openScheduleSheet(parseInt(m[1], 10));
      return true;
    }
    if (path.startsWith('/day')) {
      hideSheetUI();
      return true;
    }
    return false;
  });

  // ─── 描画 ─────────────────────────────────────────
  function render(): void {
    if (currentMode === 'list') {
      renderList(area, currentSchedules, currentUserId, handleDelete);
    } else {
      renderTimeline(area, currentSchedules, currentUserId, handleDelete);
    }
  }

  const deletingIds = new Set<number>();

  function handleDelete(id: number): void {
    if (deletingIds.has(id)) return;
    deletingIds.add(id);

    schedules.deleteSchedule(id)
      .then(result => {
        deletingIds.delete(id);
        if (!result.success) { closeOpenCard(); return; }
        currentSchedules = currentSchedules.filter(s => s.id !== id);
        openCard = null;
        render();
      })
      .catch(() => {
        deletingIds.delete(id);
        closeOpenCard();
      });
  }

  schedules.getSchedules(dateStr, dateStr)
    .then(result => {
      if (!result.success || !result.data) {
        area.innerHTML = '<div class="day-empty">予定を取得できませんでした</div>';
        return;
      }
      currentSchedules = result.data.sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
      render();
    })
    .catch(() => {
      area.innerHTML = '<div class="day-empty">予定を取得できませんでした</div>';
    });

  page.addEventListener('click', () => closeOpenCard());

  // 予定タップ → シートを開く
  area.addEventListener('click', e => {
    if (didSwipe) { didSwipe = false; return; }
    const card = (e.target as Element).closest<HTMLElement>('[data-id]');
    if (!card?.dataset.id) return;
    const id = parseInt(card.dataset.id, 10);
    history.pushState(null, '', `/schedule/${id}`);
    openScheduleSheet(id);
  });

  toggle.addEventListener('click', () => {
    currentMode = currentMode === 'list' ? 'timeline' : 'list';
    toggle.dataset.mode = currentMode;
    localStorage.setItem(VIEW_MODE_KEY, currentMode);
    render();
  });

  app.querySelector('#btn-back')!
    .addEventListener('click', () => history.back());

  app.querySelector('#btn-add')!
    .addEventListener('click', () => navigate(`/schedule/new?date=${dateStr}`));

  attachSwipe(
    page,
    dateStr,
    newDate => navigate(`/day?date=${newDate}`, true),
    () => sheetVisible,
  );

  if (openSheetId !== null) openScheduleSheet(openSheetId);
}
```

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: TypeScript エラーなし、`✓ built in ...`

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/day/index.ts
git commit -m "feat: day page — bottom sheet implementation with popstate hook"
```

---

### Task 4: ポストセーブ遷移修正 + detail ページ削除

**Files:**
- Modify: `frontend/src/pages/schedule/new/index.ts:359`
- Modify: `frontend/src/pages/schedule/edit/index.ts:291,352`
- Delete: `frontend/src/pages/schedule/detail/index.ts`
- Delete: `frontend/src/pages/schedule/detail/detail.css`

**Interfaces:**
- Consumes: Task 1 の `navigate(path, replace=true)` シグネチャ（既存）

- [ ] **Step 1: new/index.ts の保存後ナビゲートを replace=true に変更する**

対象: `frontend/src/pages/schedule/new/index.ts` 359 行目

```typescript
// Before
navigate(`/schedule/${result.data.id}`);

// After
navigate(`/schedule/${result.data.id}`, true);
```

- [ ] **Step 2: edit/index.ts の cancel ボタンを history.back() から navigate に変更する**

対象: `frontend/src/pages/schedule/edit/index.ts` 291 行目

```typescript
// Before
app.querySelector('#btn-cancel')!
  .addEventListener('click', () => history.back());

// After
app.querySelector('#btn-cancel')!
  .addEventListener('click', () => navigate(`/day?date=${s.date.slice(0, 10)}`, true));
```

- [ ] **Step 3: edit/index.ts の更新後ナビゲートを replace=true に変更する**

対象: `frontend/src/pages/schedule/edit/index.ts` 352 行目

```typescript
// Before
navigate(`/schedule/${id}`);

// After
navigate(`/schedule/${id}`, true);
```

- [ ] **Step 4: 旧 SCR-23 ページを削除する**

```bash
git rm frontend/src/pages/schedule/detail/index.ts
git rm frontend/src/pages/schedule/detail/detail.css
```

- [ ] **Step 5: ビルドが通ることを確認する**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...` エラーなし（detail ページへの参照は router.ts から削除済み）

- [ ] **Step 6: バックエンドテストが通ることを確認する**

```bash
cd /Users/yoshizawayuki/ScheduleApp && dotnet test backend/ScheduleApp.Tests 2>&1 | tail -5
```

Expected: `成功!   -失敗:     0、合格:    54、スキップ:     0`

- [ ] **Step 7: コミット**

```bash
git add frontend/src/pages/schedule/new/index.ts
git add frontend/src/pages/schedule/edit/index.ts
git commit -m "feat: SCR-23 sheet — post-save navigate replace + cancel fix + delete detail page"
```

---

### Task 5: ブラウザ動作確認（E2E）

サーバーを起動して Playwright で動作確認する。

- [ ] **Step 1: 両サーバーを起動する（別ターミナルで）**

```bash
# ターミナル1
dotnet run --project backend/ScheduleApp.Api

# ターミナル2
cd frontend && npm run dev
```

両方が起動していることを確認:
```bash
curl -s http://localhost:5296/api/health | head -c 50
curl -s http://localhost:5173 | head -c 100
```

- [ ] **Step 2: Playwright で動作確認スクリプトを実行する**

```bash
node /tmp/verify-scr23-sheet.cjs
```

スクリプトの内容:

```javascript
const { chromium } = require('/Users/yoshizawayuki/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const SS = '/tmp/scr23-verify';
fs.mkdirSync(SS, { recursive: true });
const ss = (page, name) => page.screenshot({ path: `${SS}/${name}.png`, fullPage: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ログイン
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const inputs = await page.$$('input');
  await inputs[0].fill('admin');
  await inputs[1].fill('Admin1234!');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/home', { timeout: 8000 });
  console.log('✅ ログイン');

  // SCR-20 を開く（予定が存在する日付を指定）
  await page.goto(BASE + '/day?date=2026-06-20');
  await page.waitForTimeout(1500);
  await ss(page, '01-day-page');

  // 予定タップ
  const cards = await page.$$('[data-id]');
  console.log('予定カード数:', cards.length);
  if (cards.length === 0) throw new Error('予定がない。SCR-21 で先に作成してください');

  await cards[0].click();
  await page.waitForTimeout(800);
  await ss(page, '02-sheet-open');
  const sheetEl = await page.$('#day-sheet');
  const sheetTransform = await sheetEl!.evaluate(el => getComputedStyle(el).transform);
  console.log('✅ シート transform:', sheetTransform);
  const currentUrl = page.url();
  console.log('✅ URL after tap:', currentUrl);
  if (!currentUrl.match(/\/schedule\/\d+$/)) throw new Error('URL should be /schedule/:id');

  // シートタイトルが表示されているか
  const title = await page.$eval('#day-sheet-title', el => el.textContent);
  console.log('✅ シートタイトル:', title);

  // オーバーレイクリックで閉じる
  await page.$('#day-sheet-overlay').then(el => el!.click());
  await page.waitForTimeout(600);
  await ss(page, '03-sheet-closed');
  console.log('✅ オーバーレイクリックで閉じる URL:', page.url());

  // 再度タップしてブラウザ戻るで閉じる
  await cards[0].click();
  await page.waitForTimeout(800);
  await page.goBack();
  await page.waitForTimeout(600);
  await ss(page, '04-back-closes-sheet');
  console.log('✅ ブラウザ戻るで閉じる URL:', page.url());

  // ✏️ 編集ボタン → SCR-22 遷移
  await cards[0].click();
  await page.waitForTimeout(800);
  await page.$('#day-sheet-edit').then(el => el!.click());
  await page.waitForTimeout(800);
  await ss(page, '05-edit-page');
  console.log('✅ 編集遷移 URL:', page.url());

  // SCR-22 キャンセル
  await page.$('#btn-cancel').then(el => el!.click());
  await page.waitForTimeout(800);
  await ss(page, '06-cancel-back-to-day');
  console.log('✅ キャンセル後 URL:', page.url());
  if (!page.url().includes('/day')) throw new Error('Should be /day after cancel');

  // SCR-21 保存後にシートが開く
  await page.goto(BASE + '/schedule/new?date=2026-06-20');
  await page.waitForTimeout(1000);
  await page.fill('#new-title', 'シートテスト予定');
  await page.$('#btn-genre').then(el => el!.click());
  await page.waitForTimeout(500);
  const genreItems = await page.$$('.sheet-genre-item');
  if (genreItems.length > 0) await genreItems[0].click();
  await page.$('#btn-save').then(el => el!.click());
  await page.waitForTimeout(2000);
  await ss(page, '07-after-create-sheet');
  const afterCreateUrl = page.url();
  console.log('✅ SCR-21 保存後 URL:', afterCreateUrl);
  if (!afterCreateUrl.match(/\/schedule\/\d+$/)) throw new Error('Should open sheet after create');
  const sheetTitleAfterCreate = await page.$eval('#day-sheet-title', el => el.textContent?.trim());
  console.log('✅ 作成後シートタイトル:', sheetTitleAfterCreate);

  // 直接 /schedule/:id アクセス
  const idMatch = afterCreateUrl.match(/\/schedule\/(\d+)$/);
  if (idMatch) {
    const directId = idMatch[1];
    await page.goto(BASE + `/schedule/${directId}`);
    await page.waitForTimeout(2000);
    await ss(page, '08-direct-access');
    console.log('✅ 直接アクセス URL:', page.url());
    const directTitle = await page.$eval('#day-sheet-title', el => el.textContent?.trim());
    console.log('✅ 直接アクセスシートタイトル:', directTitle);
  }

  console.log('\n✅ 全確認完了 screenshots:', SS);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
```

保存先: `/tmp/verify-scr23-sheet.cjs`

Expected 出力例:
```
✅ ログイン
予定カード数: 3
✅ シート transform: matrix(1, 0, 0, 1, 0, 0)  (translateY(0)相当)
✅ URL after tap: http://localhost:5173/schedule/2004
✅ シートタイトル: SCR-22テスト予定
✅ オーバーレイクリックで閉じる URL: http://localhost:5173/day?date=2026-06-20
✅ ブラウザ戻るで閉じる URL: http://localhost:5173/day?date=2026-06-20
✅ 編集遷移 URL: http://localhost:5173/schedule/2004/edit
✅ キャンセル後 URL: http://localhost:5173/day?date=2026-06-20
✅ SCR-21 保存後 URL: http://localhost:5173/schedule/2006
✅ 作成後シートタイトル: シートテスト予定
✅ 直接アクセス URL: http://localhost:5173/schedule/2006
✅ 直接アクセスシートタイトル: シートテスト予定
✅ 全確認完了 screenshots: /tmp/scr23-verify
```

- [ ] **Step 3: スクリーンショットを確認する**

```bash
ls /tmp/scr23-verify/
```

`01-day-page.png` 〜 `08-direct-access.png` が存在すること

- [ ] **Step 4: 問題がなければ最終コミットを確認する**

```bash
git log --oneline -8
```

Expected: Task 1〜4 の commit が順に並んでいること
