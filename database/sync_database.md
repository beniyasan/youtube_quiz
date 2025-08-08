# データベース同期ガイド

## 問題の概要

現在、プロジェクト内のSQLファイルと実際のデータベース構造に差分が存在します：

1. **テーブル名の不一致**
   - 旧: `quiz_rooms` → 新: `quiz_sessions`
   
2. **カラム名の不一致**
   - `host_id` → `host_user_id`
   - `room_id` → `session_id`

3. **新機能用のカラム不足**
   - 3段階難易度システム用のカラム
   - リアルタイム機能用のカラム

## 解決手順

### 1. バックアップの作成（重要！）

```bash
# Supabaseダッシュボードまたはpg_dumpを使用
pg_dump -h <your-supabase-host> -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. マイグレーションファイルの確認

以下のファイルが作成されています：
- `/database/migrations/008_sync_database_schema.sql`

このファイルは以下を実行します：
- 既存テーブルの安全なリネーム
- 新しいカラムの追加
- データの移行
- インデックスの作成
- RLSポリシーの再設定

### 3. マイグレーションの実行

#### 方法A: Supabaseダッシュボード経由

1. Supabaseダッシュボードにログイン
2. SQL Editorに移動
3. `008_sync_database_schema.sql`の内容をコピー＆ペースト
4. 実行（RUNボタンをクリック）

#### 方法B: Supabase CLIを使用

```bash
# Supabase CLIがインストールされていることを確認
supabase --version

# プロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーション実行
supabase db push
```

#### 方法C: psqlコマンドを使用

```bash
psql -h <your-supabase-host> \
     -U postgres \
     -d postgres \
     -f database/migrations/008_sync_database_schema.sql
```

### 4. 実行後の確認

以下のSQLで正しく移行されたことを確認：

```sql
-- テーブル構造の確認
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('quiz_sessions', 'quiz_participants', 'quiz_questions', 'quiz_answers')
ORDER BY table_name, ordinal_position;

-- RLSポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- インデックスの確認
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'quiz_%';
```

### 5. アプリケーションコードの更新

TypeScript型定義の再生成：

```bash
# Supabase型定義の自動生成
npx supabase gen types typescript --project-id <your-project-id> > app/types/database.generated.ts
```

### 6. トラブルシューティング

#### エラー: "relation already exists"
- 既にテーブルが存在する場合は、マイグレーションファイルのIF NOT EXISTS句により安全にスキップされます

#### エラー: "permission denied"
- Supabaseダッシュボードで実行するか、適切な権限を持つユーザーで実行してください

#### データの不整合
- バックアップから復元し、マイグレーションファイルを調整してから再実行

## 注意事項

⚠️ **本番環境での実行前に必ずステージング環境でテストしてください**

⚠️ **実行前に必ずデータベースのバックアップを取得してください**

⚠️ **既存のセッションがある場合は、メンテナンスウィンドウを設けることを推奨**

## 差分の詳細

### 変更されるテーブル構造

| 旧構造 | 新構造 | 変更内容 |
|--------|--------|----------|
| quiz_rooms | quiz_sessions | テーブル名変更 |
| host_id | host_user_id | カラム名変更 |
| room_id | session_id | カラム名変更 |
| - | stage_when_answered | 新規追加（段階記録） |
| - | points_awarded | 新規追加（得点記録） |
| - | audio_start_time | 新規追加（音声開始時間） |
| - | video_start_time | 新規追加（映像開始時間） |

## 次のステップ

1. ✅ データベースマイグレーション実行
2. ✅ TypeScript型定義の更新
3. ⬜ アプリケーションコードのテスト
4. ⬜ リアルタイム機能のテスト
5. ⬜ 本番環境への適用計画策定