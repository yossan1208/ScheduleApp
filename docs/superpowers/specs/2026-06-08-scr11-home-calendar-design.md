# SCR-11 月単位ホームカレンダー画面 設計書

**作成日:** 2026-06-08  
**ブランチ:** feature/FrontendSchedule  
**対応画面:** SCR-11（月単位カレンダー）

---

## 概要

ログイン後に表示されるメイン画面。月単位のカレンダーグリッドに予定を表示する。timepage風のダーク背景デザインにユーザーのテーマカラーを組み合わせる。

---

## 受入条件

- 当月のカレンダーグリッド（Sun〜Sat）が表示される
- `GET /api/schedules?from=&to=` で取得した予定をカラーバー形式でセルに表示する
- 上下スワイプ（タッチ・マウス両対応）で前月・翌月に切り替わる
- 日付セルをタップすると SCR-20 へ遷移する
- 歯車アイコン → SCR-40、`!` FAB → SCR-30、`+` FAB → SCR-21 へ遷移（未実装画面はプレースホルダー）
- Y/M/W タブは UI のみ（M が選択中）、タップ時の遷移なし

## 非目標

- SCR-10（週表示）・SCR-12（年表示）の実装
- PC向けレイアウト・月切替ボタン
- 予定の編集・削除操作
- プッシュ通知

---

## ファイル構成

```
frontend/src/
├── pages/
│   └── home/
│       ├── index.ts       ← mount(), 状態管理, イベント委任, APIコール
│       ├── calendar.ts    ← buildCalendarGrid(year, month, schedules) → HTMLElement
│       └── home.css       ← 画面専用スタイル
├── api/
│   └── schedules.ts       ← Schedule 型定義・GET /api/schedules 呼び出し
└── utils/
    └── router.ts          ← "/home" ルート追加
```

### 各ファイルの役割

| ファイル | 責務 |
|---|---|
| `index.ts` | year/month 状態保持、スワイプ検知、API呼び出し、カレンダー再描画 |
| `calendar.ts` | 受け取った年月・予定データからカレンダー HTML を生成して返す（副作用なし） |
| `home.css` | timepage ライクなダーク + テーマカラーのスタイル |
| `schedules.ts` | `GET /api/schedules` の型・API 関数 |

---

## HTML 構造

```
#app
└── .home-page
    ├── .home-header
    │   ├── button.icon-btn      (歯車アイコン → SCR-40)
    │   └── h2.month-label       ("2026年6月")
    ├── .calendar-wrapper        (スワイプ検知領域)
    │   └── .calendar-grid       (calendar.ts が生成)
    │       ├── .calendar-header (Sun Mon Tue Wed Thu Fri Sat)
    │       └── .calendar-cell × 35〜42
    │           ├── .cell-date   ("1", "2" ... 当月外はグレー)
    │           └── .schedule-bar × n (カラーバー + タイトル)
    ├── .view-tab-bar
    │   ├── button.tab-btn       ("Y")
    │   ├── button.tab-btn.active ("M")
    │   └── button.tab-btn       ("W")
    └── .fab-group
        ├── button.fab           (「!」→ SCR-30)
        └── button.fab           (「+」→ SCR-21)
```

---

## カラー設計

| 要素 | 値 |
|---|---|
| ページ背景 | `#1a1a1a` |
| テキスト（通常） | `#e0e0e0` |
| 日曜列テキスト | `#e57373`（赤系） |
| 土曜列テキスト | `#64b5f6`（青系） |
| 今日の日付 | テーマカラーの円でハイライト（`var(--theme-color)`） |
| FAB 背景（両方） | `var(--theme-color)` |
| FAB アイコン（両方） | `#f0f0f0`（オフホワイト） |

---

## 状態管理

`index.ts` が以下の状態を保持する：

```typescript
let currentYear: number   // 表示中の年
let currentMonth: number  // 表示中の月（0〜11）
let schedules: Schedule[] // 取得済みの予定データ
```

---

## データフロー

```
mount() 呼び出し
    ↓
currentYear/Month = 今月に初期化
    ↓
fetchSchedules(year, month)
    → GET /api/schedules?from=YYYY-MM-01&to=YYYY-MM-DD
    ↓
buildCalendarGrid(year, month, schedules) → HTMLElement
    ↓
カレンダー描画

スワイプ / マウスドラッグで月切替
    ↓
currentMonth ±1（年またぎ対応）
    ↓
fetchSchedules → buildCalendarGrid → 再描画
```

---

## 予定データ型（`api/schedules.ts`）

```typescript
interface Schedule {
  id: number
  title: string
  startAt: string      // ISO8601
  endAt: string
  genreColor: string   // "#FF8C00" など
  creatorName: string
}
```

予定表示: 左端にジャンルカラーのバー（4px幅）+ タイトルテキスト。セルに収まらない件数は「+n」で省略。

---

## インタラクション

### 月切替（スワイプ / マウスドラッグ）

タッチ・マウスの共通ロジックを1関数にまとめ、両方のイベントリスナーから呼び出す。

| イベント | タッチ | マウス |
|---|---|---|
| 開始 | `touchstart` | `mousedown` |
| 終了 | `touchend` | `mouseup` |

- 移動量 50px 以上で月切替
- 上方向（Y 減少）→ 翌月、下方向（Y 増加）→ 前月
- スワイプ中: `translateY` アニメーションで切替感を演出

### タップ / クリック

| 対象 | 動作 |
|---|---|
| 日付セル | `navigate('/day?date=YYYY-MM-DD')` → SCR-20 |
| 歯車ボタン | `navigate('/settings')` → SCR-40（プレースホルダー） |
| `!` FAB | `navigate('/notes')` → SCR-30（プレースホルダー） |
| `+` FAB | `navigate('/schedule/new')` → SCR-21（プレースホルダー） |
| Y / W タブ | 何もしない |

### ローディング・エラー

- API 呼び出し中: カレンダー領域にローディングアニメーション表示
- API 失敗時: 「予定を取得できませんでした」メッセージ表示（再試行ボタンなし、月切替で自動リトライ）

---

## 実装上の注意

- スワイプ操作は `touchstart/touchend` と `mousedown/mouseup` を必ず両方実装する（開発時のマウス操作のため）
- `calendar.ts` の `buildCalendarGrid` は副作用なしの純粋関数とする
- 当月外の日付セル（前月末・翌月初）はグレー表示し、タップしても遷移しない
- `router.ts` に `/home` ルートを追加し、`pages/home` を動的インポートする
