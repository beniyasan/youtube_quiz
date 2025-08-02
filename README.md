# YouTube Quiz App

YouTubeプレイリストからリアルタイムクイズを楽しむWebアプリケーション

## 技術スタック

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (認証、データベース、リアルタイム通信)
- **Hosting**: Vercel
- **API**: YouTube Data API v3

## 機能

- ユーザー認証（会員登録・ログイン）
- YouTubeプレイリスト管理
- リアルタイムマルチプレイヤークイズ
- スコアリング・ランキング表示
- ルームコードによる参加システム

## セットアップ

### 1. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. `supabase/schema.sql`のSQLを実行してデータベースを構築
3. プロジェクトのURL と anon keyを取得

### 2. YouTube API キーの取得

1. [Google Cloud Console](https://console.cloud.google.com)でプロジェクトを作成
2. YouTube Data API v3を有効化
3. APIキーを作成

### 3. 環境変数の設定

`.env.local.example`を`.env.local`にコピーして値を設定:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_api_key
```

### 4. 依存関係のインストールと起動

```bash
npm install
npm run dev
```

## Vercelへのデプロイ

1. GitHubにリポジトリをプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

## 使い方

1. 新規登録またはログイン
2. プレイリストを作成してYouTube URLを追加
3. クイズルームを作成（ホスト）またはルームコードで参加
4. リアルタイムでクイズを楽しむ！

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run start    # プロダクションサーバー起動
```