'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Participant {
  id: string
  user_id: string
  score: number
  users: {
    username: string
  }
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
  const supabase = createClient()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      setRoomId(id)
    })
  }, [params])

  useEffect(() => {
    if (!roomId) return
    
    loadRoom()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: roomData } = await supabase
      .from('quiz_rooms')
      .select(`
        *,
        playlists (
          name,
          youtube_videos (*)
        )
      `)
      .eq('id', roomId)
      .single()

    if (roomData) {
      setRoom(roomData)
      setIsHost(roomData.host_id === user.id)
    }

    loadParticipants()
    setLoading(false)
  }

  const loadParticipants = async () => {
    const { data } = await supabase
      .from('quiz_participants')
      .select(`
        *,
        users (username)
      `)
      .eq('room_id', roomId)

    if (data) {
      setParticipants(data as any)
    }
  }

  const setupRealtimeSubscription = () => {
    const newChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          loadParticipants()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quiz_rooms',
          filter: `id=eq.${roomId}`,
        },
        () => {
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
      .subscribe()

    setChannel(newChannel)
  }

  const startQuiz = async () => {
    if (!isHost || !room) return

    await supabase
      .from('quiz_rooms')
      .update({ status: 'playing', started_at: new Date().toISOString() })
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
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{room?.playlists?.name}</h1>
            <div className="text-xl font-mono bg-gray-100 px-4 py-2 rounded">
              コード: {room?.room_code}
            </div>
          </div>

          {room?.status === 'waiting' && isHost && (
            <button
              onClick={startQuiz}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              クイズを開始
            </button>
          )}

          {room?.status === 'waiting' && !isHost && (
            <p className="text-gray-600">ホストがクイズを開始するのを待っています...</p>
          )}
        </div>

        {currentQuestion && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{currentQuestion.question_text}</h2>
              <div className="text-2xl font-bold text-blue-500">
                {timeLeft}秒
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !showResults && setSelectedAnswer(option)}
                  disabled={showResults}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedAnswer === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${
                    showResults && option === currentQuestion.options[0]
                      ? 'bg-green-100 border-green-500'
                      : ''
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">参加者 ({participants.length}/{room?.max_players})</h2>
          <div className="space-y-2">
            {participants
              .sort((a, b) => b.score - a.score)
              .map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex justify-between items-center p-3 rounded bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">#{index + 1}</span>
                    <span>{participant.users.username}</span>
                    {participant.user_id === room?.host_id && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">HOST</span>
                    )}
                  </div>
                  <span className="font-semibold">{participant.score}点</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}