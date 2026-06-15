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
- 4 つのボトムシート: ジャンル選択 / 履歴 / 詳細メモ入力 / 通知時刻設定
- Visibility トグル（private ↔ group、インラインで切り替え）
- Set Time / All Day トグル
- `frontend/src/api/genres.ts` 新規作成
- `frontend/src/api/schedules.ts` に `createSchedule` / `getRecentSchedules` 追加
- ルーターへ `/schedule/new` ルート追加

### 含まない
- SCR-22（予定編集）
- ジャンル新規作成（既存ジャンルからの選択のみ）
- プッシュ通知の実装（NotificationTime の値を送信するだけ）
- SCR-23 の実装（保存後 `navigate('/schedule/<id>')` を呼ぶだけ）

---

## 3. 受入条件

1. `/schedule/new?date=2026-06-15` でアクセスすると SCR-21 が表示される
2. `?date=` が付いている場合はその日付が開始・終了日付のデフォルトになる。なければ今日
3. フォームはキーボード表示を考慮したコンパクトレイアウト。スクロールなしで全要素が表示できる
4. フッター（× ↺ ✓）は画面下端に固定。コンテンツエリアのみスクロール可
5. ジャンルボタンタップ → ジャンル選択ボトムシートが開く
6. ジャンルを選択するとボタンが選択ジャンルの色・名前で更新される
7. 🔔 通知時刻ボタンタップ → テンキー式ボトムシートが開き HH:mm を入力できる
8. 詳細メモボタンタップ → テキストエリアのボトムシートが開く
9. Set Time / All Day トグルで日時ブロック内の時刻部分の表示/非表示が切り替わる
10. Visibility アイコンタップで private ↔ group が切り替わり、アイコンで状態がわかる
11. ↺ タップ → 直近5件の履歴ボトムシートが開く
12. 履歴行タップ → タイトル・ジャンル・時刻・通知時刻をフォームに反映（日付は反映しない）
13. ✓ タップ → バリデーション後 `POST /api/schedules`、成功時 `navigate('/schedule/<id>')`
14. バリデーションエラー / API エラー → フォーム上にエラーメッセージ表示
15. × タップ → `history.back()`

---

## 4. 画面レイアウト

### 4-1. メインフォーム

キーボード表示時もスクロールなしで収まるよう、縦方向の余白を最小化する。

```
┌──────────────────────────────────┐
│ [           タイトル入力          ] │ ← input[type=text]
│                                   │
│ [● ジャンル名              ▼]     │ ← .genre-btn（未選択時はグレー）
│                                   │
│ [開始: MM/DD  HH:mm] [終了: MM/DD  HH:mm] │ ← 2 つの日時ブロック
│      [ Set Time ]  [ All Day ]    │ ← .time-toggle
│                                   │
│  🔔 [09:00]          [👥/🔒]       │ ← 通知ボタン + visibility トグル
│                                   │
│  [📝 詳細メモを追加… ]             │ ← 詳細モーダルを開くボタン
│                                   │
├──────────────────────────────────┤
│       ×         ↺         ✓     │ ← footer（固定）
└──────────────────────────────────┘
```

- タイトル: `input[type=text]`（インライン入力）
- 日付/時刻ブロック: `input[type=date]` + `input[type=time]`（ブラウザネイティブ）
- 通知・詳細は**ボタン**として表示し、タップでボトムシートを開く

### 4-2. ジャンル選択ボトムシート

```
┌──────────────────────────────────┐
│  ジャンルを選択                    │ ← タイトル行
│ ──────────────────────────────  │
│  ● 仕事                           │ ← 色サークル + 名前
│  ● プライベート                    │
│  ● 勉強                           │
└──────────────────────────────────┘（シート外タップでキャンセル）
```

- `GET /api/genres` で取得（シートを開くときに取得）
- 行タップ → 選択してシートを閉じる
- シート外タップ → キャンセル（選択変更なし）
- ジャンル 0 件 → 「ジャンルがまだ作成されていません」メッセージ表示

### 4-3. 通知時刻設定ボトムシート（テンキー式）

```
┌──────────────────────────────────┐
│         通知時刻を設定              │
│                                   │
│         [  09 : 30  ]             │ ← 入力中の時刻表示（4桁）
│                                   │
│    [1]   [2]   [3]               │
│    [4]   [5]   [6]               │
│    [7]   [8]   [9]               │
│   [00]   [0]   [⌫]               │
│                                   │
│              [ 決定 ]              │ ← 確定して閉じる
└──────────────────────────────────┘
```

入力ロジック:
- 4 桁バッファ `[H1, H2, M1, M2]` を左から順に埋める
- `[00]` → M1/M2 を 00 でセット
- `[⌫]` → 最後の桁を削除
- 表示: バッファが埋まるまでは `_` で未入力を示す（例: `0_:__` → `09:__`）
- 「決定」タップ: 4 桁が揃い、HH が 0〜23、MM が 0〜59 であれば確定

### 4-4. 詳細メモ入力ボトムシート

```
┌──────────────────────────────────┐
│  詳細メモ                          │
│ ┌──────────────────────────────┐ │
│ │ (テキストエリア, 自由入力)       │ │
│ └──────────────────────────────┘ │
│                        [ 完了 ]   │ ← 入力を確定して閉じる
└──────────────────────────────────┘
```

- シート内 textarea にフォーカス（シートが開くと自動フォーカス）
- 「完了」または シート外タップ → 入力内容を保存してシートを閉じる

### 4-5. 履歴ボトムシート（↺）

```
┌──────────────────────────────────┐
│  最近の予定                        │
│ ──────────────────────────────  │
│  ██ ミーティング          6/14 10:00 │ ← ジャンル色帯 + タイトル + 日時
│  ██ 定例                  6/13 14:00 │
│  ██ 勉強会                6/12 09:00 │
└──────────────────────────────────┘
```

- `GET /api/schedules/recent` でシートを開くときに取得（直近5件）
- 行タップ → title / genreId / genreName / genreColor / startTime / endTime / notificationTime をフォームに反映（日付は反映しない）
- シート外タップ → キャンセル

### 4-6. Visibility トグル（インライン）

| 状態 | アイコン | 送信値 |
|---|---|---|
| グループ公開（デフォルト） | 👥 | `"group"` |
| 自分のみ | 🔒 | `"private"` |

ボトムシートなし。タップするたびにその場で切り替わる。

### 4-7. Set Time / All Day

| 状態 | 時刻欄 | StartTime / EndTime |
|---|---|---|
| Set Time（デフォルト） | 表示 | 入力値（`"HH:mm"`） |
| All Day | 非表示 | `null` |

---

## 5. API

### 追加するフロントエンド API メソッド

#### `frontend/src/api/genres.ts`（新規作成）

```typescript
import { api } from './client';

export interface Genre {
  id:       number;
  name:     string;
  colorHex: string;
}

export const genres = {
  getGenres: () => api.get<Genre[]>('/genres'),
};
```

#### `frontend/src/api/schedules.ts` に追加

```typescript
export interface CreateSchedulePayload {
  date:             string;        // "YYYY-MM-DD"
  title:            string;
  visibility:       string;        // "private" | "group"
  genreId:          number;        // 0 は現状バックエンドで拒否（必須扱い）
  startTime:        string | null; // "HH:mm" or null
  endTime:          string | null; // "HH:mm" or null
  notificationTime: string;        // "HH:mm"
  detail:           string | null;
}

// schedules に追加
createSchedule: (payload: CreateSchedulePayload) =>
  api.post<Schedule>('/schedules', payload),

getRecentSchedules: () =>
  api.get<Schedule[]>('/schedules/recent'),
```

### フロントエンドバリデーション

| フィールド | ルール |
|---|---|
| タイトル | 空文字・空白のみ → 「タイトルを入力してください」 |
| ジャンル | genreId === 0 → 「ジャンルを選択してください」 |
| 通知時刻 | 4 桁未入力 → テンキーの「決定」を押せない |

---

## 6. ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 新規作成 | `frontend/src/pages/schedule/new/index.ts` | SCR-21 ページロジック・4 ボトムシート |
| 新規作成 | `frontend/src/pages/schedule/new/new.css` | SCR-21 スタイル |
| 新規作成 | `frontend/src/api/genres.ts` | ジャンル API クライアント |
| 修正 | `frontend/src/api/schedules.ts` | createSchedule / getRecentSchedules 追加 |
| 修正 | `frontend/src/utils/router.ts` | `/schedule/new` ルート追加 |

---

## 7. 状態管理（モジュール変数）

```typescript
let selectedGenreId:    number             = 0;
let selectedGenreName:  string             = '';
let selectedGenreColor: string             = '';
let visibility:         'private' | 'group' = 'group';
let isAllDay:           boolean            = false;
let detailText:         string             = '';
let notificationDigits: string             = '';   // 最大4桁, テンキーバッファ
```

---

## 8. 非目標・制約

- ジャンル 0 件の場合は「作成してください」メッセージを出すが、ジャンル作成機能は含まない
- `GenreId=0` は現状バックエンドで拒否（DB は NULL 許容だが controller が 0 を弾く）。今回は必須扱いにする
- All Day 時の開始/終了は `null` で送信
- SCR-23 は未実装のため、保存成功後の遷移先 `/schedule/<id>` は「画面が見つかりません」になる（SCR-23 実装後に解消）
- ボトムシートのスライドアニメーションは CSS transition で最低限

---

## 9. テスト方針（手動チェックリスト）

1. `/schedule/new?date=2026-06-15` → 日付が 6/15 でセットされている
2. `/schedule/new`（パラメータなし） → 今日の日付
3. ジャンルボタンタップ → ボトムシート表示 → 選択 → ボタン更新
4. ↺ タップ → 履歴ボトムシート → 行選択 → フォームに反映（日付以外）
5. All Day トグル → 時刻欄が消える / Set Time に戻すと再表示
6. Visibility タップ → 👥 → 🔒 → 👥 と切り替わる
7. 🔔 タップ → テンキーシート → 4 桁入力 → 決定 → ボタン表示が更新
8. 📝 タップ → 詳細シート → テキスト入力 → 完了 → ボタン表示が更新
9. タイトル空 + ✓ → エラーメッセージ
10. ジャンル未選択 + ✓ → エラーメッセージ
11. 全項目入力 + ✓ → POST 送信 → `/schedule/<id>` へ遷移
12. × → 前の画面に戻る
