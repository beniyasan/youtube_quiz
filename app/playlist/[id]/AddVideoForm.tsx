'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AddVideoFormProps {
  playlistId: string
}

export default function AddVideoForm({ playlistId }: AddVideoFormProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError('有効なYouTube URLを入力してください')
      setLoading(false)
      return
    }

    try {
      // Fetch video info from YouTube API
      const response = await fetch(`/api/youtube/video/${videoId}`)
      if (!response.ok) {
        throw new Error('動画情報の取得に失敗しました')
      }
      
      const videoInfo = await response.json()

      const { error: dbError } = await supabase
        .from('youtube_videos')
        .insert({
          playlist_id: playlistId,
          youtube_url: url,
          title: videoInfo.title,
          thumbnail_url: videoInfo.thumbnail,
          duration: videoInfo.duration,
        })

      if (dbError) {
        throw dbError
      }

      setUrl('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '動画の追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? '追加中...' : '動画を追加'}
      </button>
    </form>
  )
}