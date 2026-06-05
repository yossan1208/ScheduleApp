-- ScheduleApp Initial Schema
-- SQL Server 2022 / JST固定 / Japanese_CI_AS
-- 作成順: 依存関係のないテーブルから順に作成

-- ==================================================
-- 1. colors（依存なし）
-- ==================================================
CREATE TABLE colors (
    id           INT          IDENTITY(1,1) NOT NULL,
    hex_code     CHAR(7)      NOT NULL,
    display_name NVARCHAR(20) NOT NULL,
    sort_order   SMALLINT     NOT NULL,
    CONSTRAINT PK_colors         PRIMARY KEY (id),
    CONSTRAINT UQ_colors_hex_code UNIQUE (hex_code)
);

-- ==================================================
-- 2. groups（依存なし）
-- ==================================================
CREATE TABLE groups (
    id   INT           IDENTITY(1,1) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_groups PRIMARY KEY (id)
);

-- ==================================================
-- 3. users（colors, groups に依存）
-- ==================================================
CREATE TABLE users (
    id                  INT           IDENTITY(1,1) NOT NULL,
    login_id            VARCHAR(50)   NOT NULL,
    name                NVARCHAR(100) NOT NULL,
    password_hash       VARCHAR(255)  NOT NULL,
    personal_color_id   INT           NOT NULL,
    theme_color_id      INT           NOT NULL,
    role                SMALLINT      NOT NULL,
    group_id            INT           NOT NULL,
    is_active           BIT           NOT NULL DEFAULT 1,
    CONSTRAINT PK_users                PRIMARY KEY (id),
    CONSTRAINT UQ_users_login_id       UNIQUE (login_id),
    CONSTRAINT FK_users_personal_color FOREIGN KEY (personal_color_id) REFERENCES colors(id),
    CONSTRAINT FK_users_theme_color    FOREIGN KEY (theme_color_id)    REFERENCES colors(id),
    CONSTRAINT FK_users_group          FOREIGN KEY (group_id)           REFERENCES groups(id)
);

-- ==================================================
-- 4. sessions（users に依存）
-- ==================================================
CREATE TABLE sessions (
    id             INT          IDENTITY(1,1) NOT NULL,
    user_id        INT          NOT NULL,
    token          VARCHAR(512) NULL,
    expires_at     DATETIME2    NULL,
    last_active_at DATETIME2    NULL,
    CONSTRAINT PK_sessions      PRIMARY KEY (id),
    CONSTRAINT FK_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IX_sessions_user_id ON sessions(user_id);
CREATE INDEX IX_sessions_token   ON sessions(token);

-- ==================================================
-- 5. audit_logs（users に依存）
-- ==================================================
CREATE TABLE audit_logs (
    id          INT          IDENTITY(1,1) NOT NULL,
    user_id     INT          NULL,
    action      VARCHAR(50)  NULL,
    target_type VARCHAR(50)  NULL,
    target_id   BIGINT       NULL,
    created_at  DATETIME2    NULL,
    CONSTRAINT PK_audit_logs      PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IX_audit_logs_user_id ON audit_logs(user_id);

-- ==================================================
-- 6. genres（colors, groups に依存）
-- ==================================================
CREATE TABLE genres (
    id                           INT           IDENTITY(1,1) NOT NULL,
    name                         NVARCHAR(100) NOT NULL,
    color_id                     INT           NOT NULL,
    default_notification_minutes INT           NULL,
    group_id                     INT           NOT NULL,
    CONSTRAINT PK_genres        PRIMARY KEY (id),
    CONSTRAINT FK_genres_color  FOREIGN KEY (color_id)  REFERENCES colors(id),
    CONSTRAINT FK_genres_group  FOREIGN KEY (group_id)  REFERENCES groups(id)
);

CREATE INDEX IX_genres_group_id ON genres(group_id);

-- ==================================================
-- 7. schedules（users, groups, genres に依存）
-- ==================================================
CREATE TABLE schedules (
    id                   INT            IDENTITY(1,1) NOT NULL,
    creator_id           INT            NOT NULL,
    group_id             INT            NOT NULL,
    genre_id             INT            NULL,
    date                 DATE           NULL,
    start_time           TIME           NULL,
    end_time             TIME           NULL,
    title                NVARCHAR(200)  NULL,
    detail               NVARCHAR(MAX)  NULL,
    visibility           VARCHAR(10)    NULL,
    notification_minutes INT            NULL,
    CONSTRAINT PK_schedules        PRIMARY KEY (id),
    CONSTRAINT FK_schedules_creator FOREIGN KEY (creator_id) REFERENCES users(id),
    CONSTRAINT FK_schedules_group   FOREIGN KEY (group_id)   REFERENCES groups(id),
    CONSTRAINT FK_schedules_genre   FOREIGN KEY (genre_id)   REFERENCES genres(id)
);

CREATE INDEX IX_schedules_creator_id ON schedules(creator_id);
CREATE INDEX IX_schedules_group_id   ON schedules(group_id);
CREATE INDEX IX_schedules_date       ON schedules(date);

-- ==================================================
-- 8. notes（groups, users に依存）
-- ==================================================
CREATE TABLE notes (
    id         INT           IDENTITY(1,1) NOT NULL,
    name       NVARCHAR(200) NULL,
    color      CHAR(7)       NULL,
    group_id   INT           NULL,
    creator_id INT           NOT NULL,
    created_at DATETIME2     NULL,
    is_archived BIT          NOT NULL DEFAULT 0,
    updated_by INT           NULL,
    updated_at DATETIME2     NULL,
    CONSTRAINT PK_notes            PRIMARY KEY (id),
    CONSTRAINT FK_notes_group      FOREIGN KEY (group_id)   REFERENCES groups(id),
    CONSTRAINT FK_notes_creator    FOREIGN KEY (creator_id) REFERENCES users(id),
    CONSTRAINT FK_notes_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IX_notes_group_id ON notes(group_id);

-- ==================================================
-- 9. memos（notes, users に依存）
-- ==================================================
CREATE TABLE memos (
    id          INT           IDENTITY(1,1) NOT NULL,
    note_id     INT           NOT NULL,
    title       NVARCHAR(200) NULL,
    creator_id  INT           NULL,
    is_important BIT          NOT NULL DEFAULT 0,
    updated_by  INT           NULL,
    updated_at  DATETIME2     NULL,
    CONSTRAINT PK_memos            PRIMARY KEY (id),
    CONSTRAINT FK_memos_note       FOREIGN KEY (note_id)    REFERENCES notes(id),
    CONSTRAINT FK_memos_creator    FOREIGN KEY (creator_id) REFERENCES users(id),
    CONSTRAINT FK_memos_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IX_memos_note_id ON memos(note_id);

-- ==================================================
-- 10. memo_blocks（memos に依存）
-- ==================================================
CREATE TABLE memo_blocks (
    id         INT           IDENTITY(1,1) NOT NULL,
    memo_id    INT           NOT NULL,
    type       VARCHAR(20)   NULL,
    content    NVARCHAR(MAX) NULL,
    sort_order INT           NULL,
    CONSTRAINT PK_memo_blocks      PRIMARY KEY (id),
    CONSTRAINT FK_memo_blocks_memo FOREIGN KEY (memo_id) REFERENCES memos(id)
);

CREATE INDEX IX_memo_blocks_memo_id ON memo_blocks(memo_id);

-- ==================================================
-- 11. user_notification_settings（users, genres に依存）
-- ==================================================
CREATE TABLE user_notification_settings (
    id                        INT  IDENTITY(1,1) NOT NULL,
    user_id                   INT  NOT NULL,
    genre_id                  INT  NOT NULL,
    is_enabled                BIT  NOT NULL DEFAULT 1,
    custom_notification_minutes INT NULL,
    CONSTRAINT PK_user_notification_settings PRIMARY KEY (id),
    CONSTRAINT FK_uns_user  FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT FK_uns_genre FOREIGN KEY (genre_id) REFERENCES genres(id)
);

CREATE INDEX IX_uns_user_id  ON user_notification_settings(user_id);
CREATE INDEX IX_uns_genre_id ON user_notification_settings(genre_id);

-- ==================================================
-- Seed: colors（20色）
-- ==================================================
INSERT INTO colors (hex_code, display_name, sort_order) VALUES
('#fca5a5', N'レッド',       1),
('#fda4af', N'ローズ',       2),
('#f9a8d4', N'ピンク',       3),
('#fed7aa', N'ピーチ',       4),
('#fdba74', N'オレンジ',     5),
('#fde68a', N'アプリコット', 6),
('#fde047', N'イエロー',     7),
('#fcd34d', N'ゴールド',     8),
('#bef264', N'ライム',       9),
('#86efac', N'グリーン',    10),
('#6ee7b7', N'エメラルド',  11),
('#5eead4', N'ティール',    12),
('#99f6e4', N'ミント',      13),
('#7dd3fc', N'スカイ',      14),
('#93c5fd', N'ブルー',      15),
('#a5b4fc', N'インディゴ',  16),
('#c4b5fd', N'バイオレット',17),
('#94a3b8', N'スレート',    18),
('#64748b', N'グレー',      19),
('#475569', N'チャコール',  20);
