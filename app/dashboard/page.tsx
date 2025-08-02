import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: playlists } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              ログアウト
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/quiz/create"
            className="bg-blue-500 hover:bg-blue-700 text-white p-6 rounded-lg text-center"
          >
            <h2 className="text-2xl font-bold mb-2">クイズを開始</h2>
            <p>新しいクイズルームを作成</p>
          </Link>

          <Link
            href="/quiz/join"
            className="bg-green-500 hover:bg-green-700 text-white p-6 rounded-lg text-center"
          >
            <h2 className="text-2xl font-bold mb-2">クイズに参加</h2>
            <p>ルームコードで参加</p>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">マイプレイリスト</h2>
            <Link
              href="/playlist/create"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              新規作成
            </Link>
          </div>

          {playlists && playlists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist/${playlist.id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold">{playlist.name}</h3>
                  <p className="text-gray-600 text-sm">{playlist.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">プレイリストがありません</p>
          )}
        </div>
      </div>
    </div>
  )
}