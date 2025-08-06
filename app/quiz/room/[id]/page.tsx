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
  question_text: string
  options: string[]
  time_limit: number
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

    console.log('Loading room data for room:', roomId)
    const { data: roomData } = await supabase
      .from('quiz_sessions')
      .select(`
        *,
        playlists (
          name,
          youtube_videos (*)
        )
      `)
      .eq('id', roomId)
      .single()

    console.log('Room data loaded:', roomData)
    
    if (roomData) {
      setRoom(roomData)
      const isHostUser = roomData.host_user_id === user.id
      console.log('Is host user:', isHostUser, '| Host user ID:', roomData.host_user_id, '| Current user ID:', user.id)
      setIsHost(isHostUser)
    }

    console.log('About to load participants...')
    await loadParticipants()
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
        }
      )
      .on('broadcast', { event: 'question' }, (payload) => {
        setCurrentQuestion(payload.payload.question)
        setTimeLeft(payload.payload.question.time_limit)
        setSelectedAnswer(null)
        setShowResults(false)
      })
      .on('broadcast', { event: 'results' }, () => {
        setShowResults(true)
        loadParticipants()
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    setChannel(newChannel)
  }

  const startQuiz = async () => {
    if (!isHost || !room) return

    const supabase = createClient()
    await supabase
      .from('quiz_sessions')
      .update({ status: 'playing' })
      .eq('id', roomId)

    sendNextQuestion()
  }

  const sendNextQuestion = () => {
    if (!room?.playlists?.youtube_videos) return

    const videos = room.playlists.youtube_videos
    const randomVideo = videos[Math.floor(Math.random() * videos.length)]
    
    const question: Question = {
      id: crypto.randomUUID(),
      question_text: `この曲のタイトルは？「${randomVideo.title}」`,
      options: generateOptions(randomVideo.title, videos.map((v: any) => v.title)),
      time_limit: 30,
    }

    channel?.send({
      type: 'broadcast',
      event: 'question',
      payload: { question },
    })
  }

  const generateOptions = (correct: string, allTitles: string[]): string[] => {
    const options = [correct]
    const otherTitles = allTitles.filter(t => t !== correct)
    
    while (options.length < 4 && otherTitles.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherTitles.length)
      options.push(otherTitles.splice(randomIndex, 1)[0])
    }
    
    return options.sort(() => Math.random() - 0.5)
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const participant = participants.find(p => p.user_id === user.id)
    if (!participant) return

    const isCorrect = selectedAnswer === currentQuestion.options[0]
    const points = isCorrect ? Math.ceil(timeLeft * 10) : 0

    await supabase
      .from('quiz_participants')
      .update({ score: participant.score + points })
      .eq('id', participant.id)

    if (isHost) {
      setTimeout(() => {
        channel?.send({
          type: 'broadcast',
          event: 'results',
        })
      }, 2000)

      setTimeout(() => {
        sendNextQuestion()
      }, 5000)
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

          {room?.status === 'waiting' && isHost && (
            <button
              onClick={startQuiz}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              🚀 クイズを開始
            </button>
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

        {currentQuestion && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                ❓ {currentQuestion.question_text}
              </h2>
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xl rounded-full shadow-lg">
                {timeLeft}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !showResults && setSelectedAnswer(option)}
                  disabled={showResults}
                  className={`p-6 rounded-xl border-2 font-medium text-left transition-all duration-200 transform hover:scale-105 ${
                    selectedAnswer === option
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 shadow-lg'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                  } ${
                    showResults && option === currentQuestion.options[0]
                      ? 'bg-gradient-to-r from-green-100 to-green-200 border-green-500 text-green-800'
                      : ''
                  }`}
                >
                  <span className="text-sm font-bold text-gray-500 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            🏆 参加者 ({participants.length}/{room?.settings?.maxParticipants || 10})
          </h2>
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