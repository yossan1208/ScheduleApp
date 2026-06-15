# SCR-21 予定新規作成 設計書

**作成日:** 2026-06-15
**ブランチ:** feature/FrontendSchedule

---

## 1. 目的・概要

予定を新規作成するフォーム画面（SCR-21）を実装する。  
タイトル・ジャンル・日時・通知時刻・公開範囲・詳細メモを入力し `POST /api/schedules` で登録する。  
登録後は SCR-23（予定詳細）へ遷移する。

---

## 2. スコープ

### 含む
- SCR-21 新規ページ（`/schedule/new?date=YYYY-MM-DD`）
- ジャンル選択ボトムドロワー（`GET /api/genres`）
- 履歴ボトムドロワー（`GET /api/schedules/recent`、直近5件）
- Visibility トグル（private ↔ group）
- Set Time / All Day トグル
- 詳細メモ テキストエリア
- `frontend/src/api/schedules.ts` に `createSchedule` / `getRecentSchedules` / `getGenres` 追加
- ルーターへ `/schedule/new` ルート追加

### 含まない
- SCR-22（予定編集）
- ジャンル新規作成（既存ジャンルからの選択のみ）
- プッシュ通知の実装（NotificationTime を送信するだけ）
- SCR-23 の実装（遷移先として `navigate('/schedule/<id>')` を呼ぶだけ）

---

## 3. 受入条件

1. `/schedule/new?date=2026-06-15` でアクセスすると SCR-21 が表示される
2. `?date=` が付いている場合はその日付が開始・終了日付のデフォルトになる。なければ今日
3. ジャンルボタンをタップするとボトムドロワーが開きジャンル一覧が表示される
4. ジャンルを選択するとボタンが選択ジャンルの色・名前で更新される
5. Set Time / All Day トグルで時刻入力欄の表示/非表示が切り替わる
6. Visibility アイコンをタップするたびに private ↔ group が切り替わり、アイコンで状態がわかる
7. 🔔 通知時刻をタップすると時刻ピッカーで変更できる
8. ↺ をタップすると直近5件の履歴ドロワーが開く
9. 履歴行を選択するとフォーム（タイトル・ジャンル・日時・通知時刻）に反映されドロワーが閉じる
10. ✓ をタップすると `POST /api/schedules` を呼び出す
11. 保存成功時 → `navigate('/schedule/<id>')` （SCR-23 遷移）
12. バリデーションエラー / API エラー時 → フォーム上にエラーメッセージ表示
13. × をタップすると `history.back()` で前の画面に戻る

---

## 4. 画面レイアウト

```
┌──────────────────────────────────┐
│ [           タイトル入力          ] │ ← input[type=text]
│                                   │
│ [● ジャンル名         ▼]          │ ← .genre-btn（未選択時はグレー）
│                                   │
│ [開始: MM/DD HH:mm] [終了: MM/DD HH:mm] │ ← 2つの日時ブロック
│ [ Set Time ]  [ All Day ]         │ ← .time-toggle
│                                   │
│ 🔔 [HH:mm]   [👤/🔒 private|group] │ ← 通知 + visibility
│                                   │
│ [詳細メモ (任意)…               ] │ ← textarea
│                                   │
├──────────────────────────────────┤
│       ×         ↺         ✓     │ ← footer
└──────────────────────────────────┘
```

### 4-1. ジャンル選択ドロワー（ボトムシート）

```
┌──────────────────────┐
│  ジャンルを選択        │
│ ─────────────────── │
│ ● 仕事                │ ← 各行: 色サークル + 名前
│ ● プライベート         │
│ ● 勉強                │
└──────────────────────┘
```

- `GET /api/genres` で取得したリストを表示
- 行タップ → ジャンルを選択してドロワーを閉じる
- ドロワー外タップ → キャンセル（選択変更なし）
- ジャンルが0件の場合 → 「ジャンルがまだ作成されていません」表示

### 4-2. 履歴ドロワー（↺）

```
┌──────────────────────────────┐
│  最近の予定                    │
│ ────────────────────────── │
│ ██ ミーティング  6/14 10:00   │ ← ジャンル色帯 + タイトル + 日時
│ ██ 定例         6/13 14:00   │
│ ██ 勉強会       6/12 09:00   │
└──────────────────────────────┘
```

- `GET /api/schedules/recent` で直近5件を取得（ページロード時はフェッチしない。ドロワーを開くときに取得）
- 行タップ → title / genreId / startTime / endTime / notificationTime をフォームに反映してドロワーを閉じる（日付は反映しない）
- ドロワー外タップ → キャンセル

### 4-3. Visibility トグル

| 状態 | アイコン | 送信値 |
|---|---|---|
| グループ公開（デフォルト） | 👥 | `"group"` |
| 自分のみ | 🔒 | `"private"` |

タップするたびに切り替わる。

### 4-4. Set Time / All Day

| 状態 | 時刻欄 | StartTime / EndTime |
|---|---|---|
| Set Time（デフォルト） | 表示 | 入力値（`"HH:mm"`） |
| All Day | 非表示 | `null` |

---

## 5. API

### 追加するフロントエンド API メソッド（`frontend/src/api/schedules.ts`）

```typescript
export interface CreateSchedulePayload {
  date:             string;        // "YYYY-MM-DD"
  title:            string;
  visibility:       string;        // "private" | "group"
  genreId:          number;        // 0 は現状バックエンドで拒否（要ジャンル選択）
  startTime:        string | null; // "HH:mm" or null
  endTime:          string | null; // "HH:mm" or null
  notificationTime: string;        // "HH:mm"
  detail:           string | null;
}

// schedules.ts に追加
createSchedule: (payload: CreateSchedulePayload) =>
  api.post<Schedule>('/schedules', payload),

getRecentSchedules: () =>
  api.get<Schedule[]>('/schedules/recent'),
```

ジャンル一覧取得は `frontend/src/api/genres.ts` として新規作成する:

```typescript
export interface Genre {
  id:       number;
  name:     string;
  colorHex: string;
}

export const genres = {
  getGenres: () => api.get<Genre[]>('/genres'),
};
```

### バリデーション（フロント側で事前チェック）

| フィールド | チェック内容 |
|---|---|
| タイトル | 空文字・空白のみ → エラーメッセージ表示 |
| ジャンル | genreId === 0 → 「ジャンルを選択してください」 |
| 通知時刻 | 空 → エラー |

---

## 6. ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 新規作成 | `frontend/src/pages/schedule/new/index.ts` | SCR-21 ページロジック |
| 新規作成 | `frontend/src/pages/schedule/new/new.css` | SCR-21 スタイル |
| 新規作成 | `frontend/src/api/genres.ts` | ジャンル API クライアント |
| 修正 | `frontend/src/api/schedules.ts` | createSchedule / getRecentSchedules 追加 |
| 修正 | `frontend/src/utils/router.ts` | `/schedule/new` ルート追加 |

---

## 7. 状態管理（モジュール変数）

```typescript
let selectedGenreId:   number      = 0;
let selectedGenreName: string      = '';
let selectedGenreColor:string      = '';
let visibility:        'private' | 'group' = 'group';
let isAllDay:          boolean     = false;
let mouseUpHandler:    ((e: MouseEvent) => void) | null = null;
```

---

## 8. 非目標・制約

- ジャンル0件の場合に「作成してください」メッセージを出すが、ジャンル作成機能は含まない
- `GenreId=0` は現状バックエンドで拒否（DB は NULL 許容だが controller が 0 を弾く）。今回は必須扱いにする
- All Day 時の開始/終了は `null` で送信
- SCR-23 は未実装のため、保存成功後の遷移先 `/schedule/<id>` は「画面が見つかりません」になる（SCR-23 実装後に解消）

---

## 9. テスト方針（手動チェックリスト）

1. `/schedule/new?date=2026-06-15` → 日付が 6/15 でセットされている
2. `/schedule/new`（パラメータなし） → 今日の日付
3. ジャンルボタンタップ → ドロワー表示 → 選択 → ボタン更新
4. ↺ タップ → 履歴ドロワー → 選択 → フォームに反映（日付以外）
5. All Day トグル → 時刻欄が消える / Set Time に戻すと再表示
6. Visibility タップ → アイコンが 👥 → 🔒 → 👥 と変わる
7. タイトル空 + ✓ → エラーメッセージ表示
8. ジャンル未選択 + ✓ → エラーメッセージ表示
9. 全項目入力 + ✓ → POST 送信 → `/schedule/<id>` へ遷移（現状404相当）
10. × → 前の画面に戻る
