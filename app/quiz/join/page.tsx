'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GradientLayout from '@/app/components/ui/GradientLayout'
import DashboardCard from '@/app/components/ui/DashboardCard'
import PrimaryButton from '@/app/components/ui/PrimaryButton'

export const dynamic = 'force-dynamic'

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
    <GradientLayout className="p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <DashboardCard className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">クイズに参加</h1>
            <p className="text-gray-600 mt-2">ルームコードを入力してください</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ルームコード
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="ABC123"
                maxLength={6}
                required
                className="w-full px-4 py-4 border border-gray-200 rounded-xl text-center text-2xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                6文字のルームコードを入力
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <PrimaryButton
              type="submit"
              disabled={loading || roomCode.length < 6}
              loading={loading}
              className="w-full"
            >
              参加する
            </PrimaryButton>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </form>
        </DashboardCard>
      </div>
    </GradientLayout>
  )
}