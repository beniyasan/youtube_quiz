'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinQuizPage() {
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!roomCode.trim() || !displayName.trim()) {
      setError('ルームコードと表示名を入力してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // まずルームコードでセッションを検索
      const searchResponse = await fetch(`/api/quiz/sessions?roomCode=${roomCode.toUpperCase()}`)
      const searchResult = await searchResponse.json()

      if (!searchResponse.ok) {
        throw new Error(searchResult.error || 'セッションが見つかりません')
      }

      const sessionId = searchResult.sessionId

      // セッションに参加
      const joinResponse = await fetch(`/api/quiz/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: displayName.trim()
        })
      })

      const joinResult = await joinResponse.json()

      if (!joinResponse.ok) {
        throw new Error(joinResult.error || 'セッション参加に失敗しました')
      }

      // クイズルームにリダイレクト
      router.push(`/quiz/room/${sessionId}`)
    } catch (err) {
      console.error('Error joining session:', err)
      setError(err instanceof Error ? err.message : 'セッション参加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">クイズに参加</h1>
          <p className="text-green-100">ルームコードを入力してクイズに参加しましょう</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-10">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label htmlFor="roomCode" className="block text-base font-medium text-gray-700 mb-3">
                ルームコード
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white text-center text-2xl font-mono tracking-widest"
                required
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                6文字のルームコードを入力してください
              </p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-base font-medium text-gray-700 mb-3">
                表示名
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="あなたの名前"
                className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                他の参加者に表示される名前です
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-8 text-lg rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  参加中...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🚀</span>
                  クイズに参加
                </div>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              ルームコードがわからない場合は、ホストに確認してください
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}