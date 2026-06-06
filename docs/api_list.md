# API一覧

## 凡例

| 記号 | 意味 |
|---|---|
| 🔓 | 認証不要 |
| 🔒 | ログイン必須 |
| 👑 | 管理者のみ |
| 🏅 | 管理者 or グループリーダーのみ |

---

## 認証（R-01）

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `POST` | `/api/auth/login` | ログイン（JWT発行・httpOnly Cookie保存） | 🔓 |
| 2 | `POST` | `/api/auth/logout` | ログアウト（Cookie削除） | 🔒 |

> セッション延長（スライディングウィンドウ14日）はミドルウェアで自動処理。`/refresh` エンドポイントなし。

---

## カレンダー / 予定（R-02・R-04・R-05）

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/schedules` | 予定一覧取得（`?from=&to=` で期間指定） | 🔒 |
| 2 | `POST` | `/api/schedules` | 予定作成 | 🔒 |
| 3 | `GET` | `/api/schedules/{id}` | 予定詳細取得 | 🔒 |
| 4 | `PUT` | `/api/schedules/{id}` | 予定編集（作成者のみ） | 🔒 |
| 5 | `DELETE` | `/api/schedules/{id}` | 予定削除・論理削除（作成者のみ） | 🔒 |
| 6 | `GET` | `/api/schedules/recent` | 直近作成した5件の履歴取得 | 🔒 |

> 絞り込み（ユーザー・ジャンル・自分のみ）はなし。色分けで代用。
> 論理削除：`is_deleted` / `deleted_at` カラムで管理。自動削除なし。

---

## 共有事項（R-03）

**ノート**

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/notes` | ノート一覧取得 | 🔒 |
| 2 | `POST` | `/api/notes` | ノート作成（全員可） | 🔒 |
| 3 | `PUT` | `/api/notes/{id}` | ノート編集（名前・色） | 🔒 |
| 4 | `PATCH` | `/api/notes/{id}/archive` | アーカイブへ移動（一般ユーザー以上） | 🔒 |
| 5 | `DELETE` | `/api/notes/{id}` | アーカイブから削除・論理削除（全員可） | 🔒 |

**メモ**

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 6 | `GET` | `/api/notes/{noteId}/memos` | メモ一覧取得 | 🔒 |
| 7 | `POST` | `/api/notes/{noteId}/memos` | メモ作成 | 🔒 |
| 8 | `GET` | `/api/memos/{id}` | メモ詳細取得（ブロック含む） | 🔒 |
| 9 | `PUT` | `/api/memos/{id}` | メモ保存・メモ全体をまとめて保存 | 🔒 |
| 10 | `DELETE` | `/api/memos/{id}` | メモ削除・物理削除（memo_blocksカスケード） | 🔒 |

> 自動保存タイミング（フロント実装）：①入力停止2〜3秒後（デバウンス）②戻るボタン押下③アプリバックグラウンド移行時（visibilitychange）

---

## ジャンル（R-06）

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/genres` | ジャンル一覧取得 | 🔒 |
| 2 | `POST` | `/api/genres` | ジャンル作成 | 🏅 |
| 3 | `PUT` | `/api/genres/{id}` | ジャンル編集 | 🏅 |
| 4 | `PATCH` | `/api/genres/{id}/disable` | 無効化（選択不可・色は占有継続） | 🏅 |
| 5 | `DELETE` | `/api/genres/{id}` | 論理削除（色を解放・レコードは残し履歴表示を維持） | 🏅 |

> 色の空き判定は `is_deleted = false` のジャンルのみ対象。

---

## 通知設定（R-08）

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/notifications/settings` | 自分の通知設定一覧取得（ジャンルごと） | 🔒 |
| 2 | `PUT` | `/api/notifications/settings/{genreId}` | ジャンルごとの通知設定を更新（On/Off・個人の通知時間） | 🔒 |

> `user_notification_settings` レコードはジャンル作成時にグループ内全ユーザー分を自動生成（`POST /api/genres` の内部処理）。
> Push通知のインフラ（Service Worker・VAPIDキー・スケジューラー）は最後に実装。

---

## 設定（R-07）

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/users/me` | 自分のプロフィール取得 | 🔒 |
| 2 | `PUT` | `/api/users/me` | アカウント名・個人カラー・テーマカラー変更 | 🔒 |
| 3 | `PUT` | `/api/users/me/password` | パスワード変更 | 🔒 |

---

## アカウント管理（R-09）

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/admin/users` | ユーザー一覧取得 | 👑 |
| 2 | `POST` | `/api/admin/users` | アカウント作成・初期パスワード設定 | 👑 |
| 3 | `PATCH` | `/api/admin/users/{id}/deactivate` | アカウント無効化 | 👑 |

> 再有効化はAPIなし。必要時は直接DB操作（`UPDATE users SET is_active = 1 WHERE id = <ID>`）で対応。

---

## カラーマスタ

| # | メソッド | パス | 説明 | 権限 |
|---|---|---|---|---|
| 1 | `GET` | `/api/colors` | カラー一覧取得 | 🔒 |

