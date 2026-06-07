# ログイン機能 設計ドキュメント

作成日: 2026-06-07  
対象ブランチ: feature/CreateLogin  
対応要件: R-01（認証・セッション管理）  
対応画面: SCR-00（ログイン画面）

---

## 1. 概要

ID + パスワードによるログイン認証を実装する。  
認証方式はハイブリッドJWT + DBセッション（案A）を採用。  
JWTをhttpOnly Cookieに保存し、sessionsテーブルで即時無効化とスライディングウィンドウを実現する。

---

## 2. バックエンド構成

### 新規作成ファイル

```
backend/ScheduleApp.Api/
├── Controllers/
│   └── AuthController.cs
├── Services/
│   └── AuthService.cs
├── Repositories/
│   ├── UserRepository.cs
│   └── SessionRepository.cs
├── Middleware/
│   └── SessionMiddleware.cs
└── Models/Dtos/
    ├── LoginRequest.cs
    └── LoginResponse.cs
```

### ログイン処理フロー（POST /api/auth/login）

1. `UserRepository` で `loginId` 検索
2. BCrypt でパスワード検証
3. `is_active` / `group_id` をチェックしエラーコード振り分け
4. JWT 生成（payload: `userId`, `role`, `groupId`）
5. `SessionRepository` でセッション保存（`token`, `expires_at = now+14日`, `last_active_at = now`）
6. httpOnly Cookie に JWT をセット
7. `ApiEnvelope<LoginResponse>` を返す

### ログアウト処理フロー（POST /api/auth/logout）

1. Cookie から JWT 取得
2. `SessionRepository` でセッション削除
3. Cookie クリア
4. `ApiEnvelope<object>` を返す

### エラーコード

| コード | 条件 | メッセージ |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | ID/PW 不一致 | IDまたはパスワードが違います |
| `AUTH_ACCOUNT_DISABLED` | `is_active = false` | アカウントが無効です |
| `AUTH_NO_GROUP` | `group_id = null` | グループに加入してください |

### セッションミドルウェア（全認証済みリクエスト）

1. Cookie から JWT を取得・署名検証
2. `sessions` テーブルで `token` を検索
3. `expires_at` が過去 → セッション削除 → 401 返却
4. 有効 → `last_active_at` と `expires_at` を `now + 14日` に更新
5. `userId` / `role` / `groupId` を `HttpContext.Items` に格納して次へ

### JWT ペイロード

```json
{ "userId": 1, "role": 2, "groupId": 5 }
```

### LoginResponse

```json
{
  "userId": 1,
  "name": "山田太郎",
  "role": 2,
  "themeColorHex": "#FF8C00"
}
```

ログイン成功時のレスポンスにテーマカラーの hex コードを含める。  
フロントはこの値を受け取り次第 CSS 変数にセットし、以降の全画面に適用する。

---

## 3. フロントエンド構成

### 新規作成ファイル

```
frontend/src/
├── styles/
│   └── main.css               共通CSS（変数・リセット・共通クラス）
├── pages/
│   └── login/
│       ├── index.ts           mount() を export
│       └── login.css          ログインページ専用スタイル
└── api/
    └── auth.ts                login() / logout() のAPI関数
```

### router.ts 更新

```ts
const routes = {
  '/': () => import('../pages/login'),
};
```

### ログインページ動作

1. `mount()` でフォームHTML を生成・レンダリング
2. フォーム送信 → `auth.login({ loginId, password })` を呼ぶ
3. 成功 → `/home` へ `navigate()`
4. 失敗 → エラーコードに応じたメッセージをフォーム下に表示

### ワイヤフレーム（SCR-00）配置

- 中央カード内に ID・パスワードの入力欄
- カード下部にログインボタン
- ボタン下にエラーメッセージ表示エリア

### CSS 方針

- `src/styles/main.css`：CSS変数（カラー・フォントサイズ等）・リセット・共通クラスを定義
- `src/pages/login/login.css`：ログインページ固有のレイアウトスタイル
- デザインの詳細（色・フォント）は後続タスクで詰める。今回は配置のみ実装

---

## 4. DB 変更

### User エンティティ

`GroupId` を `int?`（NULL許容）に変更する。

```csharp
// 変更前
public int GroupId { get; set; }

// 変更後
public int? GroupId { get; set; }
```

EF Core マイグレーションを追加して DB に適用する。

---

## 5. スコープ外

- デザインの詳細（テーマカラー・フォント・アニメーション）→ 後続タスク
- `/home` の実装 → 次のブランチで対応
- Push通知・Service Worker → 最終フェーズ
