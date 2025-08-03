'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GradientLayout from '@/app/components/ui/GradientLayout'
import DashboardCard from '@/app/components/ui/DashboardCard'
import PrimaryButton from '@/app/components/ui/PrimaryButton'
import SecondaryButton from '@/app/components/ui/SecondaryButton'

export const dynamic = 'force-dynamic'

export default function CreateQuizPage() {
  const [playlists, setPlaylists] = useState<any[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadPlaylists()
  }, [])

  const loadPlaylists = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('playlists')
      .select('*, youtube_videos(count)')
      .eq('user_id', user.id)

    if (data) {
      setPlaylists(data.filter(p => p.youtube_videos[0].count > 0))
    }
  }

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateRoom = async () => {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const roomCode = generateRoomCode()

    const { data, error } = await supabase
      .from('quiz_rooms')
      .insert({
        host_id: user.id,
        playlist_id: selectedPlaylist,
        room_code: roomCode,
        max_players: maxPlayers,
        status: 'waiting',
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Join as host
    await supabase
      .from('quiz_participants')
      .insert({
        room_id: data.id,
        user_id: user.id,
      })

    router.push(`/quiz/room/${data.id}`)
  }

  return (
    <GradientLayout className="p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <DashboardCard className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">クイズルームを作成</h1>
            <p className="text-gray-600 mt-2">プレイリストを選んでクイズを始めましょう</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プレイリストを選択
              </label>
              <select
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                required
              >
                <option value="">選択してください</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name} ({playlist.youtube_videos[0].count} 動画)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大参加人数
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <PrimaryButton
                onClick={handleCreateRoom}
                disabled={loading || !selectedPlaylist}
                loading={loading}
                className="flex-1"
              >
                ルームを作成
              </PrimaryButton>
              <SecondaryButton
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                キャンセル
              </SecondaryButton>
            </div>
          </div>
        </DashboardCard>
      </div>
    </GradientLayout>
  )
}