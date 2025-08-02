'use client'

import { useState } from 'react'

export const dynamic = 'force-dynamic'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function JoinQuizPage() {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('quiz_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .eq('status', 'waiting')
      .single()

    if (roomError || !room) {
      setError('ルームが見つかりません')
      setLoading(false)
      return
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      router.push(`/quiz/room/${room.id}`)
      return
    }

    // Check max players
    const { data: participants } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('room_id', room.id)

    if (participants && participants.length >= room.max_players) {
      setError('ルームが満員です')
      setLoading(false)
      return
    }

    // Join room
    const { error: joinError } = await supabase
      .from('quiz_participants')
      .insert({
        room_id: room.id,
        user_id: user.id,
      })

    if (joinError) {
      setError('参加に失敗しました')
      setLoading(false)
      return
    }

    router.push(`/quiz/room/${room.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">クイズに参加</h1>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              ルームコード
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="例: ABC123"
              maxLength={6}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || roomCode.length < 6}
            className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? '参加中...' : '参加する'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}