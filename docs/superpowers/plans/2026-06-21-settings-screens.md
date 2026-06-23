# Settings Screens (SCR-40〜45) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** SCR-40〜45（設定ハブ・パスワード・通知・ジャンル・個人設定）をフロントエンドに実装する。バックエンドAPIはすべて実装済み。

**Architecture:** Vanilla TypeScript SPA (Vite) → ASP.NET Core 10 API → SQL Server 2022。`export async function mount(app: HTMLElement)` パターン。

**Tech Stack:** TypeScript, Vite, existing `api/client.ts`

## Global Constraints

- すべてのページは `export async function mount(app: HTMLElement): Promise<void>` をエクスポート
- API呼び出しは `api.get/post/put/delete` ヘルパー（`frontend/src/api/client.ts`）を使用
- APIレスポンスは `ApiEnvelope<T>`: `{ success: bool, data: T|null, error: {code,message}|null }`
- XSS対策: ユーザー入力を innerHTML に挿入する際は必ず `escHtml()` でエスケープ
- ナビゲーションは `navigate(path)` or `navigate(path, true)`（`frontend/src/utils/router.ts`）
- ロール: `localStorage.getItem('role')` — `'0'`=管理者, `'1'`=GL, `'2'`=一般
- テーマカラー: `var(--theme-color, #6366f1)`
- 背景色: `var(--bg, #fef9c3)`
- `npm run build` でビルドエラーがないことを確認してコミット
- コミットメッセージは英語、`feat:` prefix

---

### Task 1: API基盤（settings.ts 新規・genres.ts 拡張）

**Files:**
- Create: `frontend/src/api/settings.ts`
- Modify: `frontend/src/api/genres.ts`

**Interfaces（settings.ts に定義）:**

```typescript
// GET /api/users/me, PUT /api/users/me レスポンス
export interface UserProfile {
  userId:           number;
  loginId:          string;
  name:             string;
  role:             number;
  personalColorId:  number;
  personalColorHex: string;
  themeColorId:     number;
  themeColorHex:    string;
}

// PUT /api/users/me リクエスト
export interface UpdateProfilePayload {
  name:            string;
  personalColorId: number;
  themeColorId:    number;
}

// PUT /api/users/me/password リクエスト
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword:     string;
  confirmPassword: string;
}

// GET /api/notifications/settings レスポンス
export interface NotificationSetting {
  genreId:                   number;
  genreName:                 string;
  colorHex:                  string;
  isEnabled:                 boolean;
  customNotificationMinutes: number | null;
}

// PUT /api/notifications/settings/{genreId} リクエスト
export interface UpdateNotificationPayload {
  isEnabled:                 boolean;
  customNotificationMinutes: number | null;
}

// GET /api/colors レスポンス
export interface ColorItem {
  colorId:     number;
  hexCode:     string;
  displayName: string;
}
```

**API オブジェクト（settings.ts に定義）:**

```typescript
export const userSettings = {
  getProfile:     ()                                => api.get<UserProfile>('/users/me'),
  updateProfile:  (payload: UpdateProfilePayload)  => api.put<UserProfile>('/users/me', payload),
  changePassword: (payload: ChangePasswordPayload) => api.put<object>('/users/me/password', payload),
};

export const notifications = {
  getSettings:    ()                                            => api.get<NotificationSetting[]>('/notifications/settings'),
  updateSetting:  (genreId: number, payload: UpdateNotificationPayload) =>
                    api.put<object>(`/notifications/settings/${genreId}`, payload),
};

export const colors = {
  getAll: () => api.get<ColorItem[]>('/colors'),
};
```

**genres.ts の拡張（既存に追記）:**

```typescript
// 既存の Genre インターフェースはそのまま維持

export interface CreateGenrePayload {
  name:                    string;
  colorId:                 number;
  defaultNotificationTime: string | null;  // "HH:mm" 形式
}

export interface UpdateGenrePayload {
  name:                    string;
  colorId:                 number;
  defaultNotificationTime: string | null;
}

// 既存の genres オブジェクトに追加:
// genres.getGenres はそのまま
// 以下を追加:
//   create: (payload: CreateGenrePayload) => api.post<Genre>('/genres', payload),
//   update: (id: number, payload: UpdateGenrePayload) => api.put<Genre>(`/genres/${id}`, payload),
//   delete: (id: number) => api.delete<object>(`/genres/${id}`),
```

**Steps:**
- [ ] `frontend/src/api/settings.ts` を作成（上記コードをそのまま実装）
- [ ] `frontend/src/api/genres.ts` に `CreateGenrePayload`・`UpdateGenrePayload` を追加し、`genres` オブジェクトに `create`・`update`・`delete` を追加
- [ ] `cd frontend && npm run build` でエラーがないことを確認
- [ ] `git add frontend/src/api/settings.ts frontend/src/api/genres.ts && git commit -m "feat: add settings/notifications/colors API and extend genres API"`

---

### Task 2: Router に設定系ルートを追加

**Files:**
- Modify: `frontend/src/utils/router.ts`

**追加するルート（static）:**
```
'/settings'                → import('../pages/settings')
'/settings/profile'        → import('../pages/settings/profile')
'/settings/password'       → import('../pages/settings/password')
'/settings/notifications'  → import('../pages/settings/notifications')
'/settings/genres'         → import('../pages/settings/genres')
'/settings/genres/new'     → import('../pages/settings/genres/form')
```

**追加するルート（dynamic）:**
```
pattern: /^\/settings\/genres\/\d+\/edit$/
loader:  () => import('../pages/settings/genres/form')
```

動的ルートは既存の dynamic routes 配列の先頭（または末尾）に追加。最も長いパターンが先に来るよう順序に注意。

**Steps:**
- [ ] `router.ts` を開き、static routes に上記6件を追加
- [ ] dynamic routes に `genres/:id/edit` パターンを追加
- [ ] `npm run build` で型エラーがないことを確認（ページファイルは存在しないためエラーは無視可。型エラーのみ確認）
- [ ] `git add frontend/src/utils/router.ts && git commit -m "feat: add settings routes to router"`

---

### Task 3: SCR-40 設定ハブ

**Files:**
- Create: `frontend/src/pages/settings/index.ts`
- Create: `frontend/src/pages/settings/settings.css`

**仕様:**
- ヘッダー: 戻るボタン（`←`）+ タイトル「Settings」
- 戻るボタン → `navigate('/home')`（または `history.back()`）
- メニューリスト（縦並び、角丸カード）:
  1. 個人用設定 → `navigate('/settings/profile')`
  2. 通知設定 → `navigate('/settings/notifications')`
  3. ジャンル一覧 → `navigate('/settings/genres')`（全員閲覧可）
  4. パスワード設定 → `navigate('/settings/password')`
  5. 管理者用設定 → `role === '0'` のときのみ表示。タップしても何もしない（`// TODO: SCR-50`）

- ロールは `localStorage.getItem('role')` で取得

**Steps:**
- [ ] `index.ts` を作成（mount 関数でHTMLをレンダリング、イベントを登録）
- [ ] `settings.css` を作成（ページ全体レイアウト、メニューカードスタイル）
- [ ] `npm run build` でエラーなし確認
- [ ] `git commit -m "feat: SCR-40 settings hub"`

---

### Task 4: SCR-41 パスワード変更

**Files:**
- Create: `frontend/src/pages/settings/password/index.ts`
- Create: `frontend/src/pages/settings/password/password.css`

**仕様:**
- ヘッダー: 戻るボタン + タイトル「password」
- 戻るボタン → `navigate('/settings')`
- 3つの `<input type="password">`:
  - 古いパスワード（placeholder: 「古いパスワードを入力」）
  - 新しいパスワード（placeholder: 「新しいパスワードを入力」）
  - 確認用（placeholder: 「確認用」）
- 「設定する」ボタン
- バリデーション（クライアント側）:
  - 3フィールドすべて入力必須
  - 新しいパスワードと確認用が一致しない場合はエラーメッセージ表示
- API: `userSettings.changePassword({ currentPassword, newPassword, confirmPassword })`
- エラーコード処理:
  - `USER_PASSWORD_MISMATCH` → 「現在のパスワードが正しくありません」
  - `USER_PASSWORD_CONFIRM_MISMATCH` → 「新しいパスワードと確認用が一致しません」（APIでも確認するが、クライアントでも事前チェック）
- 成功時: `alert('パスワードを変更しました')` → `navigate('/settings')`

**API import:** `import { userSettings } from '../../../api/settings';`

**Steps:**
- [ ] `index.ts` を作成
- [ ] `password.css` を作成
- [ ] `npm run build` でエラーなし確認
- [ ] `git commit -m "feat: SCR-41 password change"`

---

### Task 5: SCR-42 通知設定（ジャンル別 ON/OFF）

**Files:**
- Create: `frontend/src/pages/settings/notifications/index.ts`
- Create: `frontend/src/pages/settings/notifications/notifications.css`

**仕様:**
- ヘッダー: 戻るボタン + タイトル「通知設定」
- 戻るボタン → `navigate('/settings')`
- API: `notifications.getSettings()` で `NotificationSetting[]` を取得
- ジャンルごとに行を表示:
  ```
  [ジャンル色のドット] ジャンル名          [トグルスイッチ ON/OFF]
  ```
- トグル変更 → 即時 `notifications.updateSetting(genreId, { isEnabled: !current, customNotificationMinutes: null })` を呼ぶ
- ローディング中は「読み込み中…」表示
- ジャンルが0件の場合は「ジャンルがまだ作成されていません」

**トグルスイッチのHTML（チェックボックス + CSS）:**
```html
<label class="toggle-switch">
  <input type="checkbox" ${setting.isEnabled ? 'checked' : ''}>
  <span class="toggle-slider"></span>
</label>
```

**API import:** `import { notifications } from '../../../api/settings';`

**Steps:**
- [ ] `index.ts` を作成（ジャンル一覧取得・トグルイベント登録）
- [ ] `notifications.css` を作成（行レイアウト、トグルスイッチのCSS）
- [ ] `npm run build` でエラーなし確認
- [ ] `git commit -m "feat: SCR-42 notification settings"`

---

### Task 6: SCR-43 ジャンル一覧

**Files:**
- Create: `frontend/src/pages/settings/genres/index.ts`
- Create: `frontend/src/pages/settings/genres/genres.css`

**仕様:**
- ヘッダー: 戻るボタン + タイトル「ジャンル一覧」
- 戻るボタン → `navigate('/settings')`
- API: `genres.getGenres()` で `Genre[]` を取得
- ジャンルカード一覧（背景色 = ジャンル色）:
  ```
  [ジャンル名（白文字）]
  ```
- カードタップ → `navigate('/settings/genres/${genre.id}/edit')`
- GL以上（`role ≤ 1`）: 「新規追加する」ボタン → `navigate('/settings/genres/new')`
- 一般ユーザー（`role === '2'`）: 「新規追加する」ボタンを非表示
- ジャンル色は CSS の `background-color: ${safeColor}` に使用。XSS対策: `/^#[0-9a-fA-F]{3,6}$/` で検証し、失敗したら `#ccc`
- ジャンルが0件の場合は「ジャンルがまだ作成されていません」
- ロール: `localStorage.getItem('role')`

**API import:** `import { genres } from '../../../api/genres';`

**Steps:**
- [ ] `index.ts` を作成
- [ ] `genres.css` を作成
- [ ] `npm run build` でエラーなし確認
- [ ] `git commit -m "feat: SCR-43 genre list"`

---

### Task 7: SCR-44 ジャンル作成/編集フォーム

**Files:**
- Create: `frontend/src/pages/settings/genres/form/index.ts`
- Create: `frontend/src/pages/settings/genres/form/form.css`

**パス判定:**
```typescript
function parseEditId(): number | null {
  const m = location.pathname.match(/^\/settings\/genres\/(\d+)\/edit$/);
  return m ? parseInt(m[1], 10) : null;
}
// null → 作成モード、number → 編集モード
```

**仕様:**
- ヘッダー: 戻るボタン + タイトル（作成: 「ジャンル作成」, 編集: 「ジャンル編集」）
- 戻るボタン → `navigate('/settings/genres')`
- フォームフィールド:
  1. ジャンル名（`<input type="text">`、maxlength=20）
  2. 色選択: `/api/colors` から全色取得し、丸いスウォッチで表示。選択中は枠線付き
  3. デフォルト通知時間（`<input type="time">`、任意）
- 「保存する」ボタン（作成・更新両用）
- 編集モード: ページ読み込み時に `genres.getGenres()` で該当ジャンルを探し、値をプリフィル
- 削除ボタン（編集モードのみ）: `confirm('このジャンルを削除しますか？')` → `genres.delete(id)` → `navigate('/settings/genres', true)`
- バリデーション: ジャンル名必須、色選択必須
- 作成: `genres.create({ name, colorId, defaultNotificationTime })` → 成功 → `navigate('/settings/genres', true)`
- 更新: `genres.update(id, { name, colorId, defaultNotificationTime })` → 成功 → `navigate('/settings/genres', true)`
- `defaultNotificationTime`: `<input type="time">` が空なら `null`、値があれば `"HH:mm"` 文字列

**API import:**
```typescript
import { genres, type CreateGenrePayload, type UpdateGenrePayload } from '../../../../api/genres';
import { colors, type ColorItem } from '../../../../api/settings';
```

**Steps:**
- [ ] `index.ts` を作成（作成/編集モード両対応）
- [ ] `form.css` を作成（スウォッチグリッド含む）
- [ ] `npm run build` でエラーなし確認
- [ ] `git commit -m "feat: SCR-44 genre create/edit form"`

---

### Task 8: SCR-45 個人設定

**Files:**
- Create: `frontend/src/pages/settings/profile/index.ts`
- Create: `frontend/src/pages/settings/profile/profile.css`

**仕様:**
- ヘッダー: 戻るボタン + タイトル「個人設定」
- 戻るボタン → `navigate('/settings')`
- ページ読み込み時: `userSettings.getProfile()` でプロフィール取得
- フォームフィールド:
  1. 名前（`<input type="text">`、現在の name をプリフィル）
  2. 個人カラー: `/api/colors` から全色を取得し丸いスウォッチで表示。現在の `personalColorId` を選択済みにする
  3. テーマカラー: 同様に丸いスウォッチで表示。現在の `themeColorId` を選択済みにする
- 「設定する」ボタン
- バリデーション: 名前必須、個人カラー選択必須、テーマカラー選択必須
- 送信: `userSettings.updateProfile({ name, personalColorId, themeColorId })` → 成功後:
  - `localStorage.setItem('themeColorHex', result.data.themeColorHex)` は不要（テーマカラーは `--theme-color` CSS変数に反映する必要あり）
  - `document.documentElement.style.setProperty('--theme-color', result.data.themeColorHex)` で即時反映
  - `alert('設定を保存しました')` → `navigate('/settings')`
- エラー処理: `USER_COLOR_NOT_FOUND` など → エラーメッセージ表示

**API import:**
```typescript
import { userSettings, colors, type UpdateProfilePayload, type ColorItem } from '../../../api/settings';
```

**Steps:**
- [ ] `index.ts` を作成
- [ ] `profile.css` を作成
- [ ] `npm run build` でエラーなし確認
- [ ] `git commit -m "feat: SCR-45 personal settings"`
