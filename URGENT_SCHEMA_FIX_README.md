# 🚨 緊急：データベーススキーマ修正が必要

## 発見された重大な問題

Supabaseスキーマ分析により、以下の**重大な不整合**が発見されました：

### 1. 二重カラム問題（緊急対応必要）

| テーブル | 問題 | 現状 |
|----------|------|------|
| `quiz_participants` | `room_id` (NOT NULL) と `session_id` (NULLABLE) が**両方存在** | 外部キー制約は `session_id` にあるが、データは `room_id` に入っている |
| `quiz_questions` | `room_id` (NULLABLE) と `session_id` (NOT NULL) が**両方存在** | データの整合性が不明 |

### 2. RLS設定問題

| テーブル | RLS状態 | 問題 |
|----------|---------|------|
| `quiz_sessions` | **無効** | セキュリティリスク |
| `quiz_participants` | **無効** | セキュリティリスク |

## 🔧 修正手順

### ステップ1: 【緊急】データベース修正

```bash
# Supabase SQL Editorで以下のファイルを実行
# database/migrations/009_fix_column_duplication.sql
```

### ステップ2: ローカルコードの調整

現在のローカルコードは一部 `session_id` に修正済みですが、Supabaseの二重カラムに対応する必要があります。

## 修正内容の詳細

### データベース修正 (`009_fix_column_duplication.sql`)

1. **`quiz_participants`テーブル**:
   - `session_id` にデータを移行
   - `room_id` カラムを削除
   - `session_id` を NOT NULL に変更

2. **`quiz_questions`テーブル**:
   - `room_id` カラムを削除
   - `session_id` のみ保持

3. **`quiz_answers`テーブル**:
   - `session_id` カラムを追加（効率化のため）
   - 外部キー制約を追加

4. **RLS設定**:
   - `quiz_sessions`, `quiz_participants` のRLSを有効化
   - 適切なポリシーを設定

### ローカルコード調整

現在のコードの一部に残る不整合を修正：

```typescript
// 修正済み（正しい）
participant.session_id

// 修正が必要（古い形式）
participant.room_id
```

## 実行優先度

### 🔴 **最高優先度**（即座に実行）
1. `009_fix_column_duplication.sql` の実行
2. アプリケーションの動作確認

### 🟡 **高優先度**（修正後に実行）
3. TypeScript型定義の再生成
4. 残存する `room_id` 参照の修正

## 修正後の確認項目

- [ ] `quiz_participants` テーブルに `room_id` カラムが存在しない
- [ ] `quiz_questions` テーブルに `room_id` カラムが存在しない  
- [ ] `quiz_sessions`, `quiz_participants` のRLSが有効
- [ ] 外部キー制約が正しく設定されている
- [ ] アプリケーションが正常動作する

## リスク評価

- **データ損失リスク**: 低（バックアップ推奨）
- **ダウンタイムリスク**: 中（メンテナンスウィンドウ推奨）
- **機能影響**: 高（修正しないと正常動作しない）

## 次のアクション

1. **すぐに**: `009_fix_column_duplication.sql` をSupabase SQL Editorで実行
2. **確認**: スキーマが正しく修正されたか確認
3. **テスト**: アプリケーションの動作テスト
4. **報告**: 修正完了の報告