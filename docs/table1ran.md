# テーブル一覧

## カラーパレット（R-06, R-07）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `colors` | id, hex_code, display_name, sort_order | R-06, R-07 |

> グローバル固定テーブル。マイグレーション時に20色のシードデータを投入。管理UIなし。  
> `personal_color_id`・`theme_color_id`（users）および `color_id`（genres）から参照される。

## 認証・ユーザー管理（R-01, R-07, R-09）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `users` | id, login_id, name, password_hash, personal_color_id, theme_color_id, role, group_id, is_active | R-01, R-07, R-09 |
| `sessions` | id, user_id, token, expires_at, last_active_at | R-01 |
| `audit_logs` | id, user_id, action, target_type, target_id, created_at | R-09 |

## グループ・ジャンル（R-05, R-06）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `groups` | id, name | R-05, R-06 |
| `genres` | id, name, color_id, default_notification_minutes, group_id | R-06, R-08 |

> `genres` はスケジュール専用。color_id は同グループ内ユーザーの personal_color_id と重複不可（アプリ側で制御）。

## スケジュール（R-04, R-05）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `schedules` | id, creator_id, genre_id（NULL可）, date, start_time, end_time, title, detail, visibility, notification_minutes | R-04, R-05 |

## 共有事項（R-03）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `notes` | id, name, color, group_id, creator_id, created_at, is_archived, updated_by, updated_at | R-03 |
| `memos` | id, note_id, title, creator_id, is_important, updated_by, updated_at | R-03 |
| `memo_blocks` | id, memo_id, type, content, sort_order | R-03 |

> `notes` はノートブック（UpNote のノートに相当）。color 制限なし、一般ユーザー全員が作成可能。  
> `memos` はノート内の個別メモ。`note_id` で親ノートと紐づく。  
> `memo_blocks` はメモのコンテンツブロック（見出し・箇条書き・番号付きリスト・チェックボックス・リンク）。

## 通知（R-08）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `user_notification_settings` | id, user_id, genre_id, is_enabled, custom_notification_minutes | R-08 |

> スケジュールのジャンル専用。custom_notification_minutes が NULL の場合は genres のデフォルト値を使用。
