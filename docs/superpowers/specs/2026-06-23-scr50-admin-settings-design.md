# SCR-50 管理者用設定画面 Design Spec

**Date:** 2026-06-23  
**Branch:** feature/createNote  
**Status:** Approved

---

## 概要

SCR-40（設定ハブ）の「管理者用設定」から遷移する管理者専用UI。  
バックエンドAPIはすべて実装済み（feature/CreateSettings）。  
role=0（管理者）のみがアクセスできる。

---

## 画面一覧（全4画面）

| # | パス | 役割 |
|---|---|---|
| ① | `/settings/admin` | 管理者ハブ |
| ② | `/settings/admin/users` | ユーザー一覧・無効化 |
| ③ | `/settings/admin/users/new` | アカウント作成フォーム |
| ④ | `/settings/admin/groups/new` | グループ作成フォーム |

---

## ルーティング

`frontend/src/utils/router.ts` に以下を追加（static routes）:

```
'/settings/admin'            → import('../pages/settings/admin')
'/settings/admin/users'      → import('../pages/settings/admin/users')
'/settings/admin/users/new'  → import('../pages/settings/admin/users/form')
'/settings/admin/groups/new' → import('../pages/settings/admin/groups/form')
```

動的ルートは不要。

---

## ファイル構成

```
frontend/src/pages/settings/admin/
├── index.ts          ① 管理者ハブ
├── admin.css
├── users/
│   ├── index.ts      ② ユーザー一覧
│   ├── users.css
│   └── form/
│       ├── index.ts  ③ アカウント作成フォーム
│       └── form.css
└── groups/
    └── form/
        ├── index.ts  ④ グループ作成フォーム
        └── form.css
```

---

## 認可ガード

すべての画面の `mount()` 冒頭で以下を実行:

```typescript
if (localStorage.getItem('role') !== '0') {
  navigate('/settings');
  return;
}
```

---

## API一覧（使用するエンドポイント）

| 画面 | メソッド | パス | 用途 |
|---|---|---|---|
| ② | GET | `/api/admin/users` | 全ユーザー一覧取得 |
| ②③ | PATCH | `/api/admin/users/{id}/deactivate` | 無効化 |
| ③ | POST | `/api/admin/users` | アカウント作成 |
| ④ | GET | `/api/admin/users?ungrouped=true` | 未所属ユーザー取得 |
| ④ | POST | `/api/admin/groups` | グループ作成 |

---

## 画面仕様

### ① 管理者ハブ `/settings/admin`

- ヘッダー: `←` ボタン（→ `navigate('/settings')`）+ タイトル「管理者設定」
- メニューカード（SCR-40と同じ角丸カードスタイル、`settings.css` を流用）:
  1. 「ユーザー管理」→ `navigate('/settings/admin/users')`
  2. 「グループ作成」→ `navigate('/settings/admin/groups/new')`

---

### ② ユーザー一覧 `/settings/admin/users`

- ヘッダー: `←`（→ `navigate('/settings/admin')`）+ 「ユーザー管理」+ 右端に「＋ 新規」ボタン（→ `navigate('/settings/admin/users/new')`）
- `GET /api/admin/users` でユーザー一覧取得
- 各行の表示:
  - 名前 + ロールバッジ（`[管理者]` `[GL]` `[一般]`）
  - アクティブ: 通常表示 + 「無効化」ボタン
  - 無効化済み（`isActive === false`）: 行全体をグレーアウト + 「無効化済み」テキスト、ボタン非表示
- 無効化フロー:
  1. 「無効化」ボタン押下 → `confirm('○○を無効化しますか？')`
  2. OK → `PATCH /api/admin/users/{id}/deactivate`
  3. 成功 → リスト再描画（ページ全体リロードではなく DOM 更新）
  4. 失敗 → `alert('無効化に失敗しました')`
- ローディング中: 「読み込み中…」表示
- ユーザー0件: 「ユーザーがいません」表示

---

### ③ アカウント作成 `/settings/admin/users/new`

- ヘッダー: `←`（→ `navigate('/settings/admin/users')`）+ 「アカウント作成」
- 入力フィールド:
  1. LoginId（`<input type="text">`、placeholder: 「例: tanaka01」）
  2. 名前（`<input type="text">`）
  3. 初期パスワード（`<input type="password">`）
  4. ロール（`<input type="radio">`）: 管理者 / GL / 一般、デフォルト = 一般（2）
- バリデーション（クライアント側）: 全フィールド必須
- 送信: `POST /api/admin/users { loginId, name, password, role }`
- 成功 → `navigate('/settings/admin/users', true)`
- エラーコード処理:
  - `ADMIN_LOGIN_ID_CONFLICT` → 「このLoginIdはすでに使われています」
  - その他 → 「作成に失敗しました」
- エラー表示欄: ボタン直上に `<p class="form-error">` で表示

---

### ④ グループ作成 `/settings/admin/groups/new`

- ヘッダー: `←`（→ `navigate('/settings/admin')`）+ 「グループ作成」
- 入力フィールド:
  1. グループ名（`<input type="text">`）
  2. メンバー選択: `GET /api/admin/users?ungrouped=true` で未所属ユーザー取得、チェックボックスリスト表示
     - 各行: `☑ 名前 [ロールバッジ]`
     - 未所属ユーザーが0人 → 「グループ未所属のユーザーがいません」表示、送信ボタン無効
- バリデーション（クライアント側）: グループ名必須、チェック最低1人
- 送信: `POST /api/admin/groups { name, userIds: number[] }`
- 成功 → `navigate('/settings/admin', true)`
- 失敗 → エラーメッセージ表示

---

## グローバル制約

- フレームワーク不使用（vanilla TS のみ）
- `export async function mount(app: HTMLElement): Promise<void>` パターン
- API呼び出しは `api.get/post/patch` ヘルパー（`frontend/src/api/client.ts`）
- XSS対策: ユーザー入力を innerHTML に挿入する際は `escHtml()` でエスケープ
- ナビゲーション: `navigate(path)` / `navigate(path, true)`
- テーマカラー: `var(--theme-color, #6366f1)`
- 背景色: `var(--bg, #fef9c3)`
- `npm run build` でビルドエラーなしを確認してからコミット
- コミットメッセージは英語、`feat:` prefix

---

## 非目標

- アカウント再有効化（DB直接操作で対応）
- グループ編集・削除
- グループへの既存ユーザー追加
- ユーザー情報の編集（名前・ロール変更）
