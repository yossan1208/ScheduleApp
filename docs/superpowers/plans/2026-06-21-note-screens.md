# Note Screens (SCR-30〜33) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** フロントエンドにノート機能（SCR-30〜33）を実装する。ノート一覧、メモ一覧、メモ編集（ブロックエディタ）、アーカイブの4画面。

**Architecture:** vanilla TypeScript SPA。既存の `api/client.ts` → `api/notes.ts` → page modules の3層構成。ルーティングは `utils/router.ts` に static/dynamic routes を追加。各画面は `pages/notes/` 以下に独立ファイルで実装。

**Tech Stack:** TypeScript, Vite, vanilla DOM, 既存 `api/client.ts` の `api` helper

## Global Constraints

- フレームワーク不使用（vanilla TS のみ）
- すべてのページは `export function mount(app: HTMLElement): void` を公開する
- API ベースURL は `/api`（`api.get('/notes')` → `GET /api/notes`）
- `--theme-color` CSS変数は `document.documentElement.style` に設定済み（ログイン時）
- `localStorage.currentUserId` にログインユーザーID が入っている
- `localStorage.role` にログインユーザーの role（0=管理者, 1=GL, 2=一般）が入っている（Task 1 で追加）
- ソフトデリート: ノートは `PATCH .../archive` → `DELETE`（アーカイブ済みのみ削除可）
- is_system=true のノートは作成・削除・アーカイブ不可。編集のみ可
- is_important=true のメモは削除不可
- メモのタイトルはバックエンドで最初のブロックの content から自動生成（フロントはタイトル入力欄なし）
- チェックボックスの checked 状態は content の先頭文字で管理: `"1:テキスト"` = checked, `"0:テキスト"` = unchecked

---

## File Map

| ファイル | 役割 | 作成/変更 |
|---|---|---|
| `frontend/src/api/client.ts` | `patch` メソッド追加 | 変更 |
| `frontend/src/pages/login/index.ts` | `role` を localStorage に保存 | 変更 |
| `frontend/src/api/notes.ts` | ノート/メモ API helper と型定義 | 新規 |
| `frontend/src/utils/router.ts` | ノート系ルート追加 | 変更 |
| `frontend/src/pages/notes/index.ts` | SCR-30: ノート一覧 | 新規 |
| `frontend/src/pages/notes/notes.css` | SCR-30 スタイル | 新規 |
| `frontend/src/pages/notes/form/index.ts` | ノート作成/編集フォーム（/notes/new と /notes/:id/edit で共用） | 新規 |
| `frontend/src/pages/notes/form/form.css` | フォームスタイル | 新規 |
| `frontend/src/pages/notes/archive/index.ts` | SCR-33: アーカイブ一覧 | 新規 |
| `frontend/src/pages/notes/archive/archive.css` | SCR-33 スタイル | 新規 |
| `frontend/src/pages/notes/memos/index.ts` | SCR-31: メモ一覧 | 新規 |
| `frontend/src/pages/notes/memos/memos.css` | SCR-31 スタイル | 新規 |
| `frontend/src/pages/notes/memos/edit/index.ts` | SCR-32: メモ編集（ブロックエディタ） | 新規 |
| `frontend/src/pages/notes/memos/edit/edit.css` | SCR-32 スタイル | 新規 |

---

## Task 1: API 基盤（client + login + notes.ts）

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/pages/login/index.ts`
- Create: `frontend/src/api/notes.ts`

**Interfaces:**
- Produces:
  - `NoteItem`, `MemoListItem`, `MemoDetail`, `MemoBlock` 型
  - `notes.getAll(archived?)`, `notes.create(payload)`, `notes.update(id, payload)`, `notes.archive(id)`, `notes.delete(id)`
  - `memos.getByNote(noteId)`, `memos.create(noteId)`, `memos.getDetail(id)`, `memos.save(id, payload)`, `memos.delete(id)`

- [ ] **Step 1: `client.ts` に `patch` を追加する**

`frontend/src/api/client.ts` を以下に変更:

```typescript
import type { ApiEnvelope } from '../types/api';

const BASE_URL = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return res.json() as Promise<ApiEnvelope<T>>;
}

export const api = {
  get:    <T>(path: string)                    => request<T>(path),
  post:   <T>(path: string, body: unknown)     => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)     => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string)                    => request<T>(path, { method: 'PATCH' }),
  delete: <T>(path: string)                    => request<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Step 2: `login/index.ts` で `role` を localStorage に保存する**

`frontend/src/pages/login/index.ts` の以下の箇所を変更:

```typescript
// 変更前
localStorage.setItem('currentUserId', String(result.data.userId));

// 変更後
localStorage.setItem('currentUserId', String(result.data.userId));
localStorage.setItem('role', String(result.data.role));
```

- [ ] **Step 3: `frontend/src/api/notes.ts` を作成する**

```typescript
import { api } from './client';

export interface NoteItem {
  id: number;
  name: string;
  color: string;
  groupId: number;
  creatorId: number;
  createdAt: string;
  isArchived: boolean;
  isSystem: boolean;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface MemoListItem {
  id: number;
  title: string | null;
  isImportant: boolean;
  updatedAt: string | null;
}

export interface MemoBlock {
  id: number;
  type: string;
  content: string | null;
  sortOrder: number;
}

export interface MemoDetail {
  id: number;
  title: string | null;
  isImportant: boolean;
  updatedBy: number | null;
  updatedAt: string | null;
  blocks: MemoBlock[];
}

export interface NotePayload {
  name: string;
  color: string;
}

export interface SaveMemoPayload {
  blocks: Array<{ type: string; content: string | null; sortOrder: number }>;
}

export const notes = {
  getAll:  (archived = false) => api.get<NoteItem[]>(`/notes${archived ? '?archived=true' : ''}`),
  create:  (payload: NotePayload) => api.post<NoteItem>('/notes', payload),
  update:  (id: number, payload: NotePayload) => api.put<NoteItem>(`/notes/${id}`, payload),
  archive: (id: number) => api.patch<object>(`/notes/${id}/archive`),
  delete:  (id: number) => api.delete<object>(`/notes/${id}`),
};

export const memos = {
  getByNote: (noteId: number) => api.get<MemoListItem[]>(`/notes/${noteId}/memos`),
  create:    (noteId: number) => api.post<MemoListItem>(`/notes/${noteId}/memos`, {}),
  getDetail: (id: number)     => api.get<MemoDetail>(`/memos/${id}`),
  save:      (id: number, payload: SaveMemoPayload) => api.put<object>(`/memos/${id}`, payload),
  delete:    (id: number)     => api.delete<object>(`/memos/${id}`),
};
```

- [ ] **Step 4: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待結果: エラーなし（型エラーがあれば修正する）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/api/client.ts frontend/src/pages/login/index.ts frontend/src/api/notes.ts
git commit -m "feat: add patch to api client, save role to localStorage, add notes/memos API helpers"
```

---

## Task 2: Router にノート系ルートを追加

**Files:**
- Modify: `frontend/src/utils/router.ts`

**Interfaces:**
- Produces: `/notes`, `/notes/new`, `/notes/archive`, `/notes/:id`, `/notes/:id/edit`, `/notes/:id/memos/:memoId` の各ルート

- [ ] **Step 1: `router.ts` を更新する**

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
  '/notes': () => import('../pages/notes'),
  '/notes/new': () => import('../pages/notes/form'),
  '/notes/archive': () => import('../pages/notes/archive'),
};

const dynamicRoutes: Array<{ pattern: RegExp; loader: PageLoader }> = [
  { pattern: /^\/schedule\/\d+\/edit$/, loader: () => import('../pages/schedule/edit') },
  { pattern: /^\/schedule\/\d+$/,       loader: () => import('../pages/day') },
  { pattern: /^\/notes\/\d+\/edit$/,    loader: () => import('../pages/notes/form') },
  { pattern: /^\/notes\/\d+\/memos\/\d+$/, loader: () => import('../pages/notes/memos/edit') },
  { pattern: /^\/notes\/\d+$/,          loader: () => import('../pages/notes/memos') },
];

// ... 残りは変更なし
```

> **注意:** static routes (`/notes/new`, `/notes/archive`) は dynamic routes より先にマッチする。dynamic routes の `/notes/\d+` は数字のみにマッチするので衝突しない。

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: コミット**

```bash
git add frontend/src/utils/router.ts
git commit -m "feat: register note screen routes in router"
```

---

## Task 3: SCR-30 ノート一覧 (`/notes`)

**Files:**
- Create: `frontend/src/pages/notes/index.ts`
- Create: `frontend/src/pages/notes/notes.css`

**Interfaces:**
- Consumes: `notes.getAll()`, `memos.getByNote()` from `api/notes.ts`; `navigate` from `utils/router.ts`
- Produces: `mount(app)` — SCR-30 をレンダリング

**UI仕様:**
- ヘッダー: "SHARE" タイトル（左）、← ボタンなし
- 重要事項セクション: is_system=true のノートを特別表示（グレー背景カード）。タップ → メモ一覧から is_important=true のメモを取得して `/notes/:id/memos/:memoId` へ
- 通常ノートカード: ノートの color で左ボーダーを表示。タップ → `/notes/:id`。長押し（500ms）→ `/notes/:id/edit`
- FAB（右下 `+`）→ `/notes/new`
- アーカイブボタン（下部）→ `/notes/archive`

- [ ] **Step 1: `notes.css` を作成する**

```css
.notes-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
  padding-bottom: 80px;
}

.notes-header {
  display: flex;
  align-items: center;
  padding: 16px 16px 8px;
}

.notes-title {
  font-size: 1.5rem;
  font-weight: 700;
  flex: 1;
}

.notes-section-label {
  padding: 8px 16px 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.notes-system-card {
  margin: 4px 16px;
  padding: 14px 16px;
  background: #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
}

.notes-system-card:active {
  opacity: 0.7;
}

.notes-list {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-card {
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  border-left: 6px solid #ccc;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  font-weight: 600;
  font-size: 1rem;
}

.notes-card:active {
  opacity: 0.7;
}

.notes-empty {
  text-align: center;
  color: #999;
  padding: 32px 16px;
}

.notes-archive-btn {
  margin: 16px 16px 0;
  padding: 14px 16px;
  background: #d8b4fe;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  text-align: left;
  width: calc(100% - 32px);
}

.notes-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--theme-color, #6366f1);
  color: #fff;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10;
}
```

- [ ] **Step 2: `notes/index.ts` を作成する**

```typescript
import './notes.css';
import { notes, memos } from '../../api/notes';
import { navigate } from '../../utils/router';

async function navigateToSystemNote(noteId: number): Promise<void> {
  const result = await memos.getByNote(noteId);
  if (!result.success || !result.data) return;
  const important = result.data.find(m => m.isImportant);
  if (!important) return;
  navigate(`/notes/${noteId}/memos/${important.id}`);
}

function attachLongPress(el: HTMLElement, onLong: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function start(): void {
    timer = setTimeout(() => { timer = null; onLong(); }, 500);
  }
  function cancel(): void {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }
  function tap(): void {
    if (timer !== null) cancel(); // was not long press — handled by click
  }

  el.addEventListener('touchstart',  start,  { passive: true });
  el.addEventListener('touchend',    tap);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown',   start);
  el.addEventListener('mouseup',     tap);
  el.addEventListener('mouseleave',  cancel);
}

export async function mount(app: HTMLElement): Promise<void> {
  app.innerHTML = `
    <div class="notes-page">
      <div class="notes-header">
        <h1 class="notes-title">SHARE</h1>
      </div>
      <div id="notes-body"><p class="notes-empty">読み込み中…</p></div>
      <button class="notes-archive-btn" id="btn-archive">Archive</button>
      <button class="notes-fab" id="btn-fab" aria-label="ノートを追加">+</button>
    </div>
  `;

  app.querySelector('#btn-archive')!.addEventListener('click', () => navigate('/notes/archive'));
  app.querySelector('#btn-fab')!.addEventListener('click', () => navigate('/notes/new'));

  const result = await notes.getAll();
  const body = app.querySelector<HTMLElement>('#notes-body')!;

  if (!result.success || !result.data) {
    body.innerHTML = '<p class="notes-empty">ノートを取得できませんでした</p>';
    return;
  }

  const allNotes = result.data;
  const systemNote = allNotes.find(n => n.isSystem);
  const normalNotes = allNotes.filter(n => !n.isSystem);

  let html = '';

  if (systemNote) {
    html += `
      <p class="notes-section-label">重要事項</p>
      <div class="notes-system-card" data-system-id="${systemNote.id}">${systemNote.name}</div>
    `;
  }

  if (normalNotes.length > 0) {
    html += `<p class="notes-section-label">ノート</p><div class="notes-list">`;
    for (const note of normalNotes) {
      html += `<div class="notes-card" data-id="${note.id}" style="border-left-color: ${note.color}">${note.name}</div>`;
    }
    html += `</div>`;
  } else if (!systemNote) {
    html = '<p class="notes-empty">ノートがありません</p>';
  }

  body.innerHTML = html;

  if (systemNote) {
    body.querySelector<HTMLElement>(`[data-system-id="${systemNote.id}"]`)!
      .addEventListener('click', () => navigateToSystemNote(systemNote.id));
  }

  for (const note of normalNotes) {
    const card = body.querySelector<HTMLElement>(`[data-id="${note.id}"]`)!;

    let longPressed = false;

    attachLongPress(card, () => {
      longPressed = true;
      navigate(`/notes/${note.id}/edit`);
    });

    card.addEventListener('click', () => {
      if (longPressed) { longPressed = false; return; }
      navigate(`/notes/${note.id}`);
    });
  }
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/notes/index.ts frontend/src/pages/notes/notes.css
git commit -m "feat: SCR-30 note list page"
```

---

## Task 4: ノートフォーム（作成・編集） `/notes/new` と `/notes/:id/edit`

**Files:**
- Create: `frontend/src/pages/notes/form/index.ts`
- Create: `frontend/src/pages/notes/form/form.css`

**Interfaces:**
- Consumes: `notes.create()`, `notes.update()` from `api/notes.ts`; `navigate`
- Produces: `mount(app)` — URL が `/notes/new` なら新規作成、`/notes/:id/edit` なら編集

**カラーパレット（12色）:**
```
#F87171 #FB923C #FBBF24 #A3E635 #34D399 #22D3EE
#60A5FA #818CF8 #C084FC #E879F9 #FB7185 #94A3B8
```

- [ ] **Step 1: `form.css` を作成する**

```css
.form-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
}

.form-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.form-back-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px 8px;
}

.form-header-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.form-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  background: #fff;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--theme-color, #6366f1);
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 0.1s;
}

.color-swatch.selected {
  border-color: #111;
  transform: scale(1.15);
}

.form-submit-btn {
  margin: 8px 16px;
  padding: 14px;
  background: var(--theme-color, #6366f1);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.form-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-error {
  color: #ef4444;
  font-size: 0.85rem;
  padding: 0 16px;
  min-height: 20px;
}
```

- [ ] **Step 2: `form/index.ts` を作成する**

```typescript
import './form.css';
import { notes } from '../../../api/notes';
import { navigate } from '../../../utils/router';

const COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#34D399', '#22D3EE', '#60A5FA', '#818CF8',
  '#C084FC', '#E879F9', '#FB7185', '#94A3B8',
];

function parseEditId(): number | null {
  const match = location.pathname.match(/^\/notes\/(\d+)\/edit$/);
  return match ? parseInt(match[1], 10) : null;
}

export function mount(app: HTMLElement): void {
  const editId = parseEditId();
  const isEdit = editId !== null;
  let selectedColor = COLORS[0];

  app.innerHTML = `
    <div class="form-page">
      <div class="form-header">
        <button class="form-back-btn" id="btn-back">←</button>
        <h1 class="form-header-title">${isEdit ? 'ノートを編集' : 'ノートを作成'}</h1>
      </div>
      <div class="form-body">
        <div class="form-field">
          <label for="note-name">ノート名</label>
          <input class="form-input" type="text" id="note-name" placeholder="ノート名を入力" maxlength="50" />
        </div>
        <div class="form-field">
          <label>色</label>
          <div class="color-palette" id="color-palette">
            ${COLORS.map(c => `<button class="color-swatch${c === selectedColor ? ' selected' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
          </div>
        </div>
      </div>
      <p class="form-error" id="form-error"></p>
      <button class="form-submit-btn" id="btn-submit">${isEdit ? '更新する' : '作成する'}</button>
    </div>
  `;

  const nameInput  = app.querySelector<HTMLInputElement>('#note-name')!;
  const palette    = app.querySelector<HTMLElement>('#color-palette')!;
  const submitBtn  = app.querySelector<HTMLButtonElement>('#btn-submit')!;
  const errorEl    = app.querySelector<HTMLElement>('#form-error')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => history.back());

  palette.addEventListener('click', (e) => {
    const swatch = (e.target as HTMLElement).closest<HTMLElement>('[data-color]');
    if (!swatch) return;
    palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    selectedColor = swatch.dataset.color!;
  });

  submitBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { errorEl.textContent = 'ノート名を入力してください'; return; }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const payload = { name, color: selectedColor };
    const result = isEdit && editId !== null
      ? await notes.update(editId, payload)
      : await notes.create(payload);

    if (!result.success) {
      errorEl.textContent = '保存に失敗しました';
      submitBtn.disabled = false;
      return;
    }

    const noteId = result.data?.id ?? editId!;
    navigate(isEdit ? `/notes/${noteId}` : `/notes/${noteId}`, true);
  });
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/notes/form/index.ts frontend/src/pages/notes/form/form.css
git commit -m "feat: note create/edit form page"
```

---

## Task 5: SCR-31 メモ一覧 (`/notes/:noteId`)

**Files:**
- Create: `frontend/src/pages/notes/memos/index.ts`
- Create: `frontend/src/pages/notes/memos/memos.css`

**Interfaces:**
- Consumes: `notes.getAll()`, `notes.archive()`, `memos.getByNote()`, `memos.create()` from `api/notes.ts`
- Produces: `mount(app)` — SCR-31

**UI仕様:**
- ヘッダー: ← ボタン + ノート名
- メモリスト: is_important=true を上部固定（ラベル付き）
- +FAB → `POST /api/notes/:noteId/memos` → 作成されたメモIDで `/notes/:noteId/memos/:id` へ
- 「アーカイブに移動」ボタン（is_system=true のノートは非表示）

- [ ] **Step 1: `memos.css` を作成する**

```css
.memos-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
  padding-bottom: 100px;
}

.memos-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.memos-back-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px 8px;
}

.memos-header-title {
  font-size: 1.1rem;
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memos-section-label {
  padding: 8px 16px 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.memos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 16px;
}

.memos-card {
  padding: 14px 16px;
  background: #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
}

.memos-card:active {
  opacity: 0.7;
}

.memos-card-title {
  font-weight: 600;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memos-card-date {
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
}

.memos-empty {
  text-align: center;
  color: #999;
  padding: 32px 16px;
}

.memos-archive-btn {
  position: fixed;
  bottom: 24px;
  left: 16px;
  right: 80px;
  padding: 12px 16px;
  background: #d1d5db;
  border: none;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.memos-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--theme-color, #6366f1);
  color: #fff;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10;
}
```

- [ ] **Step 2: `memos/index.ts` を作成する**

```typescript
import './memos.css';
import { notes, memos } from '../../../api/notes';
import { navigate } from '../../../utils/router';

function parseNoteId(): number {
  const match = location.pathname.match(/^\/notes\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function mount(app: HTMLElement): Promise<void> {
  const noteId = parseNoteId();

  app.innerHTML = `
    <div class="memos-page">
      <div class="memos-header">
        <button class="memos-back-btn" id="btn-back">←</button>
        <h1 class="memos-header-title" id="note-title">読み込み中…</h1>
      </div>
      <div id="memos-body"></div>
      <button class="memos-archive-btn" id="btn-archive" style="display:none">アーカイブに移動</button>
      <button class="memos-fab" id="btn-fab" aria-label="メモを追加">+</button>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/notes'));

  // ノート名を取得
  const notesResult = await notes.getAll();
  let isSystem = false;
  if (notesResult.success && notesResult.data) {
    const note = notesResult.data.find(n => n.id === noteId);
    if (note) {
      app.querySelector<HTMLElement>('#note-title')!.textContent = note.name;
      isSystem = note.isSystem;
    }
  }

  const archiveBtn = app.querySelector<HTMLElement>('#btn-archive')!;
  if (!isSystem) {
    archiveBtn.style.display = '';
    archiveBtn.addEventListener('click', async () => {
      if (!confirm('このノートをアーカイブに移動しますか？')) return;
      const r = await notes.archive(noteId);
      if (r.success) navigate('/notes');
      else alert('アーカイブに失敗しました');
    });
  }

  const fabBtn = app.querySelector<HTMLElement>('#btn-fab')!;
  fabBtn.addEventListener('click', async () => {
    fabBtn.disabled = true;
    const r = await memos.create(noteId);
    fabBtn.disabled = false;
    if (!r.success || !r.data) { alert('メモの作成に失敗しました'); return; }
    navigate(`/notes/${noteId}/memos/${r.data.id}`);
  });

  await loadMemos(app, noteId);
}

async function loadMemos(app: HTMLElement, noteId: number): Promise<void> {
  const body = app.querySelector<HTMLElement>('#memos-body')!;
  body.innerHTML = '<p class="memos-empty">読み込み中…</p>';

  const result = await memos.getByNote(noteId);
  if (!result.success || !result.data) {
    body.innerHTML = '<p class="memos-empty">メモを取得できませんでした</p>';
    return;
  }

  const all = result.data;
  if (all.length === 0) {
    body.innerHTML = '<p class="memos-empty">メモがありません</p>';
    return;
  }

  const important = all.filter(m => m.isImportant);
  const normal    = all.filter(m => !m.isImportant);

  let html = '';

  if (important.length > 0) {
    html += `<p class="memos-section-label">重要事項</p><div class="memos-list">`;
    for (const m of important) {
      html += memoCardHtml(m.id, m.title ?? '（タイトルなし）', m.updatedAt);
    }
    html += `</div>`;
  }

  if (normal.length > 0) {
    html += `<p class="memos-section-label">メモ</p><div class="memos-list">`;
    for (const m of normal) {
      html += memoCardHtml(m.id, m.title ?? '（タイトルなし）', m.updatedAt);
    }
    html += `</div>`;
  }

  body.innerHTML = html;

  body.querySelectorAll<HTMLElement>('[data-memo-id]').forEach(card => {
    const memoId = parseInt(card.dataset.memoId!, 10);
    const noteId = parseNoteId();
    card.addEventListener('click', () => navigate(`/notes/${noteId}/memos/${memoId}`));
  });
}

function memoCardHtml(id: number, title: string, updatedAt: string | null): string {
  return `
    <div class="memos-card" data-memo-id="${id}">
      <div class="memos-card-title">${title}</div>
      <div class="memos-card-date">${formatDate(updatedAt)}</div>
    </div>
  `;
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/notes/memos/index.ts frontend/src/pages/notes/memos/memos.css
git commit -m "feat: SCR-31 memo list page"
```

---

## Task 6: SCR-32 メモ編集 (`/notes/:noteId/memos/:memoId`)

**Files:**
- Create: `frontend/src/pages/notes/memos/edit/index.ts`
- Create: `frontend/src/pages/notes/memos/edit/edit.css`

**Interfaces:**
- Consumes: `memos.getDetail()`, `memos.save()`, `memos.delete()` from `api/notes.ts`
- Produces: `mount(app)`

**ブロックタイプ:**
- `heading`: 大きい文字（ h3 相当）
- `bullet`: 先頭「・」、テキスト
- `ordered`: 先頭に自動番号、テキスト
- `checkbox`: チェックボックス + テキスト。content = `"0:テキスト"`（unchecked） or `"1:テキスト"`（checked）

**ツールバーボタン:**
- `T` → heading を末尾に追加
- `•` → bullet を末尾に追加
- `1` → ordered を末尾に追加
- `☐` → checkbox を末尾に追加

**自動保存:** 最後の入力から 1500ms 後に `PUT /api/memos/:id` を呼ぶ（debounce）

- [ ] **Step 1: `edit.css` を作成する**

```css
.edit-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--bg, #fef9c3);
}

.edit-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 8px;
  flex-shrink: 0;
}

.edit-back-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px 8px;
  flex-shrink: 0;
}

.edit-header-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}

.edit-delete-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  color: #ef4444;
  flex-shrink: 0;
}

.edit-save-status {
  font-size: 0.7rem;
  color: #888;
  text-align: center;
  padding: 2px 0;
  flex-shrink: 0;
  min-height: 18px;
}

.edit-blocks {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
  background: #e5e7eb;
  margin: 0 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.block-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}

.block-prefix {
  padding-top: 6px;
  font-size: 0.95rem;
  color: #444;
  flex-shrink: 0;
  min-width: 20px;
}

.block-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.95rem;
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  min-height: 28px;
  font-family: inherit;
  padding: 4px 0;
}

.block-input.heading {
  font-size: 1.2rem;
  font-weight: 700;
}

.block-checkbox {
  margin-top: 8px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
}

.edit-toolbar {
  display: flex;
  padding: 12px 16px;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.toolbar-btn {
  flex: 1;
  padding: 10px 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
}

.toolbar-btn:active {
  background: #f3f4f6;
}
```

- [ ] **Step 2: `edit/index.ts` を作成する**

```typescript
import './edit.css';
import { memos, type MemoBlock } from '../../../../api/notes';
import { navigate } from '../../../../utils/router';

interface BlockState {
  type: string;
  content: string;
}

function parsePath(): { noteId: number; memoId: number } {
  const m = location.pathname.match(/^\/notes\/(\d+)\/memos\/(\d+)$/);
  return m
    ? { noteId: parseInt(m[1], 10), memoId: parseInt(m[2], 10) }
    : { noteId: 0, memoId: 0 };
}

function parseCheckbox(content: string | null): { checked: boolean; text: string } {
  if (!content) return { checked: false, text: '' };
  if (content.startsWith('1:')) return { checked: true,  text: content.slice(2) };
  if (content.startsWith('0:')) return { checked: false, text: content.slice(2) };
  return { checked: false, text: content };
}

function serializeCheckbox(checked: boolean, text: string): string {
  return `${checked ? '1' : '0'}:${text}`;
}

function autoResize(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight}px`;
}

export async function mount(app: HTMLElement): Promise<void> {
  const { noteId, memoId } = parsePath();
  let blocks: BlockState[] = [];
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let isImportant = false;

  app.innerHTML = `
    <div class="edit-page">
      <div class="edit-header">
        <button class="edit-back-btn" id="btn-back">←</button>
        <span class="edit-header-title">Edit</span>
        <button class="edit-delete-btn" id="btn-delete">🗑</button>
      </div>
      <div class="edit-save-status" id="save-status"></div>
      <div class="edit-blocks" id="blocks-area"><p style="color:#888">読み込み中…</p></div>
      <div class="edit-toolbar">
        <button class="toolbar-btn" data-add="heading">T</button>
        <button class="toolbar-btn" data-add="bullet">•</button>
        <button class="toolbar-btn" data-add="ordered">1</button>
        <button class="toolbar-btn" data-add="checkbox">☐</button>
      </div>
    </div>
  `;

  const blocksArea  = app.querySelector<HTMLElement>('#blocks-area')!;
  const saveStatus  = app.querySelector<HTMLElement>('#save-status')!;
  const deleteBtn   = app.querySelector<HTMLElement>('#btn-delete')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => {
    if (saveTimer !== null) { clearTimeout(saveTimer); save(true); }
    navigate(`/notes/${noteId}`);
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('このメモを削除しますか？')) return;
    const r = await memos.delete(memoId);
    if (r.success) navigate(`/notes/${noteId}`, true);
    else alert('削除に失敗しました');
  });

  app.querySelector('.edit-toolbar')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-add]');
    if (!btn) return;
    blocks.push({ type: btn.dataset.add!, content: btn.dataset.add === 'checkbox' ? '0:' : '' });
    renderBlocks();
    scheduleSave();
  });

  // 初期データ取得
  const result = await memos.getDetail(memoId);
  if (!result.success || !result.data) {
    blocksArea.innerHTML = '<p style="color:#ef4444">メモを取得できませんでした</p>';
    return;
  }

  isImportant = result.data.isImportant;
  if (isImportant) deleteBtn.style.display = 'none';

  blocks = result.data.blocks.map((b: MemoBlock) => ({
    type:    b.type,
    content: b.content ?? '',
  }));

  renderBlocks();

  function renderBlocks(): void {
    blocksArea.innerHTML = '';
    blocks.forEach((block, idx) => {
      const row = document.createElement('div');
      row.className = 'block-row';
      row.dataset.idx = String(idx);

      if (block.type === 'checkbox') {
        const { checked, text } = parseCheckbox(block.content);
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'block-checkbox';
        cb.checked = checked;
        cb.addEventListener('change', () => {
          blocks[idx].content = serializeCheckbox(cb.checked, ta.value);
          scheduleSave();
        });

        const ta = document.createElement('textarea');
        ta.className = 'block-input';
        ta.value = text;
        ta.rows = 1;
        ta.addEventListener('input', () => {
          autoResize(ta);
          blocks[idx].content = serializeCheckbox(cb.checked, ta.value);
          handleDelete(ta, idx);
          scheduleSave();
        });

        row.appendChild(cb);
        row.appendChild(ta);
        setTimeout(() => autoResize(ta), 0);

      } else {
        const prefix = document.createElement('span');
        prefix.className = 'block-prefix';
        if (block.type === 'bullet')  prefix.textContent = '•';
        if (block.type === 'ordered') prefix.textContent = `${idx + 1}.`;

        const ta = document.createElement('textarea');
        ta.className = `block-input${block.type === 'heading' ? ' heading' : ''}`;
        ta.value = block.content;
        ta.rows = 1;
        ta.addEventListener('input', () => {
          autoResize(ta);
          blocks[idx].content = ta.value;
          handleDelete(ta, idx);
          scheduleSave();
        });

        if (block.type !== 'heading') row.appendChild(prefix);
        row.appendChild(ta);
        setTimeout(() => autoResize(ta), 0);
      }

      blocksArea.appendChild(row);
    });

    // 最後のブロックにフォーカス
    const inputs = blocksArea.querySelectorAll<HTMLTextAreaElement>('.block-input');
    if (inputs.length > 0) {
      const last = inputs[inputs.length - 1];
      last.focus();
      last.setSelectionRange(last.value.length, last.value.length);
    }
  }

  function handleDelete(ta: HTMLTextAreaElement, idx: number): void {
    if (ta.value === '' && blocks.length > 1) {
      blocks.splice(idx, 1);
      renderBlocks();
    }
  }

  function scheduleSave(): void {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveStatus.textContent = '編集中…';
    saveTimer = setTimeout(() => save(false), 1500);
  }

  async function save(immediate: boolean): Promise<void> {
    saveTimer = null;
    saveStatus.textContent = '保存中…';
    const payload = {
      blocks: blocks.map((b, i) => ({ type: b.type, content: b.content || null, sortOrder: i })),
    };
    const r = await memos.save(memoId, payload);
    saveStatus.textContent = r.success ? (immediate ? '' : '保存しました') : '保存に失敗';
    if (!immediate) setTimeout(() => { saveStatus.textContent = ''; }, 2000);
  }
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/notes/memos/edit/index.ts frontend/src/pages/notes/memos/edit/edit.css
git commit -m "feat: SCR-32 memo block editor with auto-save"
```

---

## Task 7: SCR-33 アーカイブ一覧 (`/notes/archive`)

**Files:**
- Create: `frontend/src/pages/notes/archive/index.ts`
- Create: `frontend/src/pages/notes/archive/archive.css`

**Interfaces:**
- Consumes: `notes.getAll(true)`, `notes.delete()` from `api/notes.ts`
- Produces: `mount(app)`

**UI仕様:**
- ヘッダー: ← + "Archive"
- アーカイブ済みノートのリスト
- ゴミ箱ボタン: `localStorage.role === '0'`（管理者）の時のみ表示。押すと `DELETE /api/notes/:id` を呼ぶ

- [ ] **Step 1: `archive.css` を作成する**

```css
.archive-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
}

.archive-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.archive-back-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px 8px;
}

.archive-header-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
}

.archive-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: #e5e7eb;
  border-radius: 10px;
}

.archive-card-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.95rem;
}

.archive-delete-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #ef4444;
  padding: 4px;
}

.archive-empty {
  text-align: center;
  color: #999;
  padding: 32px 16px;
}
```

- [ ] **Step 2: `archive/index.ts` を作成する**

```typescript
import './archive.css';
import { notes } from '../../../api/notes';
import { navigate } from '../../../utils/router';

export async function mount(app: HTMLElement): Promise<void> {
  const isAdmin = localStorage.getItem('role') === '0';

  app.innerHTML = `
    <div class="archive-page">
      <div class="archive-header">
        <button class="archive-back-btn" id="btn-back">←</button>
        <h1 class="archive-header-title">Archive</h1>
      </div>
      <div id="archive-body"><p class="archive-empty">読み込み中…</p></div>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/notes'));

  await loadArchive(app, isAdmin);
}

async function loadArchive(app: HTMLElement, isAdmin: boolean): Promise<void> {
  const body = app.querySelector<HTMLElement>('#archive-body')!;

  const result = await notes.getAll(true);
  if (!result.success || !result.data) {
    body.innerHTML = '<p class="archive-empty">取得できませんでした</p>';
    return;
  }

  const archivedNotes = result.data;
  if (archivedNotes.length === 0) {
    body.innerHTML = '<p class="archive-empty">アーカイブされたノートはありません</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'archive-list';

  for (const note of archivedNotes) {
    const card = document.createElement('div');
    card.className = 'archive-card';
    card.innerHTML = `
      <span class="archive-card-name">${note.name}</span>
      ${isAdmin ? `<button class="archive-delete-btn" data-id="${note.id}" aria-label="削除">🗑</button>` : ''}
    `;
    list.appendChild(card);
  }

  body.innerHTML = '';
  body.appendChild(list);

  if (isAdmin) {
    list.querySelectorAll<HTMLElement>('[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('このノートを完全に削除しますか？この操作は取り消せません。')) return;
        const id = parseInt(btn.dataset.id!, 10);
        const r = await notes.delete(id);
        if (r.success) await loadArchive(app, isAdmin);
        else alert('削除に失敗しました');
      });
    });
  }
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/notes/archive/index.ts frontend/src/pages/notes/archive/archive.css
git commit -m "feat: SCR-33 archive list page"
```

---

## Self-Review

### Spec Coverage

| 仕様 | タスク |
|---|---|
| SCR-30: ノート一覧表示 | Task 3 |
| SCR-30: +ボタンで新規ノート作成（名前・色） | Task 3 + Task 4 |
| SCR-30: is_system ノートは SCR-31 をスキップして SCR-32 へ | Task 3 |
| SCR-30: 長押しでノート編集 | Task 3 + Task 4 |
| SCR-30: Archive ボタン | Task 3 |
| SCR-31: メモ一覧（is_important 上部固定） | Task 5 |
| SCR-31: +ボタンで新規メモ → SCR-32 へ | Task 5 |
| SCR-31: アーカイブに移動 | Task 5 |
| SCR-32: ブロックエディタ（heading/bullet/ordered/checkbox） | Task 6 |
| SCR-32: debounce 自動保存 | Task 6 |
| SCR-32: ゴミ箱（is_important は非表示） | Task 6 |
| SCR-33: アーカイブ済みノート一覧 | Task 7 |
| SCR-33: 管理者のみ削除ボタン表示 | Task 7 |
| role の保存（SCR-33 の管理者チェック用） | Task 1 |
| PATCH /api が client.ts に未実装 | Task 1 |

すべてカバー済み。

### Placeholder Scan

- プレースホルダーなし ✅

### Type Consistency

- `NoteItem`, `MemoListItem`, `MemoDetail`, `MemoBlock`, `NotePayload`, `SaveMemoPayload` は Task 1 で定義、Task 3〜7 で使用 ✅
- `memos.getDetail()` は `MemoDetail` を返す。Task 6 で `result.data.blocks` を `MemoBlock[]` として使用 ✅
- `parseCheckbox` / `serializeCheckbox` は Task 6 内で定義・使用 ✅
