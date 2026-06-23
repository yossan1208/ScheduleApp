# SCR-50 管理者用設定画面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SCR-50（管理者ハブ・ユーザー一覧・アカウント作成・グループ作成）をフロントエンドに実装する。バックエンドAPIはすべて実装済み。

**Architecture:** Vanilla TypeScript SPA (Vite) → ASP.NET Core 10 API → SQL Server 2022。`export async function mount(app: HTMLElement)` パターン。SCR-40〜45 と同じ settings 画面ファミリ。

**Tech Stack:** TypeScript, Vite, 既存 `api/client.ts`

## Global Constraints

- すべてのページは `export async function mount(app: HTMLElement): Promise<void>` をエクスポート（同期で済む場合も async）
- API呼び出しは `api.get/post/patch` ヘルパー（`frontend/src/api/client.ts`）を使用
- APIレスポンスは `ApiEnvelope<T>`: `{ success: bool, data: T|null, error: {code,message}|null }`
- XSS対策: ユーザー入力を innerHTML に挿入する際は必ず各ファイル内に定義した `escHtml()` でエスケープ
- ナビゲーションは `navigate(path)` or `navigate(path, true)`（`frontend/src/utils/router.ts`）
- 認可ガード: 各 mount 冒頭で `localStorage.getItem('role') !== '0'` なら `navigate('/settings'); return;`
- テーマカラー: `var(--theme-color, #6366f1)` / 背景色: `var(--bg, #fef9c3)`
- `cd frontend && npm run build` でビルドエラーがないことを確認してからコミット
- コミットメッセージは英語、`feat:` prefix
- `escHtml` は各ファイルに以下をコピーして使う（共有モジュール化しない、既存パターン踏襲）:
  ```typescript
  function escHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  ```

---

## File Map

| ファイル | 役割 | 作成/変更 |
|---|---|---|
| `frontend/src/api/admin.ts` | 管理者API型定義 + APIヘルパー | 新規 |
| `frontend/src/utils/router.ts` | 4ルート追加 | 変更 |
| `frontend/src/pages/settings/index.ts` | 管理者用設定リンクをアクティブ化 | 変更 |
| `frontend/src/pages/settings/admin/index.ts` | ① 管理者ハブ | 新規 |
| `frontend/src/pages/settings/admin/users/index.ts` | ② ユーザー一覧・無効化 | 新規 |
| `frontend/src/pages/settings/admin/users/users.css` | ② スタイル | 新規 |
| `frontend/src/pages/settings/admin/users/form/index.ts` | ③ アカウント作成フォーム | 新規 |
| `frontend/src/pages/settings/admin/users/form/form.css` | ③ スタイル | 新規 |
| `frontend/src/pages/settings/admin/groups/form/index.ts` | ④ グループ作成フォーム | 新規 |
| `frontend/src/pages/settings/admin/groups/form/form.css` | ④ スタイル | 新規 |

---

## Task 1: API基盤・ルーター・SCR-40ワイヤアップ

**Files:**
- Create: `frontend/src/api/admin.ts`
- Modify: `frontend/src/utils/router.ts`
- Modify: `frontend/src/pages/settings/index.ts`

**Interfaces:**
- Produces:
  - `AdminUser` 型（userId, loginId, name, role, groupId, isActive）
  - `admin.getUsers(ungrouped?)`, `admin.createUser(payload)`, `admin.deactivate(id)`, `admin.createGroup(payload)`

---

- [ ] **Step 1: `frontend/src/api/admin.ts` を作成する**

```typescript
import { api } from './client';

export interface AdminUser {
  userId:   number;
  loginId:  string;
  name:     string;
  role:     number;
  groupId:  number | null;
  isActive: boolean;
}

export interface CreateUserPayload {
  loginId:  string;
  name:     string;
  password: string;
  role:     number;
}

export interface CreateGroupPayload {
  name:    string;
  userIds: number[];
}

export const admin = {
  getUsers:    (ungrouped = false) =>
    api.get<AdminUser[]>(`/admin/users${ungrouped ? '?ungrouped=true' : ''}`),
  createUser:  (payload: CreateUserPayload) =>
    api.post<AdminUser>('/admin/users', payload),
  deactivate:  (id: number) =>
    api.patch<object>(`/admin/users/${id}/deactivate`),
  createGroup: (payload: CreateGroupPayload) =>
    api.post<object>('/admin/groups', payload),
};
```

- [ ] **Step 2: `frontend/src/utils/router.ts` に4ルートを追加する**

`routes` オブジェクトの末尾（`'/settings/genres/new'` の直後）に追加:

```typescript
  '/settings/admin':            () => import('../pages/settings/admin'),
  '/settings/admin/users':      () => import('../pages/settings/admin/users'),
  '/settings/admin/users/new':  () => import('../pages/settings/admin/users/form'),
  '/settings/admin/groups/new': () => import('../pages/settings/admin/groups/form'),
```

- [ ] **Step 3: `frontend/src/pages/settings/index.ts` の管理者リンクをアクティブ化する**

現在の `adminItem` テンプレートリテラル（行8〜13）を以下に置き換える（`--disabled` クラスを外す）:

```typescript
  const adminItem = isAdmin
    ? `<li class="settings-menu-item" id="item-admin">
        <span class="settings-menu-label">管理者用設定</span>
        <span class="settings-menu-arrow">›</span>
       </li>`
    : '';
```

さらに末尾のコメント行（行49）を以下に置き換える:

```typescript
  if (isAdmin) {
    app.querySelector('#item-admin')!.addEventListener('click', () => navigate('/settings/admin'));
  }
```

- [ ] **Step 4: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待結果: エラーなし（ページファイルが存在しないため import エラーが出る場合は次のタスクで解消される）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/api/admin.ts frontend/src/utils/router.ts frontend/src/pages/settings/index.ts
git commit -m "feat: add admin API helper, routes, and wire up SCR-40 admin link"
```

---

## Task 2: ① 管理者ハブ `/settings/admin`

**Files:**
- Create: `frontend/src/pages/settings/admin/index.ts`

**Interfaces:**
- Consumes: `navigate` from `utils/router.ts`; `settings.css`（`../../settings.css` でインポート）
- Produces: `mount(app)` — 管理者ハブをレンダリング

---

- [ ] **Step 1: `frontend/src/pages/settings/admin/index.ts` を作成する**

```typescript
import '../settings.css';
import { navigate } from '../../../utils/router';

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="settings-page">
      <div class="settings-header">
        <button class="settings-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="settings-title">管理者設定</h1>
      </div>
      <ul class="settings-menu">
        <li class="settings-menu-item" id="item-users">
          <span class="settings-menu-label">ユーザー管理</span>
          <span class="settings-menu-arrow">›</span>
        </li>
        <li class="settings-menu-item" id="item-groups">
          <span class="settings-menu-label">グループ作成</span>
          <span class="settings-menu-arrow">›</span>
        </li>
      </ul>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings'));
  app.querySelector('#item-users')!.addEventListener('click', () => navigate('/settings/admin/users'));
  app.querySelector('#item-groups')!.addEventListener('click', () => navigate('/settings/admin/groups/new'));
}
```

> `settings.css` を流用するため独自 CSS ファイルは不要。

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待結果: エラーなし（残りのページファイルがまだないため import エラーが残る場合は無視して次タスクへ）

- [ ] **Step 3: コミット**

```bash
git add frontend/src/pages/settings/admin/index.ts
git commit -m "feat: SCR-50 admin hub"
```

---

## Task 3: ② ユーザー一覧 `/settings/admin/users`

**Files:**
- Create: `frontend/src/pages/settings/admin/users/index.ts`
- Create: `frontend/src/pages/settings/admin/users/users.css`

**Interfaces:**
- Consumes: `admin.getUsers()`, `admin.deactivate(id)` from `api/admin.ts`; `navigate`
- Produces: `mount(app)` — ユーザー一覧・無効化

---

- [ ] **Step 1: `users.css` を作成する**

```css
.admin-users-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
}

.admin-users-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
}

.admin-users-back-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--theme-color, #6366f1);
  padding: 0 4px;
  line-height: 1;
}

.admin-users-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--theme-color, #6366f1);
  margin: 0;
  flex: 1;
}

.admin-users-new-btn {
  background: var(--theme-color, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.admin-users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
}

.admin-user-row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  gap: 10px;
}

.admin-user-row--inactive {
  opacity: 0.45;
}

.admin-user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-user-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.admin-user-login {
  font-size: 12px;
  color: #6b7280;
}

.admin-role-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
}

.admin-role-badge--admin {
  background: #fee2e2;
  color: #991b1b;
}

.admin-role-badge--gl {
  background: #dbeafe;
  color: #1e40af;
}

.admin-inactive-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}

.admin-deactivate-btn {
  background: none;
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.admin-deactivate-btn:active {
  background: #fef2f2;
}

.admin-users-empty {
  text-align: center;
  color: #9ca3af;
  padding: 32px 16px;
}
```

- [ ] **Step 2: `users/index.ts` を作成する**

```typescript
import './users.css';
import { admin, type AdminUser } from '../../../../api/admin';
import { navigate } from '../../../../utils/router';

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function roleBadge(role: number): string {
  if (role === 0) return '<span class="admin-role-badge admin-role-badge--admin">管理者</span>';
  if (role === 1) return '<span class="admin-role-badge admin-role-badge--gl">GL</span>';
  return '<span class="admin-role-badge">一般</span>';
}

function userRowHtml(u: AdminUser): string {
  const inactive = !u.isActive;
  const actionHtml = inactive
    ? '<span class="admin-inactive-label">無効化済み</span>'
    : `<button class="admin-deactivate-btn" data-id="${u.userId}" data-name="${escHtml(u.name)}">無効化</button>`;

  return `
    <div class="admin-user-row${inactive ? ' admin-user-row--inactive' : ''}">
      <div class="admin-user-info">
        <span class="admin-user-name">${escHtml(u.name)}</span>
        <span class="admin-user-login">${escHtml(u.loginId)}</span>
      </div>
      ${roleBadge(u.role)}
      ${actionHtml}
    </div>
  `;
}

async function loadUsers(listEl: HTMLElement): Promise<void> {
  listEl.innerHTML = '<p class="admin-users-empty">読み込み中…</p>';

  const result = await admin.getUsers();
  if (!result.success || !result.data) {
    listEl.innerHTML = '<p class="admin-users-empty">ユーザーを取得できませんでした</p>';
    return;
  }

  const users = result.data;
  if (users.length === 0) {
    listEl.innerHTML = '<p class="admin-users-empty">ユーザーがいません</p>';
    return;
  }

  listEl.innerHTML = `<div class="admin-users-list">${users.map(userRowHtml).join('')}</div>`;

  listEl.querySelectorAll<HTMLButtonElement>('.admin-deactivate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id   = parseInt(btn.dataset.id!, 10);
      const name = btn.dataset.name!;
      if (!confirm(`${name} を無効化しますか？`)) return;
      btn.disabled = true;
      const r = await admin.deactivate(id);
      if (r.success) {
        await loadUsers(listEl);
      } else {
        alert('無効化に失敗しました');
        btn.disabled = false;
      }
    });
  });
}

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-users-page">
      <div class="admin-users-header">
        <button class="admin-users-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-users-title">ユーザー管理</h1>
        <button class="admin-users-new-btn" id="btn-new">＋ 新規</button>
      </div>
      <div id="users-list"></div>
    </div>
  `;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings/admin'));
  app.querySelector('#btn-new')!.addEventListener('click', () => navigate('/settings/admin/users/new'));

  await loadUsers(app.querySelector<HTMLElement>('#users-list')!);
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待結果: エラーなし

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/settings/admin/users/index.ts frontend/src/pages/settings/admin/users/users.css
git commit -m "feat: SCR-50 admin user list with deactivate"
```

---

## Task 4: ③ アカウント作成フォーム `/settings/admin/users/new`

**Files:**
- Create: `frontend/src/pages/settings/admin/users/form/index.ts`
- Create: `frontend/src/pages/settings/admin/users/form/form.css`

**Interfaces:**
- Consumes: `admin.createUser(payload)`, `CreateUserPayload` from `api/admin.ts`; `navigate`
- Produces: `mount(app)` — アカウント作成フォーム

---

- [ ] **Step 1: `form.css` を作成する**

```css
.admin-form-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
}

.admin-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
}

.admin-form-back-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--theme-color, #6366f1);
  padding: 0 4px;
  line-height: 1;
}

.admin-form-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--theme-color, #6366f1);
  margin: 0;
}

.admin-form-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.admin-form-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.admin-form-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  background: #fff;
  box-sizing: border-box;
}

.admin-form-input:focus {
  outline: none;
  border-color: var(--theme-color, #6366f1);
}

.admin-role-options {
  display: flex;
  gap: 16px;
}

.admin-role-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  cursor: pointer;
}

.admin-form-error {
  color: #ef4444;
  font-size: 13px;
  min-height: 18px;
  padding: 0 20px;
}

.admin-form-submit-btn {
  margin: 4px 20px 24px;
  padding: 14px;
  background: var(--theme-color, #6366f1);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.admin-form-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: `form/index.ts` を作成する**

```typescript
import './form.css';
import { admin } from '../../../../../api/admin';
import { navigate } from '../../../../../utils/router';

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-form-page">
      <div class="admin-form-header">
        <button class="admin-form-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-form-title">アカウント作成</h1>
      </div>
      <div class="admin-form-body">
        <div class="admin-form-field">
          <label for="f-loginid">LoginId</label>
          <input class="admin-form-input" type="text" id="f-loginid" placeholder="例: tanaka01" autocomplete="off" />
        </div>
        <div class="admin-form-field">
          <label for="f-name">名前</label>
          <input class="admin-form-input" type="text" id="f-name" placeholder="田中 太郎" />
        </div>
        <div class="admin-form-field">
          <label for="f-password">初期パスワード</label>
          <input class="admin-form-input" type="password" id="f-password" placeholder="初期パスワード" autocomplete="new-password" />
        </div>
        <div class="admin-form-field">
          <label>ロール</label>
          <div class="admin-role-options">
            <label class="admin-role-option">
              <input type="radio" name="role" value="0" /> 管理者
            </label>
            <label class="admin-role-option">
              <input type="radio" name="role" value="1" /> GL
            </label>
            <label class="admin-role-option">
              <input type="radio" name="role" value="2" checked /> 一般
            </label>
          </div>
        </div>
      </div>
      <p class="admin-form-error" id="form-error"></p>
      <button class="admin-form-submit-btn" id="btn-submit">作成する</button>
    </div>
  `;

  const loginIdInput = app.querySelector<HTMLInputElement>('#f-loginid')!;
  const nameInput    = app.querySelector<HTMLInputElement>('#f-name')!;
  const passwordInput= app.querySelector<HTMLInputElement>('#f-password')!;
  const errorEl      = app.querySelector<HTMLElement>('#form-error')!;
  const submitBtn    = app.querySelector<HTMLButtonElement>('#btn-submit')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings/admin/users'));

  submitBtn.addEventListener('click', async () => {
    const loginId  = loginIdInput.value.trim();
    const name     = nameInput.value.trim();
    const password = passwordInput.value;
    const roleVal  = (app.querySelector<HTMLInputElement>('input[name="role"]:checked')?.value) ?? '2';

    if (!loginId || !name || !password) {
      errorEl.textContent = 'すべての項目を入力してください';
      return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const result = await admin.createUser({ loginId, name, password, role: parseInt(roleVal, 10) });

    if (!result.success) {
      const code = result.error?.code;
      errorEl.textContent = code === 'ADMIN_LOGIN_ID_CONFLICT'
        ? 'このLoginIdはすでに使われています'
        : '作成に失敗しました';
      submitBtn.disabled = false;
      return;
    }

    navigate('/settings/admin/users', true);
  });
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待結果: エラーなし

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/settings/admin/users/form/index.ts frontend/src/pages/settings/admin/users/form/form.css
git commit -m "feat: SCR-50 admin account creation form"
```

---

## Task 5: ④ グループ作成フォーム `/settings/admin/groups/new`

**Files:**
- Create: `frontend/src/pages/settings/admin/groups/form/index.ts`
- Create: `frontend/src/pages/settings/admin/groups/form/form.css`

**Interfaces:**
- Consumes: `admin.getUsers(true)`, `admin.createGroup(payload)`, `CreateGroupPayload` from `api/admin.ts`; `navigate`
- Produces: `mount(app)` — グループ作成フォーム

---

- [ ] **Step 1: `form.css` を作成する**

```css
.admin-group-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg, #fef9c3);
}

.admin-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
}

.admin-group-back-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--theme-color, #6366f1);
  padding: 0 4px;
  line-height: 1;
}

.admin-group-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--theme-color, #6366f1);
  margin: 0;
}

.admin-group-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.admin-group-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.admin-group-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  background: #fff;
  box-sizing: border-box;
}

.admin-group-input:focus {
  outline: none;
  border-color: var(--theme-color, #6366f1);
}

.admin-group-member-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.admin-group-member-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.admin-group-members {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.admin-group-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  cursor: pointer;
}

.admin-group-member-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--theme-color, #6366f1);
  cursor: pointer;
  flex-shrink: 0;
}

.admin-group-member-name {
  font-size: 15px;
  flex: 1;
}

.admin-group-member-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
}

.admin-group-error {
  color: #ef4444;
  font-size: 13px;
  min-height: 18px;
  padding: 0 20px;
}

.admin-group-submit-btn {
  margin: 4px 20px 24px;
  padding: 14px;
  background: var(--theme-color, #6366f1);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.admin-group-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-group-empty {
  text-align: center;
  color: #9ca3af;
  padding: 16px;
}
```

- [ ] **Step 2: `groups/form/index.ts` を作成する**

```typescript
import './form.css';
import { admin, type AdminUser } from '../../../../../api/admin';
import { navigate } from '../../../../../utils/router';

function escHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function roleBadgeText(role: number): string {
  if (role === 0) return '管理者';
  if (role === 1) return 'GL';
  return '一般';
}

export async function mount(app: HTMLElement): Promise<void> {
  if (localStorage.getItem('role') !== '0') {
    navigate('/settings');
    return;
  }

  app.innerHTML = `
    <div class="admin-group-page">
      <div class="admin-group-header">
        <button class="admin-group-back-btn" id="btn-back" aria-label="戻る">←</button>
        <h1 class="admin-group-title">グループ作成</h1>
      </div>
      <div class="admin-group-body">
        <div class="admin-group-field">
          <label for="g-name">グループ名</label>
          <input class="admin-group-input" type="text" id="g-name" placeholder="例: チームA" />
        </div>
        <div class="admin-group-field">
          <p class="admin-group-member-label">メンバーを選択（最低1人）</p>
          <div id="member-list"><p class="admin-group-empty">読み込み中…</p></div>
          <p class="admin-group-member-hint">※ グループ未所属のユーザーのみ表示されます</p>
        </div>
      </div>
      <p class="admin-group-error" id="group-error"></p>
      <button class="admin-group-submit-btn" id="btn-submit">作成する</button>
    </div>
  `;

  const nameInput  = app.querySelector<HTMLInputElement>('#g-name')!;
  const memberList = app.querySelector<HTMLElement>('#member-list')!;
  const errorEl    = app.querySelector<HTMLElement>('#group-error')!;
  const submitBtn  = app.querySelector<HTMLButtonElement>('#btn-submit')!;

  app.querySelector('#btn-back')!.addEventListener('click', () => navigate('/settings/admin'));

  // 未所属ユーザー取得
  const result = await admin.getUsers(true);
  let ungroupedUsers: AdminUser[] = [];

  if (!result.success || !result.data || result.data.length === 0) {
    memberList.innerHTML = '<p class="admin-group-empty">グループ未所属のユーザーがいません</p>';
    submitBtn.disabled = true;
  } else {
    ungroupedUsers = result.data;
    memberList.innerHTML = `
      <div class="admin-group-members">
        ${ungroupedUsers.map(u => `
          <label class="admin-group-member-row">
            <input type="checkbox" data-uid="${u.userId}" />
            <span class="admin-group-member-name">${escHtml(u.name)}</span>
            <span class="admin-group-member-badge">${escHtml(roleBadgeText(u.role))}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  submitBtn.addEventListener('click', async () => {
    const groupName = nameInput.value.trim();
    const checked   = Array.from(
      app.querySelectorAll<HTMLInputElement>('input[data-uid]:checked')
    ).map(cb => parseInt(cb.dataset.uid!, 10));

    if (!groupName) {
      errorEl.textContent = 'グループ名を入力してください';
      return;
    }
    if (checked.length === 0) {
      errorEl.textContent = 'メンバーを1人以上選択してください';
      return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const r = await admin.createGroup({ name: groupName, userIds: checked });

    if (!r.success) {
      const code = r.error?.code;
      errorEl.textContent = code === 'ADMIN_GROUP_USER_REQUIRED'
        ? 'グループには1人以上のユーザーが必要です'
        : 'グループの作成に失敗しました';
      submitBtn.disabled = false;
      return;
    }

    navigate('/settings/admin', true);
  });
}
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/yoshizawayuki/ScheduleApp/frontend && npm run build 2>&1 | tail -20
```

期待結果: エラーなし（ビルドが通れば全タスク完了）

- [ ] **Step 4: コミット**

```bash
git add frontend/src/pages/settings/admin/groups/form/index.ts frontend/src/pages/settings/admin/groups/form/form.css
git commit -m "feat: SCR-50 admin group creation form"
```

---

## Self-Review

### Spec Coverage

| 仕様 | タスク |
|---|---|
| SCR-40「管理者用設定」→ `/settings/admin` に遷移 | Task 1 |
| ① 管理者ハブ: ユーザー管理・グループ作成へのメニュー | Task 2 |
| ② ユーザー一覧: アクティブ/無効化済み区別 | Task 3 |
| ② ユーザー一覧: 無効化ボタン → PATCH /deactivate | Task 3 |
| ② ユーザー一覧: 「＋ 新規」→ フォーム遷移 | Task 3 |
| ③ アカウント作成: loginId/name/password/role | Task 4 |
| ③ エラーコード ADMIN_LOGIN_ID_CONFLICT 処理 | Task 4 |
| ④ グループ作成: グループ名 + 未所属ユーザー選択 | Task 5 |
| ④ 未所属ユーザー0人 → ボタン無効 | Task 5 |
| ④ エラーコード ADMIN_GROUP_USER_REQUIRED 処理 | Task 5 |
| 認可ガード（role !== '0' → /settings にリダイレクト） | Task 1〜5 全画面 |
| XSS対策（escHtml） | Task 3・5 |

すべてカバー済み。

### Placeholder Scan

- プレースホルダーなし ✅

### Type Consistency

- `AdminUser` は Task 1 で定義、Task 3・5 で import して使用 ✅
- `CreateUserPayload` は Task 1 で定義、Task 4 で `admin.createUser({ loginId, name, password, role })` として使用 ✅
- `CreateGroupPayload` は Task 1 で定義、Task 5 で `admin.createGroup({ name, userIds })` として使用 ✅
- `admin.deactivate(id)` の戻り値は `ApiEnvelope<object>` → Task 3 で `r.success` チェック ✅
- `result.error?.code` は `ApiEnvelope.error.code` プロパティ — `frontend/src/types/api.ts` の型に準拠 ✅
