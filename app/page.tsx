export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">YouTube Quiz App</h1>
      <p className="text-xl mb-8">YouTubeプレイリストからリアルタイムクイズを楽しもう！</p>
      <div className="flex gap-4">
        <a href="/auth/login" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          ログイン
        </a>
        <a href="/auth/register" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          新規登録
        </a>
      </div>
    </main>
  )
}