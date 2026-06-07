# スケジュールAPI 設計ドキュメント

作成日: 2026-06-07
対象ブランチ: feature/CreateLogin（次ブランチで実装）
対応要件: R-02 / R-04 / R-05

---

## 1. 概要

グループ内でのスケジュール共有機能のバックエンドAPIを実装する。
visibility により個人（private）とグループ共有（group）の2種類の公開範囲を持つ。

---

## 2. DB変更

### 2-1. genres テーブル

| 変更 | 詳細 |
|---|---|
| 列リネーム | `default_notification_minutes` → `default_notification_time` |
| 型変更 | `int NULL` → `time NULL` |

### 2-2. schedules テーブル

| 変更 | 詳細 |
|---|---|
| 列変更 | `date date NULL` → `date date NOT NULL` |
| 列リネーム | `notification_minutes` → `notification_time` |
| 型変更 | `int NULL` → `time NULL` |
| 列追加 | `created_at datetime2 NOT NULL DEFAULT GETUTCDATE()` |

### 2-3. colors テーブル（初期データ追加）

`#9E9E9E`（グレー）をシステム予約色として追加。「その他」ジャンル専用。
ユーザーの個人カラー・通常ジャンルカラーとして選択不可。

### 2-4. EF Core エンティティ変更

- `Genre.DefaultNotificationTime`: `TimeOnly?`
- `Schedule.NotificationTime`: `TimeOnly?`
- `Schedule.Date`: `DateOnly`（NULL→NOT NULL）
- `Schedule.CreatedAt`: `DateTime`（NOT NULL、INSERT時自動セット）

---

## 3. グループ作成時の自動生成（既存処理の拡張）

`POST /api/admin/groups` 実行時、以下を自動生成する（既存の重要事項ノートに追加）：

- `genres` テーブルに「その他」ジャンルを INSERT
  - `name = "その他"`
  - `color_id` = colors テーブルの `#9E9E9E` のID
  - `group_id` = 新規グループID
  - `is_active = true`, `is_deleted = false`

---

## 4. APIエンドポイント

### 4-1. GET /api/schedules

**クエリパラメータ:** `?from=YYYY-MM-DD&to=YYYY-MM-DD`

**取得対象:**
- 自分が作成した `visibility = private` のスケジュール
- 同グループの `visibility = group` のスケジュール
- 論理削除済みは除外

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "creatorId": 1,
      "date": "2026-06-10",
      "startTime": "09:00",
      "endTime": "10:00",
      "title": "朝会",
      "detail": null,
      "visibility": "group",
      "notificationTime": "08:45",
      "genre": {
        "id": 2,
        "name": "業務",
        "colorHex": "#3F51B5"
      }
    }
  ]
}
```

- `startTime` / `endTime` が null → 終日予定
- `genre` はジャンルが削除済みの場合 null

---

### 4-2. POST /api/schedules

**リクエスト:**
```json
{
  "date": "2026-06-10",
  "title": "朝会",
  "visibility": "group",
  "genreId": 1,
  "startTime": "09:00",
  "endTime": "10:00",
  "notificationTime": "08:45",
  "detail": null
}
```

**必須フィールド:** `date`, `title`, `visibility`, `genreId`, `notificationTime`
**任意フィールド:** `startTime`, `endTime`（null = 終日）, `detail`

**サーバー側自動セット:**
- `creatorId` = JWTの `userId`
- `groupId` = JWTの `groupId`（`visibility = group` 時のみ使用）

**スケジュール作成画面の初期値（フロント側）:**
- `genreId`: 「その他」ジャンルのID（`GET /api/genres` で取得した一覧から name==="その他" を初期選択）
- `visibility`: `group`
- `startTime`: `09:00`、`endTime`: `10:00`、`notificationTime`: `08:45`
- ジャンル選択時: `notificationTime` = ジャンルの `defaultNotificationTime`、`startTime` = その15分後、`endTime` = startTimeの1時間後

**レスポンス:** 作成したスケジュール（4-1と同形式）

---

### 4-3. GET /api/schedules/{id}

単件取得。4-1 と同形式。
他人の `private` スケジュールは 404 を返す。

---

### 4-4. PUT /api/schedules/{id}

作成者のみ編集可。リクエスト・レスポンスは POST と同形式。

---

### 4-5. DELETE /api/schedules/{id}

作成者のみ削除可。論理削除（`is_deleted = true`, `deleted_at = now`）。

**レスポンス:**
```json
{ "success": true }
```

---

### 4-6. GET /api/schedules/recent

自分が作成した直近5件（`created_at` 降順）。論理削除済みを除く。
日付の過去・未来は問わない。レスポンス形式は 4-1 と同じ。

---

## 5. アクセス制御

| 操作 | 条件 | レスポンス |
|---|---|---|
| GET 一覧 | 他人の private → 返さない | — |
| GET 単件 | 他人の private → 404 | `SCHEDULE_NOT_FOUND` |
| PUT | 作成者以外 → 403 | `SCHEDULE_FORBIDDEN` |
| DELETE | 作成者以外 → 403 | `SCHEDULE_FORBIDDEN` |

---

## 6. エラーコード

| コード | 条件 |
|---|---|
| `SCHEDULE_NOT_FOUND` | 存在しない、または閲覧権限がない |
| `SCHEDULE_FORBIDDEN` | 編集・削除権限がない |
| `SCHEDULE_INVALID` | バリデーションエラー（title空・dateなし・genreId不正など） |

---

## 7. ビジネスルール

- `visibility = group` のとき `groupId` はJWTの `groupId` から自動セット
- 論理削除済みスケジュールは全APIで非表示
- `genre` が後から削除された場合、レスポンスの `genre` は null
- `GET /api/schedules/recent` は `created_at` 降順 5件（日付問わず）

---

## 8. スコープ外

- Push通知の送信処理 → 最終フェーズ
- スケジュールの検索・絞り込み → 要件なし
- カレンダー画面（フロントエンド）→ 次ブランチで実装
