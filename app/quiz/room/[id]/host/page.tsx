'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

interface QuizSession {
  id: string
  room_code: string
  status: 'waiting' | 'active' | 'completed'
  current_question_index: number
  settings: any
  playlist: {
    id: string
    name: string
    description: string
  }
}

interface Participant {
  id: string
  display_name: string
  score: number
  is_connected: boolean
}

export default function HostPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<QuizSession | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    }
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      const supabase = createClient()
      
      // セッション情報を取得
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          playlist:playlists(id, name, description)
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      
      setSession(sessionData)
      
      // 参加者情報を取得
      const { data: participantsData, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false })

      if (participantsError) throw participantsError
      
      setParticipants(participantsData || [])
      
    } catch (err) {
      console.error('Error fetching session data:', err)
      setError('セッション情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = async () => {
    try {
      const response = await fetch(`/api/quiz/sessions/${sessionId}/start`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('クイズ開始に失敗しました')
      }
      
      // セッション状態を更新
      setSession(prev => prev ? { ...prev, status: 'active' } : null)
      
    } catch (err) {
      console.error('Error starting quiz:', err)
      setError('クイズ開始に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">セッション情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">エラー</h2>
          <p className="text-gray-600 mb-6">{error || 'セッションが見つかりません'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {session.playlist.name}
              </h1>
              <p className="text-gray-600">ルームコード: <span className="font-mono text-2xl font-bold text-purple-600">{session.room_code}</span></p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">ステータス</div>
              <div className={`text-lg font-bold ${
                session.status === 'waiting' ? 'text-yellow-600' :
                session.status === 'active' ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {session.status === 'waiting' ? '待機中' :
                 session.status === 'active' ? '進行中' :
                 '完了'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 参加者リスト */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                参加者 ({participants.length}人)
              </h2>
              
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">👥</div>
                  <p className="text-gray-500">参加者を待っています...</p>
                  <p className="text-sm text-gray-400 mt-2">ルームコードを共有して参加者を募集しましょう</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{participant.display_name}</div>
                          <div className={`text-sm ${participant.is_connected ? 'text-green-600' : 'text-red-500'}`}>
                            {participant.is_connected ? 'オンライン' : 'オフライン'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">{participant.score}点</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* コントロールパネル */}
          <div className="space-y-6">
            {/* ルームコード表示 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-gray-800 mb-2">ルームコード</h3>
              <div className="text-4xl font-mono font-bold text-purple-600 mb-4">
                {session.room_code}
              </div>
              <p className="text-sm text-gray-500">このコードを参加者に共有してください</p>
            </div>

            {/* 開始ボタン */}
            {session.status === 'waiting' && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
                <button
                  onClick={startQuiz}
                  disabled={participants.length === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {participants.length === 0 ? (
                    <>
                      <span className="mr-2">⏳</span>
                      参加者を待機中
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🚀</span>
                      クイズ開始
                    </>
                  )}
                </button>
                {participants.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    1人以上の参加者が必要です
                  </p>
                )}
              </div>
            )}

            {/* 進行中の場合の情報 */}
            {session.status === 'active' && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">進行状況</h3>
                <div className="space-y-2">
                  <div>問題 {session.current_question_index + 1}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((session.current_question_index + 1) / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}