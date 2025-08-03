export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <span className="text-4xl">🎮</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            YouTube Quiz
          </h1>
          <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-2xl mx-auto">
            YouTubeプレイリストから<br />
            <span className="text-pink-200 font-semibold">リアルタイムクイズ</span>を楽しもう！
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl mb-4">🎵</div>
            <h3 className="text-lg font-semibold text-white mb-2">プレイリスト管理</h3>
            <p className="text-purple-100 text-sm">お気に入りのYouTube動画でオリジナルクイズ</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-white mb-2">マルチプレイヤー</h3>
            <p className="text-purple-100 text-sm">友達と一緒にリアルタイムでクイズバトル</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-white mb-2">スコアシステム</h3>
            <p className="text-purple-100 text-sm">ランキングで競争して上位を目指そう</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a 
            href="/auth/register" 
            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            <span className="mr-2">🚀</span>
            無料で始める
          </a>
          <a 
            href="/auth/login" 
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-xl border border-white/20 transition-all duration-200 hover:scale-105"
          >
            ログイン
          </a>
        </div>

        {/* Footer */}
        <div className="mt-16">
          <p className="text-purple-200 text-sm">
            🎯 AIが自動生成するクイズで、新しい発見を楽しもう
          </p>
        </div>
      </div>
    </main>
  )
}