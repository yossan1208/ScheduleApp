# colors テーブル設計

## 概要

色をコード直接入力ではなく、あらかじめ定義されたパレットから選択させるための `colors` テーブルを導入する。
`personal_color`・`theme_color`・`genre.color` を対象とし、`notes.color` は要件が「制限なし」のため対象外。

---

## 決定事項

| 項目 | 決定内容 |
|---|---|
| 適用フィールド | `users.personal_color`、`users.theme_color`、`genres.color` |
| 非対象フィールド | `notes.color`（自由入力のまま） |
| 管理方式 | 固定シードデータ（管理UIなし） |
| 色数 | 20色 |
| 参照方式 | FK（`color_id INT FK → colors.id`） |

---

## colors テーブル定義

```sql
colors {
    int id PK "NOT NULL"
    char(7) hex_code "NOT NULL UNIQUE"
    nvarchar(20) display_name "NOT NULL"
    smallint sort_order "NOT NULL"
}
```

グローバルテーブル。全グループ共通。マイグレーション時にシードデータを投入。

---

## ER図への変更

### users テーブル

| 変更前 | 変更後 |
|---|---|
| `char(7) personal_color` | `int personal_color_id FK → colors.id` |
| `char(7) theme_color` | `int theme_color_id FK → colors.id` |

### genres テーブル

| 変更前 | 変更後 |
|---|---|
| `char(7) color` | `int color_id FK → colors.id` |

### notes テーブル

変更なし。`char(7) color` のまま（自由入力）。

---

## シードデータ（20色）

| sort_order | display_name | hex_code |
|---|---|---|
| 1 | レッド | `#fca5a5` |
| 2 | ローズ | `#fda4af` |
| 3 | ピンク | `#f9a8d4` |
| 4 | ピーチ | `#fed7aa` |
| 5 | オレンジ | `#fdba74` |
| 6 | アプリコット | `#fde68a` |
| 7 | イエロー | `#fde047` |
| 8 | ゴールド | `#fcd34d` |
| 9 | ライム | `#bef264` |
| 10 | グリーン | `#86efac` |
| 11 | エメラルド | `#6ee7b7` |
| 12 | ティール | `#5eead4` |
| 13 | ミント | `#99f6e4` |
| 14 | スカイ | `#7dd3fc` |
| 15 | ブルー | `#93c5fd` |
| 16 | インディゴ | `#a5b4fc` |
| 17 | バイオレット | `#c4b5fd` |
| 18 | スレート | `#94a3b8` |
| 19 | グレー | `#64748b` |
| 20 | チャコール | `#475569` |

---

## 重複チェックロジック（アプリ側）

色の一意性制約（R-06）はアプリケーション層で担保する。DBのUNIQUE制約では同グループ内のみの制限を表現できないため。

### personal_color 設定時

使用不可として除外する色：
- 同グループ内の **他ユーザー** の `personal_color_id`
- 同グループ内の **全ジャンル** の `color_id`

### genre.color 設定時

使用不可として除外する色：
- 同グループ内の **全ユーザー** の `personal_color_id`
- 同グループ内の **他ジャンル** の `color_id`

### theme_color 設定時

制約なし。全20色から自由に選択可能。

---

## 影響範囲

- ER図（`ER図.md`）の更新が必要
- テーブル一覧（`table1ran.md`）への `colors` 追加が必要
- `users`・`genres` テーブルのカラム定義変更
