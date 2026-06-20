# SCR-21 予定新規作成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 予定新規作成フォーム（SCR-21）を実装する — タイトル・ジャンル・日時・通知・公開範囲・詳細を入力し `POST /api/schedules` で登録する。

**Architecture:** `/schedule/new` ルートを追加した Vanilla TypeScript SPA ページ。4 つのボトムシート（ジャンル選択・通知時刻・詳細メモ・履歴）を `app.innerHTML` に埋め込み、CSS transition でスライドイン/アウトする。フッターは `flex-shrink: 0` で固定、コンテンツエリア（`.new-content`）のみ `overflow-y: auto` でスクロール可。

**Tech Stack:** Vite + TypeScript (strict), vanilla DOM, `/api` proxied to ASP.NET Core 10 (port 5296)

---

## ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 新規作成 | `frontend/src/api/genres.ts` | `Genre` 型 + `genres.getGenres()` |
| 修正 | `frontend/src/api/schedules.ts` | `CreateSchedulePayload` 型 + `createSchedule` + `getRecentSchedules` 追加 |
| 修正 | `frontend/src/utils/router.ts` | `/schedule/new` ルート追加 |
| 新規作成 | `frontend/src/pages/schedule/new/new.css` | SCR-21 全スタイル |
| 新規作成 | `frontend/src/pages/schedule/new/index.ts` | SCR-21 ページロジック・4 ボトムシート |

---

## Task 1: API 層 + ルーター追加

**Files:**
- Create: `frontend/src/api/genres.ts`
- Modify: `frontend/src/api/schedules.ts`
- Modify: `frontend/src/utils/router.ts`

- [ ] **Step 1: `frontend/src/api/genres.ts` を新規作成**

```typescript
import { api } from './client';

export interface Genre {
  id:       number;
  name:     string;
  colorHex: string;
}

export const genres = {
  getGenres: () => api.get<Genre[]>('/genres'),
};
```

- [ ] **Step 2: `frontend/src/api/schedules.ts` に型とメソッドを追加**

既存コードはそのまま残し、末尾に追記する。

```typescript
// ─── 追加: 予定作成ペイロード ──────────────────────────
export interface CreateSchedulePayload {
  date:             string;
  title:            string;
  visibility:       string;        // "private" | "group"
  genreId:          number;
  startTime:        string | null; // "HH:mm"
  endTime:          string | null; // "HH:mm"
  notificationTime: string;        // "HH:mm"
  detail:           string | null;
}
```

`schedules` オブジェクトに 2 メソッドを追加する（`deleteSchedule` の次の行に追記）:

```typescript
  createSchedule:     (payload: CreateSchedulePayload) =>
    api.post<Schedule>('/schedules', payload),

  getRecentSchedules: () =>
    api.get<Schedule[]>('/schedules/recent'),
```

追記後の `schedules.ts` 全体は以下:

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

export interface CreateSchedulePayload {
  date:             string;
  title:            string;
  visibility:       string;
  genreId:          number;
  startTime:        string | null;
  endTime:          string | null;
  notificationTime: string;
  detail:           string | null;
}

export const schedules = {
  getSchedules: (from: string, to: string) => {
    const params = new URLSearchParams({ from, to });
    return api.get<Schedule[]>(`/schedules?${params}`);
  },
  deleteSchedule:     (id: number) => api.delete<null>(`/schedules/${id}`),
  createSchedule:     (payload: CreateSchedulePayload) =>
    api.post<Schedule>('/schedules', payload),
  getRecentSchedules: () =>
    api.get<Schedule[]>('/schedules/recent'),
};
```

- [ ] **Step 3: `frontend/src/utils/router.ts` に `/schedule/new` ルートを追加**

```typescript
const routes: Record<string, PageLoader> = {
  '/': () => import('../pages/login'),
  '/home': () => import('../pages/home'),
  '/day': () => import('../pages/day'),
  '/week': () => import('../pages/week'),
  '/year': () => import('../pages/year'),
  '/schedule/new': () => import('../pages/schedule/new'),
};
```

- [ ] **Step 4: ビルドが通ることを確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...` — エラーなし

- [ ] **Step 5: コミット**

```bash
git add frontend/src/api/genres.ts frontend/src/api/schedules.ts frontend/src/utils/router.ts
git commit -m "feat: add genres API client, schedule create/recent methods, /schedule/new route"
```

---

## Task 2: CSS + ページスキャフォールド

**Files:**
- Create: `frontend/src/pages/schedule/new/new.css`
- Create: `frontend/src/pages/schedule/new/index.ts`

- [ ] **Step 1: `frontend/src/pages/schedule/new/new.css` を作成**

```css
/* === ページレイアウト === */
.new-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: #1a1a1a;
  color: #e0e0e0;
  user-select: none;
}

/* === コンテンツ（スクロール可） === */
.new-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* === タイトル入力 === */
.new-title {
  width: 100%;
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 1.1rem;
  padding: 0.75rem 1rem;
  outline: none;
  font-family: inherit;
}

.new-title::placeholder { color: #555; }

.new-title:focus { border-color: var(--theme-color, #5c9ad6); }

/* === ジャンルボタン === */
.new-genre-btn {
  width: 100%;
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 0.95rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-align: left;
}

.new-genre-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #555;
  flex-shrink: 0;
}

.new-genre-label {
  flex: 1;
  color: #888;
}

.new-genre-btn.selected .new-genre-label { color: #e0e0e0; }

.new-genre-arrow { color: #555; font-size: 0.7rem; }

/* === 日付 === */
.new-date-block {
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 0.6rem 1rem;
}

.new-date-block input[type="date"] {
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
  color-scheme: dark;
  font-family: inherit;
}

/* === 時刻行 === */
.new-time-row {
  display: flex;
  gap: 0.5rem;
}

.new-time-block {
  flex: 1;
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 0.4rem 0.75rem 0.5rem;
}

.new-time-block label {
  display: block;
  font-size: 0.65rem;
  color: #888;
  margin-bottom: 0.15rem;
}

.new-time-block input[type="time"] {
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 0.9rem;
  outline: none;
  width: 100%;
  color-scheme: dark;
  font-family: inherit;
}

/* === Set Time / All Day トグル === */
.new-time-toggle {
  display: flex;
  gap: 0.5rem;
}

.new-toggle-btn {
  flex: 1;
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #888;
  font-size: 0.8rem;
  padding: 0.35rem 0;
  cursor: pointer;
  transition: all 0.15s;
}

.new-toggle-btn.active {
  background: var(--theme-color, #5c9ad6);
  border-color: var(--theme-color, #5c9ad6);
  color: #fff;
}

/* === 通知 + visibility 行 === */
.new-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.new-notif-btn {
  flex: 1;
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 0.9rem;
  padding: 0.65rem 1rem;
  cursor: pointer;
  text-align: left;
}

.new-visibility-btn {
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* === 詳細ボタン === */
.new-detail-btn {
  width: 100%;
  background: #262626;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #888;
  font-size: 0.9rem;
  padding: 0.65rem 1rem;
  cursor: pointer;
  text-align: left;
}

.new-detail-btn.filled { color: #e0e0e0; }

/* === エラー表示 === */
.new-error {
  color: #e57373;
  font-size: 0.85rem;
  padding: 0 0.25rem;
}

.new-error.hidden { display: none; }

/* === フッター（固定） === */
.new-footer {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.75rem 1.5rem 1.5rem;
  flex-shrink: 0;
}

.new-history-btn {
  background: none;
  border: 1px solid #444;
  color: #e0e0e0;
  border-radius: 50%;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.new-history-btn:hover { background: rgba(255, 255, 255, 0.08); }

/* === ボトムシート共通 === */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.sheet-overlay.open {
  opacity: 1;
  pointer-events: all;
}

.bottom-sheet {
  width: 100%;
  background: #262626;
  border-radius: 12px 12px 0 0;
  padding: 1.25rem 1.25rem 2rem;
  transform: translateY(100%);
  transition: transform 0.25s ease;
  max-height: 70vh;
  overflow-y: auto;
}

.sheet-overlay.open .bottom-sheet { transform: translateY(0); }

.sheet-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #3a3a3a;
}

/* === ジャンル一覧 === */
.sheet-genre-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  cursor: pointer;
  border-bottom: 1px solid #2a2a2a;
  font-size: 0.95rem;
}

.sheet-genre-item:last-child { border-bottom: none; }

.sheet-genre-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* === 履歴一覧 === */
.sheet-history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  cursor: pointer;
  border-bottom: 1px solid #2a2a2a;
}

.sheet-history-item:last-child { border-bottom: none; }

.sheet-history-bar {
  width: 4px;
  height: 2.5rem;
  border-radius: 2px;
  flex-shrink: 0;
}

.sheet-history-body { flex: 1; min-width: 0; }

.sheet-history-title {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sheet-history-date {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.15rem;
}

/* === 通知時刻入力 === */
.sheet-time-input {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 1.5rem;
  text-align: center;
  padding: 0.75rem;
  outline: none;
  color-scheme: dark;
  font-family: inherit;
  margin-bottom: 1rem;
}

/* === 詳細テキストエリア === */
.sheet-textarea {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 0.95rem;
  padding: 0.75rem;
  outline: none;
  resize: none;
  height: 10rem;
  margin-bottom: 1rem;
  font-family: inherit;
}

/* === シート確定ボタン === */
.sheet-confirm-btn {
  width: 100%;
  background: var(--theme-color, #5c9ad6);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.75rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.sheet-confirm-btn:hover { opacity: 0.85; }
```

- [ ] **Step 2: `frontend/src/pages/schedule/new/index.ts` を作成（スキャフォールドのみ）**

このステップでは HTML レンダリングと × ボタンのみ実装する。

```typescript
import './new.css';
import { navigate } from '../../../utils/router';

// ─── モジュール状態（mount ごとにリセット） ────────────
let selectedGenreId:    number              = 0;
let selectedGenreName:  string              = '';
let selectedGenreColor: string              = '';
let visibility:         'private' | 'group' = 'group';
let isAllDay:           boolean             = false;
let detailText:         string              = '';
let notificationTime:   string              = '09:00';

// ─── ユーティリティ ────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function openSheet(id: string): void {
  document.getElementById(id)?.classList.add('open');
}

function closeSheet(id: string): void {
  document.getElementById(id)?.classList.remove('open');
}

// ─── マウント ──────────────────────────────────────────
export function mount(app: HTMLElement): void {
  selectedGenreId    = 0;
  selectedGenreName  = '';
  selectedGenreColor = '';
  visibility         = 'group';
  isAllDay           = false;
  detailText         = '';
  notificationTime   = '09:00';

  const dateParam = new URLSearchParams(location.search).get('date') ?? todayStr();

  app.innerHTML = `
    <div class="new-page">
      <div class="new-content">

        <input class="new-title" type="text" id="new-title" placeholder="タイトル" />

        <button class="new-genre-btn" id="btn-genre" aria-label="ジャンルを選択">
          <span class="new-genre-dot" id="genre-dot"></span>
          <span class="new-genre-label" id="genre-label">ジャンルを選択</span>
          <span class="new-genre-arrow">▼</span>
        </button>

        <div class="new-date-block">
          <input type="date" id="event-date" value="${dateParam}" />
        </div>

        <div class="new-time-row" id="time-row">
          <div class="new-time-block">
            <label for="start-time">開始</label>
            <input type="time" id="start-time" value="09:00" />
          </div>
          <div class="new-time-block">
            <label for="end-time">終了</label>
            <input type="time" id="end-time" value="10:00" />
          </div>
        </div>

        <div class="new-time-toggle">
          <button class="new-toggle-btn active" id="btn-set-time">Set Time</button>
          <button class="new-toggle-btn" id="btn-all-day">All Day</button>
        </div>

        <div class="new-row">
          <button class="new-notif-btn" id="btn-notif">🔔 09:00</button>
          <button class="new-visibility-btn" id="btn-visibility" aria-label="公開範囲">👥</button>
        </div>

        <button class="new-detail-btn" id="btn-detail">📝 詳細メモを追加…</button>

        <div class="new-error hidden" id="new-error"></div>

      </div>

      <div class="new-footer">
        <button class="nav-arrow-btn" id="btn-cancel" aria-label="キャンセル">✕</button>
        <button class="new-history-btn" id="btn-history" aria-label="履歴">↺</button>
        <button class="fab" id="btn-save" aria-label="保存">✓</button>
      </div>

      <!-- ジャンル選択シート -->
      <div class="sheet-overlay" id="overlay-genre">
        <div class="bottom-sheet">
          <div class="sheet-title">ジャンルを選択</div>
          <div id="genre-list"></div>
        </div>
      </div>

      <!-- 通知時刻シート -->
      <div class="sheet-overlay" id="overlay-notif">
        <div class="bottom-sheet">
          <div class="sheet-title">通知時刻を設定</div>
          <input class="sheet-time-input" type="time" id="notif-input" value="09:00" />
          <button class="sheet-confirm-btn" id="btn-notif-confirm">決定</button>
        </div>
      </div>

      <!-- 詳細メモシート -->
      <div class="sheet-overlay" id="overlay-detail">
        <div class="bottom-sheet">
          <div class="sheet-title">詳細メモ</div>
          <textarea class="sheet-textarea" id="detail-textarea" placeholder="詳細を入力（任意）"></textarea>
          <button class="sheet-confirm-btn" id="btn-detail-confirm">完了</button>
        </div>
      </div>

      <!-- 履歴シート -->
      <div class="sheet-overlay" id="overlay-history">
        <div class="bottom-sheet">
          <div class="sheet-title">最近の予定</div>
          <div id="history-list"></div>
        </div>
      </div>
    </div>
  `;

  // シート外タップで閉じる
  ['overlay-genre', 'overlay-notif', 'overlay-detail', 'overlay-history'].forEach(overlayId => {
    const overlay = app.querySelector(`#${overlayId}`)!;
    const sheet   = overlay.querySelector('.bottom-sheet')!;
    overlay.addEventListener('click', e => {
      if (!sheet.contains(e.target as Node)) closeSheet(overlayId);
    });
  });

  // キャンセル
  app.querySelector('#btn-cancel')!
    .addEventListener('click', () => history.back());
}
```

- [ ] **Step 3: ビルドが通ることを確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...`

- [ ] **Step 4: ブラウザで動作確認**

Dev サーバーが起動済みであれば `http://localhost:5173/schedule/new` にアクセス。  
フォームが表示され、✕ ボタンで前の画面に戻ることを確認。

- [ ] **Step 5: コミット**

```bash
git add frontend/src/pages/schedule/new/
git commit -m "feat: SCR-21 page scaffold — layout, 4 bottom sheets HTML, cancel button"
```

---

## Task 3: ジャンル選択シート

**Files:**
- Modify: `frontend/src/pages/schedule/new/index.ts`

- [ ] **Step 1: `frontend/src/pages/schedule/new/index.ts` のファイル先頭 import に追記し、`mount()` 内のコメント `// キャンセル` の前に以下を追記**

ファイル先頭に追加:
```typescript
import { genres } from '../../../api/genres';
```

`mount()` 内のキャンセルハンドラの前に追加:
```typescript
  // ─── ジャンルシート ───────────────────────────────────
  app.querySelector('#btn-genre')!.addEventListener('click', () => {
    openSheet('overlay-genre');
    const list = app.querySelector<HTMLElement>('#genre-list')!;
    list.innerHTML = '<div style="color:#888;padding:0.5rem 0">読み込み中…</div>';
    genres.getGenres()
      .then(result => {
        list.innerHTML = '';
        if (!result.success || !result.data?.length) {
          list.innerHTML = '<div style="color:#888;padding:0.5rem 0">ジャンルがまだ作成されていません</div>';
          return;
        }
        result.data.forEach(g => {
          const item = document.createElement('div');
          item.className = 'sheet-genre-item';
          item.innerHTML = `
            <span class="sheet-genre-color" style="background:${g.colorHex}"></span>
            <span>${g.name}</span>
          `;
          item.addEventListener('click', () => {
            selectedGenreId    = g.id;
            selectedGenreName  = g.name;
            selectedGenreColor = g.colorHex;
            app.querySelector<HTMLElement>('#genre-dot')!.style.background = g.colorHex;
            app.querySelector<HTMLElement>('#genre-label')!.textContent    = g.name;
            app.querySelector<HTMLElement>('#btn-genre')!.classList.add('selected');
            closeSheet('overlay-genre');
          });
          list.appendChild(item);
        });
      })
      .catch(() => {
        list.innerHTML = '<div style="color:#888;padding:0.5rem 0">取得に失敗しました</div>';
      });
  });
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: ブラウザ確認**

ジャンルボタンをタップ → シートが下から出現 → ジャンルをタップ → ボタンが色付きで更新 → シートが閉じる。シート外タップでキャンセルされることを確認。

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/schedule/new/index.ts
git commit -m "feat: SCR-21 genre selection bottom sheet"
```

---

## Task 4: 日付 + Set Time / All Day トグル

**Files:**
- Modify: `frontend/src/pages/schedule/new/index.ts`

- [ ] **Step 1: `mount()` 内のジャンルシートハンドラの後に追記**

```typescript
  // ─── Set Time / All Day トグル ────────────────────────
  const timeRow   = app.querySelector<HTMLElement>('#time-row')!;
  const btnSetTime = app.querySelector('#btn-set-time')!;
  const btnAllDay  = app.querySelector('#btn-all-day')!;

  btnSetTime.addEventListener('click', () => {
    isAllDay = false;
    btnSetTime.classList.add('active');
    btnAllDay.classList.remove('active');
    timeRow.style.display = '';
  });

  btnAllDay.addEventListener('click', () => {
    isAllDay = true;
    btnAllDay.classList.add('active');
    btnSetTime.classList.remove('active');
    timeRow.style.display = 'none';
  });
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: ブラウザ確認**

「All Day」をタップ → 時刻行が消える。「Set Time」をタップ → 時刻行が再表示。  
日付欄に URL の `?date=` 値（例: `2026-06-16`）が正しく入力されていることを確認。

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/schedule/new/index.ts
git commit -m "feat: SCR-21 Set Time / All Day toggle"
```

---

## Task 5: 通知時刻シート + Visibility トグル

**Files:**
- Modify: `frontend/src/pages/schedule/new/index.ts`

- [ ] **Step 1: Set Time / All Day の後に追記**

```typescript
  // ─── 通知時刻シート ───────────────────────────────────
  const notifInput = app.querySelector<HTMLInputElement>('#notif-input')!;
  notifInput.value = notificationTime;

  app.querySelector('#btn-notif')!.addEventListener('click', () => {
    notifInput.value = notificationTime;
    openSheet('overlay-notif');
    setTimeout(() => notifInput.focus(), 260);
  });

  app.querySelector('#btn-notif-confirm')!.addEventListener('click', () => {
    if (notifInput.value) {
      notificationTime = notifInput.value;
      app.querySelector('#btn-notif')!.textContent = `🔔 ${notificationTime}`;
    }
    closeSheet('overlay-notif');
  });

  // ─── Visibility トグル ───────────────────────────────
  app.querySelector('#btn-visibility')!.addEventListener('click', () => {
    visibility = visibility === 'group' ? 'private' : 'group';
    (app.querySelector('#btn-visibility') as HTMLElement).textContent =
      visibility === 'group' ? '👥' : '🔒';
  });
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: ブラウザ確認**

🔔 ボタンをタップ → シートが開き `input[type=time]` にフォーカスされる → 時刻を変更 → 「決定」をタップ → ボタン表示が更新される。  
👥 ボタンをタップするたびに 👥 → 🔒 → 👥 と切り替わることを確認。

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/schedule/new/index.ts
git commit -m "feat: SCR-21 notification time sheet + visibility toggle"
```

---

## Task 6: 詳細メモシート + 履歴シート

**Files:**
- Modify: `frontend/src/pages/schedule/new/index.ts`

- [ ] **Step 1: ファイル先頭 import に追記し、visibility トグルの後に追記**

ファイル先頭に追加:
```typescript
import { schedules } from '../../../api/schedules';
```

`mount()` 内に追加:
```typescript
  // ─── 詳細メモシート ───────────────────────────────────
  const detailTextarea = app.querySelector<HTMLTextAreaElement>('#detail-textarea')!;

  app.querySelector('#btn-detail')!.addEventListener('click', () => {
    detailTextarea.value = detailText;
    openSheet('overlay-detail');
    setTimeout(() => detailTextarea.focus(), 260);
  });

  app.querySelector('#btn-detail-confirm')!.addEventListener('click', () => {
    detailText = detailTextarea.value.trim();
    const btn = app.querySelector<HTMLElement>('#btn-detail')!;
    if (detailText) {
      btn.textContent = `📝 ${detailText.slice(0, 30)}${detailText.length > 30 ? '…' : ''}`;
      btn.classList.add('filled');
    } else {
      btn.textContent = '📝 詳細メモを追加…';
      btn.classList.remove('filled');
    }
    closeSheet('overlay-detail');
  });

  // ─── 履歴シート ───────────────────────────────────────
  app.querySelector('#btn-history')!.addEventListener('click', () => {
    openSheet('overlay-history');
    const list = app.querySelector<HTMLElement>('#history-list')!;
    list.innerHTML = '<div style="color:#888;padding:0.5rem 0">読み込み中…</div>';

    schedules.getRecentSchedules()
      .then(result => {
        list.innerHTML = '';
        if (!result.success || !result.data?.length) {
          list.innerHTML = '<div style="color:#888;padding:0.5rem 0">履歴がありません</div>';
          return;
        }
        result.data.forEach(s => {
          const item = document.createElement('div');
          item.className = 'sheet-history-item';
          const color   = s.genre?.colorHex ?? '#555';
          const timeStr = s.startTime ? ` ${s.startTime.slice(0, 5)}` : '';
          item.innerHTML = `
            <div class="sheet-history-bar" style="background:${color}"></div>
            <div class="sheet-history-body">
              <div class="sheet-history-title">${s.title}</div>
              <div class="sheet-history-date">${s.date}${timeStr}</div>
            </div>
          `;
          item.addEventListener('click', () => {
            // タイトル反映
            (app.querySelector<HTMLInputElement>('#new-title'))!.value = s.title;
            // ジャンル反映
            if (s.genre) {
              selectedGenreId    = s.genre.id;
              selectedGenreName  = s.genre.name;
              selectedGenreColor = s.genre.colorHex;
              app.querySelector<HTMLElement>('#genre-dot')!.style.background   = s.genre.colorHex;
              app.querySelector<HTMLElement>('#genre-label')!.textContent       = s.genre.name;
              app.querySelector<HTMLElement>('#btn-genre')!.classList.add('selected');
            }
            // 時刻反映（日付は反映しない）
            if (s.startTime) {
              (app.querySelector<HTMLInputElement>('#start-time'))!.value = s.startTime.slice(0, 5);
              // isAllDay の場合も時刻を保持しておく（表示だけ非表示）
              if (isAllDay) {
                isAllDay = false;
                app.querySelector('#btn-all-day')!.classList.remove('active');
                app.querySelector('#btn-set-time')!.classList.add('active');
                timeRow.style.display = '';
              }
            }
            if (s.endTime) {
              (app.querySelector<HTMLInputElement>('#end-time'))!.value = s.endTime.slice(0, 5);
            }
            // 通知時刻反映
            if (s.notificationTime) {
              notificationTime = s.notificationTime.slice(0, 5);
              app.querySelector('#btn-notif')!.textContent = `🔔 ${notificationTime}`;
            }
            closeSheet('overlay-history');
          });
          list.appendChild(item);
        });
      })
      .catch(() => {
        list.innerHTML = '<div style="color:#888;padding:0.5rem 0">取得に失敗しました</div>';
      });
  });
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: ブラウザ確認**

📝 ボタンをタップ → テキストエリアが開く → 入力 → 「完了」→ ボタンにプレビューが表示される。  
↺ ボタンをタップ → 履歴シートが開く（履歴がない場合は「履歴がありません」）。  
履歴行をタップ → タイトル・ジャンル・時刻・通知がフォームに反映される。

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/schedule/new/index.ts
git commit -m "feat: SCR-21 detail memo sheet + history sheet"
```

---

## Task 7: フォームバリデーション + 送信

**Files:**
- Modify: `frontend/src/pages/schedule/new/index.ts`

- [ ] **Step 1: ファイル先頭の `schedules` import を `CreateSchedulePayload` も含める形に更新し、`mount()` の末尾に追記**

ファイル先頭の `schedules` import を更新（Task 6 で追加済みの行を置き換え）:
```typescript
import { schedules, type CreateSchedulePayload } from '../../../api/schedules';
```

`mount()` 内に追加:
```typescript
  // ─── バリデーション + 保存 ────────────────────────────
  const errorEl  = app.querySelector<HTMLElement>('#new-error')!;
  const saveBtn  = app.querySelector<HTMLButtonElement>('#btn-save')!;

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearError(): void {
    errorEl.classList.add('hidden');
  }

  saveBtn.addEventListener('click', () => {
    clearError();

    const title     = (app.querySelector<HTMLInputElement>('#new-title'))!.value.trim();
    const eventDate = (app.querySelector<HTMLInputElement>('#event-date'))!.value;
    const startTime = isAllDay ? null
      : ((app.querySelector<HTMLInputElement>('#start-time'))!.value || null);
    const endTime   = isAllDay ? null
      : ((app.querySelector<HTMLInputElement>('#end-time'))!.value || null);

    if (!title)          { showError('タイトルを入力してください'); return; }
    if (!selectedGenreId) { showError('ジャンルを選択してください'); return; }

    const payload: CreateSchedulePayload = {
      date:            eventDate,
      title,
      visibility,
      genreId:         selectedGenreId,
      startTime,
      endTime,
      notificationTime,
      detail:          detailText || null,
    };

    saveBtn.disabled = true;

    schedules.createSchedule(payload)
      .then(result => {
        saveBtn.disabled = false;
        if (!result.success || !result.data) {
          showError(result.error?.message ?? '保存に失敗しました');
          return;
        }
        navigate(`/schedule/${result.data.id}`);
      })
      .catch(() => {
        saveBtn.disabled = false;
        showError('通信エラーが発生しました');
      });
  });
```

- [ ] **Step 2: `ApiEnvelope` の `error` 型が `result.error?.message` を持つか確認**

`frontend/src/types/api.ts` を確認する。

```bash
cat frontend/src/types/api.ts
```

もし `ApiEnvelope` が `error?: { code: string; message: string }` を持っていれば OK。  
なければ `result.error?.message` を `'保存に失敗しました'` のみに変更する。

- [ ] **Step 3: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...` — 型エラーなし

- [ ] **Step 4: ブラウザで全フロー確認**

**ケース A — バリデーションエラー:**
1. タイトル未入力 + ✓ → 「タイトルを入力してください」が表示される
2. タイトル入力・ジャンル未選択 + ✓ → 「ジャンルを選択してください」が表示される

**ケース B — 正常保存:**
1. タイトル入力 + ジャンル選択 + ✓ → `POST /api/schedules` が呼ばれ、  
   成功時は `/schedule/<id>` へ遷移（現状「画面が見つかりません」表示 — SCR-23 実装後に解消）

Network タブで `POST /api/schedules` のリクエスト・レスポンスを確認。

- [ ] **Step 5: コミット**

```bash
git add frontend/src/pages/schedule/new/index.ts
git commit -m "feat: SCR-21 form validation + POST /api/schedules submit"
```

---

## 完成チェックリスト（仕様書 §3 受入条件対応）

| # | 受入条件 | タスク |
|---|---|---|
| 1 | `/schedule/new?date=2026-06-15` でページが表示される | Task 2 |
| 2 | `?date=` が日付デフォルトになる | Task 2 |
| 3 | コンパクトレイアウト（スクロールなし） | Task 2 CSS |
| 4 | フッター固定 | Task 2 CSS |
| 5 | ジャンルシートが開く | Task 3 |
| 6 | ジャンル選択でボタン更新 | Task 3 |
| 7 | 通知時刻シート（`input[type=time]`） | Task 5 |
| 8 | 詳細シートが開く | Task 6 |
| 9 | Set Time / All Day トグル | Task 4 |
| 10 | Visibility トグル | Task 5 |
| 11 | 履歴シートが開く | Task 6 |
| 12 | 履歴選択でフォーム反映 | Task 6 |
| 13 | ✓ → POST + navigate | Task 7 |
| 14 | エラー表示 | Task 7 |
| 15 | × → history.back() | Task 2 |
