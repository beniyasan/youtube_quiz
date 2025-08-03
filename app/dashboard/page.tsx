import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import GradientLayout from '@/app/components/ui/GradientLayout'
import DashboardCard from '@/app/components/ui/DashboardCard'
import IconButton from '@/app/components/ui/IconButton'
import SecondaryButton from '@/app/components/ui/SecondaryButton'

export const dynamic = 'force-dynamic'

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
    <GradientLayout className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <DashboardCard className="p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full">
                <span className="text-2xl">🎵</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">ダッシュボード</h1>
                <p className="text-sm text-gray-600">ようこそ、{user.email}さん</p>
              </div>
            </div>
            <form action="/auth/logout" method="post">
              <SecondaryButton type="submit">
                ログアウト
              </SecondaryButton>
            </form>
          </div>
        </DashboardCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link href="/quiz/create" className="block">
            <DashboardCard hover className="p-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold mb-2">クイズを開始</h2>
                <p className="text-blue-100">新しいクイズルームを作成して、友達と楽しもう！</p>
              </div>
            </DashboardCard>
          </Link>

          <Link href="/quiz/join" className="block">
            <DashboardCard hover className="p-8 bg-gradient-to-br from-green-500 to-green-600 text-white h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold mb-2">クイズに参加</h2>
                <p className="text-green-100">ルームコードを入力して、クイズに参加しよう！</p>
              </div>
            </DashboardCard>
          </Link>
        </div>

        {/* Playlists Section */}
        <DashboardCard className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">マイプレイリスト</h2>
              <p className="text-gray-600">YouTubeプレイリストからクイズを作成できます</p>
            </div>
            <Link href="/playlist/create">
              <IconButton icon="➕" variant="primary">
                新規作成
              </IconButton>
            </Link>
          </div>

          {playlists && playlists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist/${playlist.id}`}
                  className="block"
                >
                  <DashboardCard 
                    hover 
                    className="p-5 border border-gray-100 shadow-md h-full"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📁</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{playlist.name}</h3>
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{playlist.description || 'プレイリストの説明はありません'}</p>
                      </div>
                    </div>
                  </DashboardCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-20">📁</div>
              <p className="text-gray-500 mb-6">プレイリストがまだありません</p>
              <Link href="/playlist/create">
                <IconButton icon="➕" variant="secondary">
                  最初のプレイリストを作成
                </IconButton>
              </Link>
            </div>
          )}
        </DashboardCard>
      </div>
    </GradientLayout>
  )
}