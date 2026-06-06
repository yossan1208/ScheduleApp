# テーブル定義書

## `colors`（カラーパレット）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| hex_code | char(7) | NOT NULL | | UNIQUE（例：`#FF5733`） |
| display_name | nvarchar(20) | NOT NULL | | 表示名 |
| sort_order | smallint | NOT NULL | | 並び順 |

---

## `groups`（グループ）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| name | nvarchar(50) | NOT NULL | | グループ名 |

---

## `users`（ユーザー）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| login_id | varchar(50) | NOT NULL | | UNIQUE |
| name | nvarchar(20) | NOT NULL | | 表示名 |
| password_hash | varchar(255) | NOT NULL | | |
| personal_color_id | int | NOT NULL | | FK → colors.id |
| theme_color_id | int | NOT NULL | | FK → colors.id |
| role | smallint | NOT NULL | 2 | 0=管理者 1=GL 2=一般 |
| group_id | int | NOT NULL | | FK → groups.id |
| is_active | bit | NOT NULL | 1 | 0=無効化済み |

---

## `sessions`（セッション）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| user_id | int | NOT NULL | | FK → users.id |
| token | varchar(512) | NOT NULL | | JWTトークン |
| expires_at | datetime2 | NOT NULL | | 有効期限 |
| last_active_at | datetime2 | NOT NULL | | 最終アクセス日時 |

---

## `audit_logs`（監査ログ）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| user_id | int | NULL | | FK → users.id（無効化後も残すためNULL許容） |
| action | varchar(50) | NOT NULL | | 操作内容 |
| target_type | varchar(50) | NULL | | 対象テーブル名 |
| target_id | bigint | NULL | | 対象レコードID |
| created_at | datetime2 | NOT NULL | GETDATE() | 操作日時 |

---

## `genres`（ジャンル）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| name | nvarchar(20) | NOT NULL | | ジャンル名 |
| color_id | int | NOT NULL | | FK → colors.id |
| default_notification_minutes | int | NULL | | デフォルト通知時間（未設定可） |
| group_id | int | NOT NULL | | FK → groups.id |
| is_active | bit | NOT NULL | 1 | 0=無効化 |
| is_deleted | bit | NOT NULL | 0 | 論理削除フラグ |
| deleted_at | datetime2 | NULL | | 削除日時 |

---

## `schedules`（予定）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| creator_id | int | NOT NULL | | FK → users.id |
| group_id | int | NOT NULL | | FK → groups.id |
| genre_id | int | NULL | | FK → genres.id（任意） |
| date | date | NOT NULL | | 予定日 |
| start_time | time | NULL | | 開始時間（NULLの場合は終日予定） |
| end_time | time | NULL | | 終了時間（NULLの場合は終日予定） |
| title | nvarchar(30) | NOT NULL | | タイトル |
| detail | nvarchar(max) | NULL | | 詳細 |
| visibility | varchar(10) | NOT NULL | 'private' | `private` or `group` |
| notification_minutes | int | NULL | | 通知タイミング（開始何分前） |
| is_deleted | bit | NOT NULL | 0 | 論理削除フラグ |
| deleted_at | datetime2 | NULL | | 削除日時 |

---

## `notes`（ノート）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| name | nvarchar(30) | NOT NULL | | ノート名 |
| color | char(7) | NOT NULL | | 色（例：`#FF5733`） |
| group_id | int | NOT NULL | | FK → groups.id |
| creator_id | int | NOT NULL | | FK → users.id |
| created_at | datetime2 | NOT NULL | GETDATE() | |
| is_archived | bit | NOT NULL | 0 | アーカイブフラグ |
| updated_by | int | NULL | | FK → users.id |
| updated_at | datetime2 | NULL | | |
| is_deleted | bit | NOT NULL | 0 | 論理削除フラグ |
| deleted_at | datetime2 | NULL | | 削除日時 |

---

## `memos`（メモ）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| note_id | int | NOT NULL | | FK → notes.id |
| title | nvarchar(30) | NULL | | 先頭ブロックの content 先頭30文字を自動セット |
| creator_id | int | NULL | | FK → users.id |
| is_important | bit | NOT NULL | 0 | 重要フラグ（トップ固定） |
| updated_by | int | NULL | | FK → users.id |
| updated_at | datetime2 | NULL | | |

---

## `memo_blocks`（メモブロック）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| memo_id | int | NOT NULL | | FK → memos.id（物理削除カスケード） |
| type | varchar(20) | NOT NULL | | `heading` `bullet` `numbered` `checkbox` `link` |
| content | nvarchar(max) | NULL | | ブロックの内容 |
| sort_order | int | NOT NULL | | 表示順 |

---

## `user_notification_settings`（通知設定）

| カラム | 型 | NULL | デフォルト | 備考 |
|---|---|---|---|---|
| id | int | NOT NULL | IDENTITY | PK |
| user_id | int | NOT NULL | | FK → users.id |
| genre_id | int | NOT NULL | | FK → genres.id |
| is_enabled | bit | NOT NULL | 1 | 通知ON/OFF |
| custom_notification_minutes | int | NULL | | 個人設定の通知時間（NULLの場合はジャンルのデフォルト値を使用） |

