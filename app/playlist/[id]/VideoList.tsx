'use client'

import Image from 'next/image'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Video {
  id: string
  youtube_url: string
  title: string
  thumbnail_url: string | null
  duration: number | null
}

interface VideoListProps {
  videos: Video[]
}

export default function VideoList({ videos }: VideoListProps) {
  const router = useRouter()

  const handleDelete = async (videoId: string) => {
    if (!confirm('この動画を削除しますか？')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('youtube_videos')
      .delete()
      .eq('id', videoId)

    if (!error) {
      router.refresh()
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return ''
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (videos.length === 0) {
    return <p className="text-gray-500">動画がまだ登録されていません</p>
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div key={video.id} className="flex items-center gap-4 p-4 border rounded-lg">
          {video.thumbnail_url && (
            <div className="relative w-32 h-20 flex-shrink-0">
              <Image
                src={video.thumbnail_url}
                alt={video.title}
                fill
                className="object-cover rounded"
              />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold">{video.title}</h3>
            <p className="text-sm text-gray-500">{formatDuration(video.duration)}</p>
          </div>
          <button
            onClick={() => handleDelete(video.id)}
            className="text-red-500 hover:text-red-700"
          >
            削除
          </button>
        </div>
      ))}
    </div>
  )
}