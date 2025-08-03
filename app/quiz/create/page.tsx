'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import type { QuizSettings } from '@/app/types/quiz'

interface Playlist {
  id: string
  name: string
  description: string
  video_count: number
}

export default function CreateQuizPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('')
  const [settings, setSettings] = useState<QuizSettings>({
    maxParticipants: 10,
    timePerStage: 15,
    answerTimeLimit: 10,
    stageProgression: 'auto',
    pointsForStage1: 3,
    pointsForStage2: 2,
    pointsForStage3: 1,
    penaltyPoints: -1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndFetchPlaylists()
  }, [])

  const checkAuthAndFetchPlaylists = async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session || !session.user) {
        console.log('No session found, redirecting to login')
        router.push('/auth/login')
        return
      }
      
      await fetchPlaylists()
    } catch (err) {
      console.error('Auth check failed:', err)
      router.push('/auth/login')
    }
  }

  const fetchPlaylists = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlaylists(data || [])
    } catch (err) {
      console.error('Error fetching playlists:', err)
      setError('プレイリスト取得に失敗しました')
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlaylist) {
      setError('プレイリストを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/quiz/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: selectedPlaylist,
          settings
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'セッション作成に失敗しました')
      }

      // ホスト画面にリダイレクト
      router.push(`/quiz/room/${result.sessionId}/host`)
    } catch (err) {
      console.error('Error creating session:', err)
      setError(err instanceof Error ? err.message : 'セッション作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">クイズセッション作成</h1>
          <p className="text-blue-100">プレイリストを選択してクイズを開始しましょう</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleCreateSession} className="space-y-6">
            {/* プレイリスト選択 */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-3">
                プレイリスト選択
              </label>
              <select
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">プレイリストを選択してください</option>
                {playlists.map(playlist => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name} ({playlist.video_count}動画)
                  </option>
                ))}
              </select>
            </div>

            {/* 基本設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大参加者数
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={settings.maxParticipants}
                  onChange={(e) => setSettings({
                    ...settings,
                    maxParticipants: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  段階あたりの時間（秒）
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.timePerStage}
                  onChange={(e) => setSettings({
                    ...settings,
                    timePerStage: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  回答制限時間（秒）
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={settings.answerTimeLimit}
                  onChange={(e) => setSettings({
                    ...settings,
                    answerTimeLimit: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  段階進行
                </label>
                <select
                  value={settings.stageProgression}
                  onChange={(e) => setSettings({
                    ...settings,
                    stageProgression: e.target.value as 'auto' | 'manual'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="auto">自動</option>
                  <option value="manual">手動</option>
                </select>
              </div>
            </div>

            {/* 得点設定 */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">得点設定</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">音声のみ正解</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.pointsForStage1}
                    onChange={(e) => setSettings({
                      ...settings,
                      pointsForStage1: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">映像正解</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.pointsForStage2}
                    onChange={(e) => setSettings({
                      ...settings,
                      pointsForStage2: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">最初から正解</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.pointsForStage3}
                    onChange={(e) => setSettings({
                      ...settings,
                      pointsForStage3: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">不正解ペナルティ</label>
                  <input
                    type="number"
                    min="-5"
                    max="0"
                    value={settings.penaltyPoints}
                    onChange={(e) => setSettings({
                      ...settings,
                      penaltyPoints: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-8 text-lg rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  作成中...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🎮</span>
                  クイズセッション作成
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}