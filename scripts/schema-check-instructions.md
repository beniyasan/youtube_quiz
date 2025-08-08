# Supabaseスキーマ分析手順

## 1. 基本的な実行方法

### Supabaseダッシュボード経由（推奨）

1. **Supabaseダッシュボード**にログイン
2. **SQL Editor**に移動
3. `analyze-supabase-schema.sql`の内容をコピー＆ペースト
4. **Run**ボタンで実行

### psqlコマンド経由

```bash
# 環境変数設定
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# SQLファイルを実行
psql $SUPABASE_DB_URL -f scripts/analyze-supabase-schema.sql
```

## 2. 各クエリの説明と期待する結果

### クエリ1: テーブル一覧
```sql
-- 期待結果例:
-- quiz_sessions, quiz_participants, quiz_questions, quiz_answers
```

### クエリ2: カラム詳細
```sql
-- 期待結果例:
-- quiz_sessions | id           | uuid    | NO  | gen_random_uuid()
-- quiz_sessions | host_user_id | uuid    | NO  | 
-- quiz_sessions | room_code    | varchar | NO  |
```

### クエリ3: 外部キー制約
```sql
-- 期待結果例:
-- quiz_participants | session_id | quiz_sessions | id
-- quiz_questions    | session_id | quiz_sessions | id
```

## 3. 重要な確認ポイント

### ✅ 必須テーブルの存在確認
- [ ] `quiz_sessions` テーブル
- [ ] `quiz_participants` テーブル  
- [ ] `quiz_questions` テーブル
- [ ] `quiz_answers` テーブル
- [ ] `playlists` テーブル
- [ ] `youtube_videos` テーブル

### ✅ カラム名の確認
- [ ] `quiz_sessions.host_user_id` (not `host_id`)
- [ ] `quiz_participants.session_id` (not `room_id`)
- [ ] `quiz_sessions.room_code` (6文字のコード)

### ✅ 外部キー制約の確認
- [ ] `quiz_participants.session_id` → `quiz_sessions.id`
- [ ] `quiz_questions.session_id` → `quiz_sessions.id`
- [ ] `quiz_answers.question_id` → `quiz_questions.id`

### ✅ RLSポリシーの確認
- [ ] 各テーブルでRLSが有効
- [ ] 適切な読み取り/書き込み権限

## 4. 問題があった場合の対処

### ケース1: テーブルが存在しない
```bash
# 初期マイグレーションを実行
psql $SUPABASE_DB_URL -f database/migrations/001_create_quiz_tables.sql
```

### ケース2: カラム名が古い（room_id, host_idなど）
```bash
# スキーマ同期マイグレーションを実行
psql $SUPABASE_DB_URL -f database/migrations/008_sync_database_schema.sql
```

### ケース3: RLSポリシーが無効
```sql
-- 手動でRLSを有効化
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
-- 他のテーブルも同様に...
```

## 5. 分析結果の保存

```bash
# 結果をファイルに保存
psql $SUPABASE_DB_URL -f scripts/analyze-supabase-schema.sql > schema_analysis_$(date +%Y%m%d_%H%M%S).txt
```

## 6. よくある問題と解決策

| 問題 | 症状 | 解決策 |
|------|------|--------|
| テーブル不存在 | `relation "quiz_sessions" does not exist` | 初期マイグレーション実行 |
| カラム不存在 | `column "host_user_id" does not exist` | スキーマ同期マイグレーション |
| 権限エラー | `permission denied` | RLSポリシー確認・修正 |
| 接続エラー | `connection refused` | 接続情報・ネットワーク確認 |

## 7. 次のステップ

スキーマ分析後：

1. **差分確認**: ローカルコードとの比較
2. **型定義生成**: `npx supabase gen types typescript`
3. **テストデータ作成**: サンプルデータでテスト
4. **機能テスト**: 実際のアプリケーション動作確認