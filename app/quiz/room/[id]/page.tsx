'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { RealtimeChannel } from '@supabase/supabase-js'
import GradientLayout from '@/app/components/ui/GradientLayout'

interface Participant {
  id: string
  user_id: string
  display_name: string
  score: number
}

interface Question {
  id: string
  video_id: string
  video_title: string
  question_text: string
  correct_answer: string
  correct_answers: string[]
  options: any
  time_limit: number
  question_order: number
}

export default function QuizRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const router = useRouter()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    console.log('=== PARAMS EFFECT ===')
    params.then(({ id }) => {
      console.log('Room ID from params:', id)
      setRoomId(id)
    })
  }, [params])

  useEffect(() => {
    console.log('=== ROOM ID EFFECT ===', roomId)
    if (!roomId) {
      console.log('No roomId, returning early')
      return
    }
    
    console.log('Starting loadRoom and setupRealtimeSubscription for room:', roomId)
    loadRoom()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [roomId])

  useEffect(() => {
    if (timeLeft > 0 && currentQuestion) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && currentQuestion && !showResults) {
      submitAnswer()
    }
  }, [timeLeft, currentQuestion])

  const loadRoom = async () => {
    console.log('=== LOAD ROOM START ===')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('User authentication check:', user ? user.id : 'No user')
    
    if (!user) {
      console.log('No user found, redirecting to login')
      router.push('/auth/login')
      return
    }

    console.log('Loading session data from API for room:', roomId)
    try {
      const response = await fetch(`/api/quiz/sessions/${roomId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session data')
      }
      
      const data = await response.json()
      console.log('Session data loaded:', data)
      
      setSessionData(data)
      setRoom(data.session)
      setParticipants(data.participants || [])
      setCurrentQuestion(data.currentQuestion)
      
      const isHostUser = data.session.host_user_id === user.id
      console.log('Is host user:', isHostUser, '| Host user ID:', data.session.host_user_id, '| Current user ID:', user.id)
      setIsHost(isHostUser)
      
    } catch (error) {
      console.error('Error loading session data:', error)
    }
    
    console.log('Setting loading to false')
    setLoading(false)
  }

  const loadParticipants = async () => {
    console.log('Loading participants for room:', roomId)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', roomId)

    console.log('Participants query result:', { data, error, roomId })
    
    if (error) {
      console.error('Error loading participants:', error)
    }
    
    if (data) {
      console.log('Setting participants:', data)
      setParticipants([]) // Clear first to force re-render
      setTimeout(() => {
        setParticipants(data as any)
      }, 10)
    } else {
      console.log('No participant data received')
      setParticipants([])
    }
  }

  const setupRealtimeSubscription = () => {
    console.log('Setting up realtime subscription for room:', roomId)
    const supabase = createClient()
    const newChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `session_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Realtime participant change:', payload)
          loadParticipants()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Realtime session change:', payload)
          loadRoom()
          
          // クイズが開始された場合、現在の問題を設定
          if (payload.new?.status === 'playing' && sessionData?.currentQuestion) {
            setCurrentQuestion(sessionData.currentQuestion)
            setTimeLeft(sessionData.currentQuestion.time_limit || 30)
            setSelectedAnswer(null)
            setShowResults(false)
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    setChannel(newChannel)
  }

  // ホストのみ: クイズ開始
  const startQuiz = async () => {
    if (!isHost || !room) return

    try {
      const response = await fetch(`/api/quiz/sessions/${roomId}/start`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'クイズ開始に失敗しました')
      }
      
      // セッション状態を更新
      setRoom(prev => prev ? { ...prev, status: 'playing' } : null)
      
      // 現在の問題を表示
      if (sessionData?.currentQuestion) {
        setCurrentQuestion(sessionData.currentQuestion)
        setTimeLeft(sessionData.currentQuestion.time_limit || 30)
        setSelectedAnswer(null)
        setShowResults(false)
      }
    } catch (error) {
      console.error('Error starting quiz:', error)
    }
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const participant = participants.find(p => p.user_id === user.id)
    if (!participant) return

    // 正解かどうかチェック
    const isCorrect = currentQuestion.correct_answers.includes(selectedAnswer)
    const points = isCorrect ? Math.ceil(timeLeft * 10) : 0

    // 答えをデータベースに保存
    try {
      await supabase
        .from('quiz_answers')
        .insert({
          question_id: currentQuestion.id,
          participant_id: participant.id,
          answer: selectedAnswer,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
          points_awarded: points
        })

      // 参加者のスコアを更新
      await supabase
        .from('quiz_participants')
        .update({ score: participant.score + points })
        .eq('id', participant.id)
        
      setShowResults(true)
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  if (loading) {
    return (
      <GradientLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-lg font-medium text-gray-700">読み込み中...</p>
            </div>
          </div>
        </div>
      </GradientLayout>
    )
  }

  return (
    <GradientLayout>
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              🎵 {room?.playlists?.name || 'クイズルーム'}
            </h1>
            <div className="text-xl font-mono bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-6 py-3 rounded-xl border border-blue-200">
              コード: <span className="font-bold">{room?.room_code}</span>
            </div>
          </div>

          {room?.status === 'waiting' && isHost && sessionData?.questions?.length > 0 && (
            <button
              onClick={startQuiz}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              🚀 クイズを開始
            </button>
          )}
          
          {room?.status === 'waiting' && isHost && (!sessionData?.questions || sessionData.questions.length === 0) && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl">
              <p className="flex items-center">
                <span className="mr-2">⚠️</span>
                問題を生成してからクイズを開始してください
              </p>
            </div>
          )}

          {room?.status === 'waiting' && !isHost && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl">
              <p className="flex items-center">
                <span className="mr-2">⏳</span>
                ホストがクイズを開始するのを待っています...
              </p>
            </div>
          )}
        </div>

        {currentQuestion && room?.status === 'playing' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  ❓ {currentQuestion.question_text}
                </h2>
                <p className="text-lg text-gray-600">
                  🎵 「{currentQuestion.video_title}」
                </p>
              </div>
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xl rounded-full shadow-lg">
                {timeLeft}
              </div>
            </div>

            <div className="mb-6">
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => !showResults && setSelectedAnswer(e.target.value)}
                disabled={showResults}
                placeholder="答えを入力してください（競走馬名またはレース名）"
                className="w-full p-4 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            </div>
            
            {!showResults && selectedAnswer && (
              <button
                onClick={submitAnswer}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200"
              >
                回答する
              </button>
            )}
            
            {showResults && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <p className="text-lg font-bold text-green-800 mb-2">正解:</p>
                <p className="text-xl text-green-700">{currentQuestion.correct_answers.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            🏆 参加者 ({participants.length}/{room?.max_players || 10})
          </h2>
          
          {room?.status === 'playing' && sessionData?.questions && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
              <p className="text-sm text-purple-700">
                問題 {(room.current_question_index || 0) + 1} / {sessionData.questions.length}
              </p>
              <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(((room.current_question_index || 0) + 1) / sessionData.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-yellow-100 text-xs">
              Debug: participants.length={participants.length}, loading={loading.toString()}, roomId={roomId}
            </div>
          )}
          <div className="space-y-3">
            {participants.length > 0 ? (
              participants
                .sort((a, b) => b.score - a.score)
                .map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-white to-gray-50 shadow-md border border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-800">{participant.display_name}</span>
                      {participant.user_id === room?.host_user_id && (
                        <span className="text-xs bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full font-medium">
                          HOST
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-lg text-blue-600">{participant.score}点</span>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    参加者を読み込んでいます...
                  </div>
                ) : (
                  '参加者を待っています...'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </GradientLayout>
  )
}