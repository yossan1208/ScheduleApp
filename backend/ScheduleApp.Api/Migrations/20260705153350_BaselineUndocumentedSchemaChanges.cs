using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScheduleApp.Api.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// notes.IsDeleted/DeletedAt、memo_blocks の FK/インデックス、users.Language は
    /// 過去のスキーマ変更で実DBには反映済みだが、EF移行履歴には記録されていなかった。
    /// このDBでは既に存在するため各操作をガードし、フレッシュな環境でのみ実際に作成する。
    /// </remarks>
    public partial class BaselineUndocumentedSchemaChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('notes', 'IsDeleted') IS NULL
    ALTER TABLE notes ADD IsDeleted bit NOT NULL DEFAULT 0;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('notes', 'DeletedAt') IS NULL
    ALTER TABLE notes ADD DeletedAt datetime2 NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('users', 'language') IS NULL
    ALTER TABLE users ADD language nvarchar(10) NOT NULL DEFAULT 'ja';
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_memo_blocks_MemoId' AND object_id = OBJECT_ID('memo_blocks'))
    CREATE INDEX IX_memo_blocks_MemoId ON memo_blocks (MemoId);
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_memo_blocks_memos_MemoId')
    ALTER TABLE memo_blocks ADD CONSTRAINT FK_memo_blocks_memos_MemoId FOREIGN KEY (MemoId) REFERENCES memos(Id) ON DELETE CASCADE;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_memo_blocks_memos_MemoId')
    ALTER TABLE memo_blocks DROP CONSTRAINT FK_memo_blocks_memos_MemoId;
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_memo_blocks_MemoId' AND object_id = OBJECT_ID('memo_blocks'))
    DROP INDEX IX_memo_blocks_MemoId ON memo_blocks;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('users', 'language') IS NOT NULL
    ALTER TABLE users DROP COLUMN language;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('notes', 'DeletedAt') IS NOT NULL
    ALTER TABLE notes DROP COLUMN DeletedAt;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('notes', 'IsDeleted') IS NOT NULL
    ALTER TABLE notes DROP COLUMN IsDeleted;
");
        }
    }
}
