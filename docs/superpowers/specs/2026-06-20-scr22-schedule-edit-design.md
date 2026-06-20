# SCR-22 予定編集 Design Spec

**Date:** 2026-06-20  
**Screen:** SCR-22 予定編集  
**Status:** Approved

---

## 概要

SCR-23（予定詳細）の ✏️ ボタンから遷移する予定編集画面。SCR-21 のフォームUIを流用し、既存の予定値をプリセットして表示する。保存（PUT）・削除（DELETE）の両操作を担う。

## 受入条件

1. `/schedule/:id/edit` でアクセスできる
2. 既存の予定データ（タイトル・ジャンル・日付・開始/終了時刻・通知・公開範囲・詳細メモ）がフォームに初期表示される
3. ↻ ボタンで `PUT /api/schedules/{id}` を呼び出し、成功後 `/schedule/:id` に遷移する
4. 🗑 ボタンで確認後 `DELETE /api/schedules/{id}` を呼び出し、成功後 `/day?date=<予定の日付>` に遷移する
5. ✕ ボタンで `history.back()` する
6. バリデーション：タイトル空欄・ジャンル未選択はエラー表示（SCR-21 と同じ）
7. 履歴シート（↺）は存在しない

## 非目標

- 作成者以外による編集（バックエンドが SCHEDULE_FORBIDDEN を返すためフロントは対応不要）
- 削除確認モーダルのカスタムデザイン（`window.confirm` で代用）
- オフライン対応

## URL・ルーティング

| パターン | ページ |
|---|---|
| `/schedule/:id/edit` | SCR-22（本画面）|

`router.ts` の `dynamicRoutes` に `/^\/schedule\/\d+\/edit$/` を追加。`/schedule/:id` より**先**に置くこと（より具体的なパターン優先）。

## UI 構成

SCR-21 と同一レイアウト・同一ボトムシート（ジャンル選択・通知時刻・詳細メモ）を使用。

### フッターボタン（差分のみ）

| 位置 | SCR-21 | SCR-22 |
|---|---|---|
| 左 | ✕ キャンセル | ✕ キャンセル（同じ）|
| 中 | ↺ 履歴 | 🗑 削除 |
| 右 FAB | ✓ 保存 | ↻ 更新 |

### プリセット仕様

マウント時に `GET /api/schedules/:id` を呼び出し、以下の順で値を反映する：

| フィールド | 反映先 |
|---|---|
| `title` | `#new-title` input |
| `genre` | `#genre-dot` 色・`#genre-label` テキスト・`selectedGenreId` 変数 |
| `date` | `#event-date` input |
| `startTime` | `#start-time` input（null なら All Day モードに切替）|
| `endTime` | `#end-time` input |
| `notificationTime` | `#btn-notif` ラベル・`notificationTime` 変数 |
| `visibility` | `#btn-visibility` ラベル・`visibility` 変数 |
| `detail` | `detailText` 変数・`#btn-detail` ラベル |

### 削除フロー

```
🗑 クリック
  → window.confirm('この予定を削除しますか？')
  → キャンセル: 何もしない
  → OK: DELETE /api/schedules/{id}
      → 成功: navigate('/day?date=<s.date>')
      → 失敗: エラーメッセージを #new-error に表示
```

### 更新フロー

```
↻ クリック
  → バリデーション（タイトル・ジャンル）
  → PUT /api/schedules/{id} with UpdateSchedulePayload
      → 成功: navigate('/schedule/:id')
      → 失敗: #new-error にエラーメッセージ表示
```

## ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 修正 | `frontend/src/api/schedules.ts` | `UpdateSchedulePayload` 型 + `updateSchedule(id, payload)` 追加 |
| 修正 | `frontend/src/utils/router.ts` | `/^\/schedule\/\d+\/edit$/` を dynamicRoutes 先頭に追加 |
| 新規 | `frontend/src/pages/schedule/edit/edit.css` | `new.css` を import し削除ボタン差分を追記 |
| 新規 | `frontend/src/pages/schedule/edit/index.ts` | SCR-22 ページロジック |
| 修正 | `frontend/src/pages/schedule/detail/index.ts` | ✏️ ボタンクリック → `navigate('/schedule/${id}/edit')` |

## API

### PUT /api/schedules/{id}

リクエストボディ：`CreateSchedulePayload` と同形（`UpdateSchedulePayload` として型エイリアス）

```typescript
export type UpdateSchedulePayload = CreateSchedulePayload;
```

レスポンス：`ApiEnvelope<Schedule>`

エラーコード：
- `SCHEDULE_NOT_FOUND` → 404
- `SCHEDULE_FORBIDDEN` → 403（作成者以外の操作）

### DELETE /api/schedules/{id}

既存の `schedules.deleteSchedule(id)` を使用（追加実装不要）。

## CSS 戦略

`edit/index.ts` で `import '../new/new.css'` し、`edit.css` では差分のみを定義：

```css
/* 削除ボタン */
.edit-delete-btn { ... }
```

フッターの `.new-history-btn` に相当するクラスを `.edit-delete-btn` に置き換える。

## エラーハンドリング

| ケース | 挙動 |
|---|---|
| プリセット時に 404 | 「予定が見つかりません」を表示してフォームをレンダリングしない |
| PUT 失敗 | `#new-error` にエラーメッセージ表示 |
| DELETE 失敗 | `#new-error` にエラーメッセージ表示 |
| タイトル空欄・ジャンル未選択 | SCR-21 と同様に `#new-error` に表示 |

## テスト方針

手動 E2E（Playwright）で以下を確認：
1. SCR-23 → ✏️ → SCR-22 遷移・プリセット表示
2. 全フィールドを変更して ↻ → SCR-23 で更新を確認
3. 🗑 → confirm → SCR-20 遷移・該当予定が消えていることを確認
4. 🗑 → confirm キャンセル → フォームのまま残ること
5. タイトル空欄・ジャンル未選択でのエラー表示
