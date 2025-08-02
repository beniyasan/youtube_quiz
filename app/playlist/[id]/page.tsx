import { createClient } from '@/app/lib/supabase/server'
import { notFound } from 'next/navigation'
import AddVideoForm from './AddVideoForm'
import VideoList from './VideoList'

export default async function PlaylistPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: playlist, error } = await supabase
    .from('playlists')
    .select('*, youtube_videos(*)')
    .eq('id', params.id)
    .single()

  if (error || !playlist) {
    notFound()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-gray-600 mt-2">{playlist.description}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">YouTube URLを追加</h2>
          <AddVideoForm playlistId={playlist.id} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">登録済み動画</h2>
          <VideoList videos={playlist.youtube_videos} />
        </div>
      </div>
    </div>
  )
}