# SCR-23 ボトムシート化 Design Spec

**Date:** 2026-06-20
**Screen:** SCR-23 予定詳細（ボトムシート化）
**Status:** Approved

---

## 概要

SCR-23（予定詳細）をスタンドアロンページから廃止し、SCR-20（1日表示）の上にボトムシートとして表示する。URL は `/schedule/:id` を維持し、ブラウザ戻る / 下スワイプでシートを閉じる。

---

## 受入条件

1. SCR-20 で予定をタップ → シートが下からアニメーションしながら開く。URL が `/schedule/:id` になる
2. シートを 80px 以上下にドラッグして離す → シートが閉じる。URL が `/day?date=...` に戻る
3. ブラウザ戻るボタン → シートが閉じる（URL が `/day?date=...` に戻る）
4. オーバーレイ（シート外の暗い領域）タップ → シートが閉じる
5. シート内 ✏️ タップ → シートを閉じて `/schedule/:id/edit`（SCR-22）へ遷移
6. SCR-21 保存後 → `navigate('/schedule/:id', replace=true)` → day ページがマウントされ自動でシートが開く
7. SCR-22 更新後（↻） → 同上（`navigate('/schedule/:id', replace=true)`）
8. SCR-22 キャンセル（✕） → `navigate('/day?date=<日付>', replace=true)`（シートなし）
9. `/schedule/:id` を直接ブラウザで開いた場合 → そのスケジュールの日付の day ページが開き、シートが自動表示される
10. 旧 SCR-23 ページ（`detail/`）を削除

---

## 非目標

- SCR-10（週）/ SCR-11（月）からの SCR-23 遷移（遷移なし、変更不要）
- シートの半開き状態（全開 / 全閉のみ）
- シートのコンテンツ変更（現行 SCR-23 と同内容を維持）

---

## ルーター変更

### `/schedule/:id` を day ページにリダイレクト

```typescript
// router.ts — Before
{ pattern: /^\/schedule\/\d+$/, loader: () => import('../pages/schedule/detail') }

// After
{ pattern: /^\/schedule\/\d+$/, loader: () => import('../pages/day') }
```

`/schedule/:id/edit` は変更なし（edit ページを維持）。

### popstate フック機構を追加

```typescript
let popstateHook: ((path: string) => boolean) | null = null;

export function registerPopstateHook(hook: (path: string) => boolean): void {
  popstateHook = hook;
}
export function unregisterPopstateHook(): void {
  popstateHook = null;
}
```

`initRouter` の popstate listener を以下に変更：

```typescript
window.addEventListener('popstate', () => {
  const path = location.pathname + location.search;
  if (popstateHook && popstateHook(path)) return;
  navigate(path, true);
});
```

---

## Day ページ変更

### mount() の URL 判定

```typescript
const pathname  = location.pathname;
const sheetMatch = pathname.match(/^\/schedule\/(\d+)$/);
const dateParam  = new URLSearchParams(location.search).get('date');
```

| 条件 | 挙動 |
|---|---|
| `sheetMatch` あり | スケジュール ID で API 取得 → 日付を得て day ビューをレンダリング → シートを開く |
| `dateParam` あり | 通常の day ビュー |
| どちらもなし | `/home` にリダイレクト |

### popstate フック登録

day ページの mount() で登録し、day ページが DOM から消えたときに自己解除：

```typescript
registerPopstateHook((path: string) => {
  if (!document.querySelector('.day-page')) {
    unregisterPopstateHook();
    return false;
  }
  const m = path.match(/^\/schedule\/(\d+)/);
  if (m) {
    openScheduleSheet(parseInt(m[1], 10));
    return true;
  }
  if (path.startsWith('/day')) {
    closeScheduleSheet();
    return true;
  }
  return false; // /home, /week など → ルーターに任せる
});
```

### 予定タップ（SCR-20 内部処理）

ルーターの `navigate()` を使わず、直接 history を操作してシートを開く：

```typescript
// Before
navigate(`/schedule/${card.dataset.id}`);

// After
history.pushState(null, '', `/schedule/${card.dataset.id}`);
openScheduleSheet(parseInt(card.dataset.id!, 10));
```

---

## シート UI 構成

```
┌──────────────────────────────────────┐  ← オーバーレイ rgba(0,0,0,0.4)（タップで閉じる）
│  ┌──────────────────────────────┐    │
│  │  ─── (drag handle)          │    │
│  │                               │    │
│  │  [タイトル]              ✏️  │    │
│  │  時刻                         │    │
│  │  日付                         │    │
│  │  [ジャンルバッジ]              │    │
│  │  🔔 通知時刻                  │    │
│  │  With: 自分 / 他のメンバー     │    │
│  │  メモ（あれば）                │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

- **背景色**: `var(--theme-color, #1a1a1a)`（現行 detail.css のカラー踏襲）
- **Drag handle**: 幅 40px / 高さ 4px / border-radius 2px / `rgba(255,255,255,0.3)`
- **オーバーレイ**: `rgba(0,0,0,0.4)`、z-index はナビゲーション + 1
- **シートの最大高さ**: `80dvh`、はみ出しはスクロール

---

## スワイプクローズ仕様

| イベント | 処理 |
|---|---|
| `touchstart` / `mousedown` | 開始 Y 座標を記録 |
| `touchmove` / `mousemove` | 下方向のみ `translateY` を追随（上方向は無視） |
| `touchend` / `mouseup` | 移動量 ≥ 80px → シートを閉じる / < 80px → 元の位置に戻す（`transition: transform 0.2s ease`） |

**シートを閉じる処理**:
```typescript
function closeScheduleSheet(): void {
  // アニメーション（translateY → 100%）
  // overlay を非表示
  history.back(); // URL を /day?date=... に戻す
}
```

---

## 変更ファイル一覧

| 操作 | パス | 変更内容 |
|---|---|---|
| 修正 | `frontend/src/utils/router.ts` | popstate フック追加、`/schedule/:id` を day ページへ |
| 修正 | `frontend/src/pages/day/index.ts` | シート HTML / 開閉ロジック / スワイプ / popstate フック登録 |
| 修正 | `frontend/src/pages/day/day.css` | シート・オーバーレイ CSS 追加 |
| 修正 | `frontend/src/pages/schedule/new/index.ts` | 保存後 `navigate('/schedule/${id}', true)` に変更 |
| 修正 | `frontend/src/pages/schedule/edit/index.ts` | 更新後 `navigate('/schedule/${id}', true)`、キャンセル `navigate('/day?date=...', true)` に変更 |
| 削除 | `frontend/src/pages/schedule/detail/index.ts` | 旧 SCR-23 ページ |
| 削除 | `frontend/src/pages/schedule/detail/detail.css` | 旧 SCR-23 スタイル |

---

## 遷移後の history スタック例

| シナリオ | history の状態 |
|---|---|
| SCR-20 → 予定タップ → シート閉じる | `/day?date=...` → `/schedule/123` → (back) `/day?date=...` |
| SCR-21 保存後 → シート閉じる | `/schedule/new?date=...` → (replace) `/schedule/123` → (back) `/schedule/new?date=...` |
| SCR-22 更新後 → シート閉じる | `/schedule/123/edit` → (replace) `/schedule/123` → (back) 前のページ |
| SCR-22 キャンセル | `/schedule/123/edit` → (replace) `/day?date=...`（シートなし） |

---

## エラーハンドリング

| ケース | 挙動 |
|---|---|
| `/schedule/:id` でスケジュールが見つからない（404） | シートを開かず、day ビューをそのまま表示 |
| API エラー | シートに「取得に失敗しました」を表示 |

---

## テスト方針（手動 E2E）

1. SCR-20 予定タップ → シートが下からアニメーションで開く、URL が `/schedule/:id`
2. 下スワイプ 80px 以上 → シートが閉じる、URL が `/day?date=...`
3. 下スワイプ 80px 未満 → 元の位置に戻る（閉じない）
4. オーバーレイタップ → シートが閉じる
5. ブラウザ戻る → シートが閉じる
6. ✏️ → SCR-22 に遷移
7. SCR-21 保存後 → シートが下から開く
8. SCR-22 更新後 → シートが下から開く
9. SCR-22 キャンセル → SCR-20（シートなし）
10. `/schedule/:id` 直接アクセス → day ビュー + シートが開く
