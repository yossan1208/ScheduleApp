# SCR-22 予定編集 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/schedule/:id/edit` で既存の予定を編集・削除できる SCR-22 画面を実装する。

**Architecture:** SCR-21（`pages/schedule/new/`）のフォームUIと CSS を流用し、独立した `pages/schedule/edit/` ディレクトリに実装する。マウント時に `GET /api/schedules/:id` で既存値をプリセットし、↻ で `PUT`、🗑 で `DELETE` を呼び出す。

**Tech Stack:** Vite + TypeScript (strict), vanilla DOM, `/api` は ASP.NET Core 10（port 5296）へプロキシ

---

## ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 修正 | `frontend/src/api/schedules.ts` | `UpdateSchedulePayload` 型 + `updateSchedule` メソッド追加 |
| 修正 | `frontend/src/utils/router.ts` | `/schedule/:id/edit` 動的ルート追加 |
| 新規 | `frontend/src/pages/schedule/edit/edit.css` | `new.css` を import + 削除ボタン差分スタイル |
| 新規 | `frontend/src/pages/schedule/edit/index.ts` | SCR-22 ページロジック全体 |
| 修正 | `frontend/src/pages/schedule/detail/index.ts` | ✏️ ボタン → `navigate('/schedule/${id}/edit')` |

---

## Task 1: API 層 — `updateSchedule` 追加

**Files:**
- Modify: `frontend/src/api/schedules.ts`

**Produces:**
- `UpdateSchedulePayload` 型（`CreateSchedulePayload` の型エイリアス）
- `schedules.updateSchedule(id: number, payload: UpdateSchedulePayload): Promise<ApiEnvelope<Schedule>>`

- [ ] **Step 1: `schedules.ts` を以下の内容に書き換える**

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

export type UpdateSchedulePayload = CreateSchedulePayload;

export const schedules = {
  getSchedules: (from: string, to: string) => {
    const params = new URLSearchParams({ from, to });
    return api.get<Schedule[]>(`/schedules?${params}`);
  },
  deleteSchedule:   (id: number) => api.delete<null>(`/schedules/${id}`),
  createSchedule:   (payload: CreateSchedulePayload) =>
    api.post<Schedule>('/schedules', payload),
  getRecentSchedules: () =>
    api.get<Schedule[]>('/schedules/recent'),
  getScheduleById:  (id: number) =>
    api.get<Schedule>(`/schedules/${id}`),
  updateSchedule:   (id: number, payload: UpdateSchedulePayload) =>
    api.put<Schedule>(`/schedules/${id}`, payload),
};
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...` — エラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/api/schedules.ts
git commit -m "feat: add schedules.updateSchedule API method"
```

---

## Task 2: ルーター拡張 — `/schedule/:id/edit` 追加

**Files:**
- Modify: `frontend/src/utils/router.ts`

**Produces:**
- `/schedule/\d+/edit` パターンが `pages/schedule/edit` にルーティングされる

- [ ] **Step 1: `router.ts` の `dynamicRoutes` を以下に書き換える**

`/schedule/:id/edit` パターンは `/schedule/:id` より具体的なので、**必ず先に置く**こと。

```typescript
const dynamicRoutes: Array<{ pattern: RegExp; loader: PageLoader }> = [
  { pattern: /^\/schedule\/\d+\/edit$/, loader: () => import('../pages/schedule/edit') },
  { pattern: /^\/schedule\/\d+$/,       loader: () => import('../pages/schedule/detail') },
];
```

- [ ] **Step 2: ビルド確認**（`pages/schedule/edit` はまだ存在しないのでビルドエラーになる。Task 3・4 で解消する）

```bash
cd frontend && npm run build 2>&1 | head -20
```

Expected: `Could not resolve '../pages/schedule/edit'` のようなエラー → Task 3・4 完了後に再確認

- [ ] **Step 3: コミット**

```bash
git add frontend/src/utils/router.ts
git commit -m "feat: add dynamic route /schedule/:id/edit"
```

---

## Task 3: CSS — `edit.css` 作成

**Files:**
- Create: `frontend/src/pages/schedule/edit/edit.css`

`new.css` をそのまま import し、削除ボタン（`.edit-delete-btn`）のスタイルだけ追加する。

- [ ] **Step 1: ディレクトリ確認**

```bash
ls frontend/src/pages/schedule/
```

Expected: `new/` が存在する

- [ ] **Step 2: `frontend/src/pages/schedule/edit/edit.css` を以下の内容で作成**

```css
@import '../new/new.css';

/* === 削除ボタン（フッター中央） === */
.edit-delete-btn {
  background: none;
  border: 1px solid #644;
  color: #e57373;
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

.edit-delete-btn:hover { background: rgba(229, 115, 115, 0.12); }

.edit-delete-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* === ローディング / エラー（初期フェッチ中） === */
.detail-loading,
.detail-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  font-size: 1rem;
  color: #888;
  background: #1a1a1a;
}
```

---

## Task 4: ページロジック — `edit/index.ts` 作成

**Files:**
- Create: `frontend/src/pages/schedule/edit/index.ts`

**Consumes:**
- `schedules.getScheduleById(id)` — Task 1 で追加
- `schedules.updateSchedule(id, payload)` — Task 1 で追加
- `schedules.deleteSchedule(id)` — 既存
- `genres.getGenres()` — 既存（`api/genres.ts`）
- `navigate(path)` — 既存（`utils/router.ts`）
- `UpdateSchedulePayload` 型 — Task 1 で追加

- [ ] **Step 1: `frontend/src/pages/schedule/edit/index.ts` を以下の内容で作成**

```typescript
import './edit.css';
import { schedules, type UpdateSchedulePayload } from '../../../api/schedules';
import { genres } from '../../../api/genres';
import { navigate } from '../../../utils/router';

let selectedGenreId:    number              = 0;
let selectedGenreName:  string              = '';
let selectedGenreColor: string              = '';
let visibility:         'private' | 'group' = 'group';
let isAllDay:           boolean             = false;
let detailText:         string              = '';
let notificationTime:   string              = '09:00';

void [selectedGenreName, selectedGenreColor];

function openSheet(id: string): void {
  document.getElementById(id)?.classList.add('open');
}

function closeSheet(id: string): void {
  document.getElementById(id)?.classList.remove('open');
}

export function mount(app: HTMLElement): void {
  selectedGenreId    = 0;
  selectedGenreName  = '';
  selectedGenreColor = '';
  visibility         = 'group';
  isAllDay           = false;
  detailText         = '';
  notificationTime   = '09:00';

  // /schedule/123/edit → id = 123
  const parts = location.pathname.split('/');
  const id    = parseInt(parts[parts.length - 2], 10);

  if (!id || isNaN(id)) {
    app.innerHTML = `<div class="detail-error">予定が見つかりません</div>`;
    return;
  }

  app.innerHTML = `<div class="detail-loading">読み込み中…</div>`;

  schedules.getScheduleById(id)
    .then(result => {
      if (!result.success || !result.data) {
        app.innerHTML = `<div class="detail-error">予定が見つかりません</div>`;
        return;
      }

      const s = result.data;

      // モジュール変数を既存データで初期化
      selectedGenreId  = s.genre?.id ?? 0;
      selectedGenreName  = s.genre?.name ?? '';
      selectedGenreColor = s.genre?.colorHex ?? '';
      visibility       = (s.visibility === 'private' ? 'private' : 'group') as 'private' | 'group';
      isAllDay         = s.startTime === null;
      detailText       = s.detail ?? '';
      notificationTime = s.notificationTime.slice(0, 5);

      const dateStr    = s.date.slice(0, 10);
      const startVal   = s.startTime?.slice(0, 5) ?? '09:00';
      const endVal     = s.endTime?.slice(0, 5) ?? '10:00';
      const genreSel   = s.genre ? ' selected' : '';
      const visLabel   = visibility === 'group' ? '👥 グループ' : '🔒 個人';
      const detailFilled = detailText ? ' filled' : '';

      app.innerHTML = `
        <div class="new-page">
          <div class="new-content">

            <input class="new-title" type="text" id="new-title" placeholder="タイトル" />

            <button class="new-genre-btn${genreSel}" id="btn-genre" aria-label="ジャンルを選択">
              <span class="new-genre-dot" id="genre-dot"></span>
              <span class="new-genre-label" id="genre-label"></span>
              <span class="new-genre-arrow">▼</span>
            </button>

            <div class="new-date-block">
              <input type="date" id="event-date" value="${dateStr}" />
            </div>

            <div class="new-time-row" id="time-row"${isAllDay ? ' style="display:none"' : ''}>
              <div class="new-time-block">
                <label for="start-time">開始</label>
                <input type="time" id="start-time" value="${startVal}" />
              </div>
              <div class="new-time-block">
                <label for="end-time">終了</label>
                <input type="time" id="end-time" value="${endVal}" />
              </div>
            </div>

            <div class="new-time-toggle">
              <button class="new-toggle-btn${isAllDay ? '' : ' active'}" id="btn-set-time">Set Time</button>
              <button class="new-toggle-btn${isAllDay ? ' active' : ''}" id="btn-all-day">All Day</button>
            </div>

            <div class="new-row">
              <button class="new-notif-btn" id="btn-notif">🔔 ${notificationTime}</button>
              <button class="new-visibility-btn" id="btn-visibility" aria-label="公開範囲">${visLabel}</button>
            </div>

            <button class="new-detail-btn${detailFilled}" id="btn-detail"></button>

            <div class="new-error hidden" id="new-error"></div>

          </div>

          <div class="new-footer">
            <button class="nav-arrow-btn" id="btn-cancel" aria-label="キャンセル">✕</button>
            <button class="edit-delete-btn" id="btn-delete" aria-label="削除">🗑</button>
            <button class="fab" id="btn-save" aria-label="更新">↻</button>
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
              <input class="sheet-time-input" type="time" id="notif-input" value="${notificationTime}" />
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
        </div>
      `;

      // XSS対策: textContent / value で値を設定
      app.querySelector<HTMLInputElement>('#new-title')!.value = s.title;

      if (s.genre) {
        app.querySelector<HTMLElement>('#genre-dot')!.style.background = s.genre.colorHex;
        app.querySelector<HTMLElement>('#genre-label')!.textContent    = s.genre.name;
      } else {
        app.querySelector<HTMLElement>('#genre-label')!.textContent = 'ジャンルを選択';
      }

      const detailBtn = app.querySelector<HTMLElement>('#btn-detail')!;
      if (detailText) {
        detailBtn.textContent = `📝 ${detailText.slice(0, 30)}${detailText.length > 30 ? '…' : ''}`;
      } else {
        detailBtn.textContent = '📝 詳細メモを追加…';
      }

      // ─── エラー表示ユーティリティ ────────────────────────
      const errorEl = app.querySelector<HTMLElement>('#new-error')!;

      function showError(msg: string): void {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function clearError(): void {
        errorEl.classList.add('hidden');
      }

      // ─── ジャンルシート ───────────────────────────────────
      app.querySelector('#btn-genre')!.addEventListener('click', () => {
        openSheet('overlay-genre');
        const list = app.querySelector<HTMLElement>('#genre-list')!;
        list.innerHTML = '<div style="color:#888;padding:0.5rem 0">読み込み中…</div>';
        genres.getGenres()
          .then(res => {
            list.innerHTML = '';
            if (!res.success || !res.data?.length) {
              list.innerHTML = '<div style="color:#888;padding:0.5rem 0">ジャンルがまだ作成されていません</div>';
              return;
            }
            res.data.forEach(g => {
              const item = document.createElement('div');
              item.className = 'sheet-genre-item';
              const dot  = document.createElement('span');
              dot.className = 'sheet-genre-color';
              dot.style.background = g.colorHex;
              const name = document.createElement('span');
              name.textContent = g.name;
              item.appendChild(dot);
              item.appendChild(name);
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

      // シート外タップで閉じる
      ['overlay-genre', 'overlay-notif', 'overlay-detail'].forEach(overlayId => {
        const overlay = app.querySelector(`#${overlayId}`)!;
        const sheet   = overlay.querySelector('.bottom-sheet')!;
        overlay.addEventListener('click', e => {
          if (!sheet.contains(e.target as Node)) closeSheet(overlayId);
        });
      });

      // ─── Set Time / All Day ──────────────────────────────
      const timeRow    = app.querySelector<HTMLElement>('#time-row')!;
      const btnSetTime = app.querySelector<HTMLElement>('#btn-set-time')!;
      const btnAllDay  = app.querySelector<HTMLElement>('#btn-all-day')!;

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

      // ─── 通知時刻シート ───────────────────────────────────
      const notifInput = app.querySelector<HTMLInputElement>('#notif-input')!;

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
          visibility === 'group' ? '👥 グループ' : '🔒 個人';
      });

      // ─── 詳細メモシート ──────────────────────────────────
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

      // ─── キャンセル ──────────────────────────────────────
      app.querySelector('#btn-cancel')!
        .addEventListener('click', () => history.back());

      // ─── 削除 ────────────────────────────────────────────
      app.querySelector('#btn-delete')!.addEventListener('click', () => {
        if (!window.confirm('この予定を削除しますか？')) return;

        const deleteBtn = app.querySelector<HTMLButtonElement>('#btn-delete')!;
        deleteBtn.disabled = true;
        clearError();

        schedules.deleteSchedule(id)
          .then(delResult => {
            deleteBtn.disabled = false;
            if (!delResult.success) {
              showError(delResult.error?.message ?? '削除に失敗しました');
              return;
            }
            navigate(`/day?date=${s.date.slice(0, 10)}`);
          })
          .catch(() => {
            deleteBtn.disabled = false;
            showError('通信エラーが発生しました');
          });
      });

      // ─── バリデーション + 更新 ────────────────────────────
      const saveBtn = app.querySelector<HTMLButtonElement>('#btn-save')!;

      saveBtn.addEventListener('click', () => {
        clearError();

        const title     = app.querySelector<HTMLInputElement>('#new-title')!.value.trim();
        const eventDate = app.querySelector<HTMLInputElement>('#event-date')!.value;
        const startTime = isAllDay ? null
          : (app.querySelector<HTMLInputElement>('#start-time')!.value || null);
        const endTime   = isAllDay ? null
          : (app.querySelector<HTMLInputElement>('#end-time')!.value || null);

        if (!title)           { showError('タイトルを入力してください'); return; }
        if (!selectedGenreId) { showError('ジャンルを選択してください'); return; }

        const payload: UpdateSchedulePayload = {
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

        schedules.updateSchedule(id, payload)
          .then(upResult => {
            saveBtn.disabled = false;
            if (!upResult.success || !upResult.data) {
              showError(upResult.error?.message ?? '更新に失敗しました');
              return;
            }
            navigate(`/schedule/${id}`);
          })
          .catch(() => {
            saveBtn.disabled = false;
            showError('通信エラーが発生しました');
          });
      });
    })
    .catch(() => {
      app.innerHTML = `<div class="detail-error">取得に失敗しました</div>`;
    });
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...` — 型エラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/pages/schedule/edit/
git commit -m "feat: SCR-22 schedule edit page — prefill, PUT update, DELETE"
```

---

## Task 5: SCR-23 編集ボタン配線

**Files:**
- Modify: `frontend/src/pages/schedule/detail/index.ts`

- [ ] **Step 1: `detail/index.ts` の `navigate` import を追加し、編集ボタンのクリックハンドラーを修正する**

`index.ts` の先頭 import に `navigate` を追加:

```typescript
import './detail.css';
import { schedules } from '../../../api/schedules';
import { navigate } from '../../../utils/router';
```

編集ボタンのクリックハンドラー（現在 `() => {}` の箇所）を変更:

```typescript
      app.querySelector('#btn-edit')!
        .addEventListener('click', () => navigate(`/schedule/${id}/edit`));
```

変更箇所は `index.ts` の末尾付近、`// SCR-22 未実装のため何もしない` のコメントと `() => {}` の行。削除すべき行:
```typescript
      // SCR-22 未実装のため何もしない
      app.querySelector('#btn-edit')!
        .addEventListener('click', () => {});
```

置換後:
```typescript
      app.querySelector('#btn-edit')!
        .addEventListener('click', () => navigate(`/schedule/${id}/edit`));
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...`

- [ ] **Step 3: コミット**

```bash
git add frontend/src/pages/schedule/detail/index.ts
git commit -m "feat: SCR-23 wire edit button to /schedule/:id/edit"
```

---

## Task 6: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: バックエンドと dev サーバーを起動**（起動済みなら不要）

```bash
# ターミナル1
dotnet run --project backend/ScheduleApp.Api

# ターミナル2
cd frontend && npm run dev
```

- [ ] **Step 2: 正常系 — 編集して保存**

1. `http://localhost:5173/` でログイン（admin / Admin1234!）
2. ホームから任意の予定の詳細ページ（SCR-23）を開く
3. ✏️ ボタンをタップ → `/schedule/:id/edit` に遷移することを確認
4. フォームに既存の値が表示されていることを確認（タイトル・ジャンル・日付・時刻・通知・公開範囲）
5. タイトルを変更して ↻ タップ → SCR-23 に戻り、更新後のタイトルが表示されることを確認

- [ ] **Step 3: 正常系 — 削除**

1. SCR-22 を開く
2. 🗑 タップ → `window.confirm` が表示されることを確認
3. OK をタップ → `/day?date=<予定の日付>` に遷移することを確認
4. 日表示に削除した予定が表示されていないことを確認

- [ ] **Step 4: 異常系**

| 確認内容 | 期待 |
|---|---|
| タイトルを空にして ↻ | 「タイトルを入力してください」エラー |
| 🗑 → confirm キャンセル | 画面のまま（遷移しない） |
| ✕ ボタン | `history.back()` で前の画面に戻る |
| All Day トグル → ↻ | `startTime: null, endTime: null` で更新される |
