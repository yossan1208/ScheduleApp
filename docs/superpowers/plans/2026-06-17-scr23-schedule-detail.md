# SCR-23 予定詳細 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 予定詳細画面（SCR-23）を実装する — `/schedule/:id` で `GET /api/schedules/{id}` の結果をジャンル色全画面背景で表示し、戻るボタン・編集ボタン（遷移は後回し）を置く。

**Architecture:** ルーターに動的パターンマッチを追加して `/schedule/\d+` を `pages/schedule/detail` にルーティング。`mount()` が `location.pathname` から id を自分で取得し、API を叩いてレンダリング。ジャンル色の輝度に応じてテキスト色（白/黒）を自動切替する。

**Tech Stack:** Vite + TypeScript (strict), vanilla DOM, `/api` proxied to ASP.NET Core 10 (port 5296)

---

## ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 修正 | `frontend/src/api/schedules.ts` | `getScheduleById(id)` メソッド追加 |
| 修正 | `frontend/src/utils/router.ts` | 動的ルート配列 `dynamicRoutes` 追加、`navigate` でフォールバック検索 |
| 新規作成 | `frontend/src/pages/schedule/detail/detail.css` | SCR-23 全スタイル |
| 新規作成 | `frontend/src/pages/schedule/detail/index.ts` | SCR-23 ページロジック |

---

## Task 1: API 層 — `getScheduleById` 追加

**Files:**
- Modify: `frontend/src/api/schedules.ts`

- [ ] **Step 1: `schedules.ts` の `schedules` オブジェクトに `getScheduleById` を追記**

`getRecentSchedules` の行の後に追記する。追記後の `schedules.ts` 全体:

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
  visibility:       string;        // "private" | "group"
  genreId:          number;
  startTime:        string | null; // "HH:mm"
  endTime:          string | null; // "HH:mm"
  notificationTime: string;        // "HH:mm"
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
  getScheduleById:    (id: number) =>
    api.get<Schedule>(`/schedules/${id}`),
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
git commit -m "feat: add schedules.getScheduleById API method"
```

---

## Task 2: ルーター拡張 — 動的ルート `/schedule/:id` 対応

**Files:**
- Modify: `frontend/src/utils/router.ts`

- [ ] **Step 1: `router.ts` を以下の内容に書き換える**

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
  { pattern: /^\/schedule\/\d+$/, loader: () => import('../pages/schedule/detail') },
];

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
  // popstate (back/forward) は replaceState でコンテンツのみ更新する
  window.addEventListener('popstate', () =>
    navigate(location.pathname + location.search, true),
  );
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...`

- [ ] **Step 3: コミット**

```bash
git add frontend/src/utils/router.ts
git commit -m "feat: add dynamic route support for /schedule/:id"
```

---

## Task 3: CSS — `detail.css` 作成

**Files:**
- Create: `frontend/src/pages/schedule/detail/detail.css`

- [ ] **Step 1: ディレクトリを確認してから `detail.css` を作成**

```bash
ls frontend/src/pages/schedule/
```

Expected: `new/` ディレクトリが存在すること

- [ ] **Step 2: `frontend/src/pages/schedule/detail/detail.css` を以下の内容で作成**

```css
/* === ページ全体 === */
.detail-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  user-select: none;
}

/* === ヘッダー（戻る / 編集ボタン） === */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem 0.5rem;
}

.detail-nav-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  line-height: 1;
  opacity: 0.85;
  transition: opacity 0.15s;
}

.detail-nav-btn:hover { opacity: 1; }

/* === メインコンテンツ === */
.detail-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  gap: 0.75rem;
}

/* === タイトル === */
.detail-title {
  font-size: 2rem;
  font-weight: 600;
  text-align: center;
  margin: 0;
  line-height: 1.25;
  word-break: break-word;
}

/* === 時刻 / 日付 === */
.detail-time {
  font-size: 1.05rem;
  margin: 0;
}

.detail-date {
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

/* === ジャンルバッジ === */
.detail-genre-badge {
  display: inline-block;
  padding: 0.35rem 1.25rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* === セクション（通知・With） === */
.detail-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.detail-icon {
  font-size: 1.2rem;
}

.detail-label {
  font-size: 0.85rem;
}

.detail-info {
  font-size: 0.95rem;
}

/* === With セクション === */
.detail-with-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

/* === 詳細メモ === */
.detail-memo {
  max-width: 90%;
  text-align: center;
  margin-top: 0.5rem;
}

.detail-memo-text {
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  opacity: 0.9;
}

/* === ローディング / エラー === */
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

- [ ] **Step 3: ビルド確認（CSS だけでは型エラーにならないが念のため）**

```bash
cd frontend && npm run build
```

Expected: `✓ built in ...`

---

## Task 4: ページロジック — `detail/index.ts` 作成

**Files:**
- Create: `frontend/src/pages/schedule/detail/index.ts`

- [ ] **Step 1: `frontend/src/pages/schedule/detail/index.ts` を以下の内容で作成**

```typescript
import './detail.css';
import { schedules } from '../../../api/schedules';

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

export function mount(app: HTMLElement): void {
  const parts = location.pathname.split('/');
  const id    = parseInt(parts[parts.length - 1], 10);

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

      const s       = result.data;
      const bgColor = s.genre?.colorHex ?? '#5c9ad6';
      const dark    = isDarkColor(bgColor);
      const text    = dark ? '#ffffff'              : '#1a1a1a';
      const sub     = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)';
      const badge   = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
      const btn     = dark ? 'rgba(255,255,255,0.85)': 'rgba(0,0,0,0.65)';

      const timeStr = s.startTime
        ? `${s.startTime.slice(0, 5)}${s.endTime ? ` - ${s.endTime.slice(0, 5)}` : ''}`
        : '終日';

      const storedId     = parseInt(localStorage.getItem('userId') ?? '0', 10);
      const creatorLabel = s.creatorId === storedId ? '自分' : '他のメンバー';

      const memoBlock = s.detail ? `
        <div class="detail-section detail-memo">
          <p class="detail-memo-text" style="color:${sub}">${s.detail.replace(/\n/g, '<br>')}</p>
        </div>
      ` : '';

      const genreBadge = s.genre ? `
        <span class="detail-genre-badge" style="background:${badge}; color:${text}">
          ${s.genre.name}
        </span>
      ` : '';

      app.innerHTML = `
        <div class="detail-page" style="background:${bgColor}; color:${text}">
          <div class="detail-header">
            <button class="detail-nav-btn" id="btn-back" style="color:${btn}" aria-label="戻る">←</button>
            <button class="detail-nav-btn" id="btn-edit" style="color:${btn}" aria-label="編集">✏️</button>
          </div>

          <div class="detail-body">
            <h1 class="detail-title">${s.title}</h1>
            <p class="detail-time" style="color:${sub}">${timeStr}</p>
            <p class="detail-date" style="color:${sub}">${formatDate(s.date)}</p>

            ${genreBadge}

            <div class="detail-section">
              <span class="detail-icon" style="color:${sub}">🔔</span>
              <span class="detail-info" style="color:${text}">${s.notificationTime.slice(0, 5)}</span>
            </div>

            <div class="detail-section">
              <span class="detail-label" style="color:${sub}">With</span>
              <div class="detail-with-row">
                <div class="detail-avatar" style="background:${badge}; color:${text}">👤</div>
                <span class="detail-info" style="color:${text}">${creatorLabel}</span>
              </div>
            </div>

            ${memoBlock}
          </div>
        </div>
      `;

      app.querySelector('#btn-back')!
        .addEventListener('click', () => history.back());

      // SCR-22 未実装のため何もしない
      app.querySelector('#btn-edit')!
        .addEventListener('click', () => {});
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
git add frontend/src/pages/schedule/detail/
git commit -m "feat: SCR-23 schedule detail page — genre bg, title/time/badge/notification/with"
```

---

## Task 5: ブラウザ動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: バックエンドと dev サーバーを起動**

```bash
# ターミナル1（バックエンド）
dotnet run --project backend/ScheduleApp.Api

# ターミナル2（フロントエンド）
cd frontend && npm run dev
```

- [ ] **Step 2: ログインして予定を1件作成**

1. `http://localhost:5173/` を開く
2. LoginId: `admin` / Password: `Admin1234!` でログイン
3. `/schedule/new` に移動
4. タイトル・ジャンルを選択して ✓ で保存
5. `POST /api/schedules` のレスポンスで `id` が返ることを Network タブで確認

- [ ] **Step 3: SCR-23 の表示確認**

保存成功後に `/schedule/<id>` へ自動遷移するので、以下を確認:

| # | 確認項目 | 期待 |
|---|---|---|
| 1 | ページ背景 | ジャンル色が全画面に表示される |
| 2 | タイトル | 入力したタイトルが中央に大きく表示される |
| 3 | 時刻 | "09:00 - 10:00" の形式（All Day の場合は "終日"）|
| 4 | 日付 | "Sun Jun 17" のような英語形式 |
| 5 | ジャンルバッジ | ジャンル名がpill形状のバッジで表示される |
| 6 | 通知 | 🔔 アイコン + 設定した通知時刻 |
| 7 | With | "👤 自分" と表示される |
| 8 | 戻るボタン | ← を押すと前の画面（SCR-21 → 元画面）に戻る |
| 9 | 編集ボタン | ✏️ を押しても何も起きない（エラーなし） |

- [ ] **Step 4: 直接 URL アクセス確認**

ブラウザのアドレスバーに `http://localhost:5173/schedule/9999` を入力:
- Expected: "予定が見つかりません"（API が 404 を返すため）

`http://localhost:5173/schedule/abc` を入力:
- Expected: "予定が見つかりません"（id が NaN のため）

- [ ] **Step 5: ブラウザの「戻る」ボタン確認**

SCR-23 を表示した状態でブラウザの戻るボタン（popstate）を押す:
- Expected: 前の画面（SCR-21 の後に遷移した場合はホームなど）に戻る

---

## 完成チェックリスト（受入条件）

| # | 受入条件 | タスク |
|---|---|---|
| 1 | `/schedule/:id` の動的ルートが機能する | Task 2 |
| 2 | `GET /api/schedules/{id}` でデータ取得 | Task 1 + 4 |
| 3 | ジャンル色が全画面背景 | Task 4 |
| 4 | 輝度に応じてテキスト色が白/黒に切替 | Task 4 |
| 5 | タイトル・時刻・日付・ジャンルバッジ | Task 3 + 4 |
| 6 | 通知アイコン + 時刻 | Task 4 |
| 7 | Withセクション（自分/他のメンバー） | Task 4 |
| 8 | 詳細メモが設定されていれば表示 | Task 4 |
| 9 | 戻るボタンで `history.back()` | Task 4 |
| 10 | 編集ボタンあり（SCR-22 遷移は後回し） | Task 4 |
| 11 | 削除ボタンなし | — |
| 12 | ローディング中は「読み込み中…」表示 | Task 4 |
| 13 | 取得失敗・不正 id はエラー表示 | Task 4 |
