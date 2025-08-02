'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CreateQuizPage() {
  const [playlists, setPlaylists] = useState<any[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadPlaylists()
  }, [])

  const loadPlaylists = async () => {
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
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">クイズルームを作成</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              プレイリストを選択
            </label>
            <select
              value={selectedPlaylist}
              onChange={(e) => setSelectedPlaylist(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium mb-2">
              最大参加人数
            </label>
            <input
              type="number"
              min="2"
              max="20"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-500">{error}</div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={loading || !selectedPlaylist}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? '作成中...' : 'ルームを作成'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}