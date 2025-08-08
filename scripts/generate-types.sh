#!/bin/bash

# Supabase型定義生成スクリプト
# Supabaseの現在のデータベーススキーマから型定義を自動生成

echo "🔍 Supabaseから型定義を生成中..."

# 環境変数から接続情報を取得
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ エラー: NEXT_PUBLIC_SUPABASE_URLが設定されていません"
    echo "📝 .env.localファイルを確認してください"
    exit 1
fi

# プロジェクトIDを抽出
PROJECT_ID=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

echo "📦 プロジェクトID: $PROJECT_ID"

# Supabase CLIで型生成
npx supabase gen types typescript \
  --project-id "$PROJECT_ID" \
  --schema public \
  > app/types/database.generated.ts

if [ $? -eq 0 ]; then
    echo "✅ 型定義の生成が完了しました: app/types/database.generated.ts"
else
    echo "❌ 型定義の生成に失敗しました"
    echo "💡 ヒント: Supabase CLIがインストールされているか確認してください"
    echo "  npm install -g supabase"
    exit 1
fi

echo ""
echo "📋 生成された型定義の概要:"
echo "----------------------------"
grep "export interface" app/types/database.generated.ts | head -20
echo ""
echo "📝 次のステップ:"
echo "1. app/types/database.generated.tsを確認"
echo "2. 既存のコードで使用している型定義と比較"
echo "3. 必要に応じてコードを修正"