# Colors テーブル 設計ドキュメント更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** colors テーブルの導入に合わせて、ER図とテーブル一覧ドキュメントを更新する

**Architecture:** `ER図.md` に colors テーブルを追加し、users・genres テーブルの color フィールドを FK 参照（`color_id INT FK`）に変更。`table1ran.md` にも反映。notes テーブルは変更しない。

**Tech Stack:** Mermaid ER diagram（ER図.md）、Markdown（table1ran.md、作業記録.md）

**Spec:** `docs/superpowers/specs/2026-06-05-colors-table-design.md`

---

### Task 1: ER図.md の更新

**Files:**
- Modify: `ER図.md`

- [ ] **Step 1: colors テーブルを erDiagram に追加**

`ER図.md` の `erDiagram` ブロック内、`users` テーブルの直前に追加：

```
    colors {
        int id PK "NOT NULL"
        char(7) hex_code "NOT NULL UNIQUE"
        nvarchar(20) display_name "NOT NULL"
        smallint sort_order "NOT NULL"
    }
```

- [ ] **Step 2: users テーブルの color フィールドを FK に変更**

`users` テーブル内の以下2行を変更：

変更前：
```
        char(7) personal_color "NOT NULL"
        char(7) theme_color "NOT NULL"
```

変更後：
```
        int personal_color_id FK "NOT NULL"
        int theme_color_id FK "NOT NULL"
```

- [ ] **Step 3: genres テーブルの color フィールドを FK に変更**

`genres` テーブル内の以下1行を変更：

変更前：
```
        char(7) color "NOT NULL"
```

変更後：
```
        int color_id FK "NOT NULL"
```

- [ ] **Step 4: リレーションシップを追加**

リレーションセクション（`users o{--|| groups : ""` の前）に以下を追加：

```
    users o{--|| colors : "personal_color_id"
    users o{--|| colors : "theme_color_id"
    genres o{--|| colors : "color_id"
```

- [ ] **Step 5: Mermaid プレビューで描画を確認**

VSCode の Mermaid プレビューなどで ER図 が正しく描画されることを確認。
colors テーブルから users・genres への矢印が3本引かれていること。

---

### Task 2: table1ran.md の更新

**Files:**
- Modify: `table1ran.md`

- [ ] **Step 1: colors テーブルのセクションを先頭に追加**

`# テーブル一覧` の直下（`## 認証・ユーザー管理` の前）に追加：

```markdown
## カラーパレット（R-06, R-07）

| テーブル | 主な項目 | 対応要件 |
|---|---|---|
| `colors` | id, hex_code, display_name, sort_order | R-06, R-07 |

> グローバル固定テーブル。マイグレーション時に20色のシードデータを投入。管理UIなし。  
> `personal_color_id`・`theme_color_id`（users）および `color_id`（genres）から参照される。
```

- [ ] **Step 2: users テーブルの主な項目を更新**

`users` 行の `personal_color, theme_color` を `personal_color_id, theme_color_id` に変更：

変更前：
```
| `users` | id, name, password_hash, personal_color, theme_color, role, group_id, is_active | R-01, R-07, R-09 |
```

変更後：
```
| `users` | id, name, password_hash, personal_color_id, theme_color_id, role, group_id, is_active | R-01, R-07, R-09 |
```

- [ ] **Step 3: genres テーブルの主な項目を更新**

`genres` 行の `color` を `color_id` に変更：

変更前：
```
| `genres` | id, name, color, default_notification_minutes, group_id | R-06, R-08 |
```

変更後：
```
| `genres` | id, name, color_id, default_notification_minutes, group_id | R-06, R-08 |
```

- [ ] **Step 4: genres セクションの注釈を更新**

変更前：
```
> `genres` はスケジュール専用。color はユーザーの personal_color と重複不可。
```

変更後：
```
> `genres` はスケジュール専用。color_id は同グループ内ユーザーの personal_color_id と重複不可（アプリ側で制御）。
```

---

### Task 3: 作業記録.md の更新

**Files:**
- Modify: `作業記録.md`

- [ ] **Step 1: colors テーブル設計の完了レコードを追加**

テーブル末尾（`|.  |.  |.  |.  |.  |` の前）に追加：

```markdown
| 06/05 | colors テーブル設計 | 完了 | ー | 仕様書: docs/superpowers/specs/2026-06-05-colors-table-design.md |
```

---

## 実装時への引き継ぎ事項

コーディングフェーズに入る際は、以下の追加計画が必要：

1. **DBマイグレーション** — `colors` テーブル作成 + 20色シードデータ投入、`users`・`genres` テーブルのカラム変更（`color CHAR(7)` → `color_id INT FK`）
2. **API** — カラー一覧取得エンドポイント、personal_color / genre.color 更新時の重複チェックロジック
3. **UI** — カラーピッカーコンポーネント（パレット表示・使用済み色グレーアウト）
