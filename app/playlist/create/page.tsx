'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GradientLayout from '@/app/components/ui/GradientLayout'
import DashboardCard from '@/app/components/ui/DashboardCard'
import PrimaryButton from '@/app/components/ui/PrimaryButton'
import SecondaryButton from '@/app/components/ui/SecondaryButton'

export const dynamic = 'force-dynamic'

export default function CreatePlaylistPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        name,
        description,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/playlist/${data.id}`)
  }

  return (
    <GradientLayout className="p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <DashboardCard className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
              <span className="text-3xl">📁</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">新規プレイリスト作成</h1>
            <p className="text-gray-600 mt-2">YouTubeプレイリストからクイズを生成します</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                プレイリスト名
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                placeholder="例: アニメソングクイズ"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                説明（任意）
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                placeholder="プレイリストの説明を入力"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <PrimaryButton
                type="submit"
                disabled={loading}
                loading={loading}
                className="flex-1"
              >
                作成
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                キャンセル
              </SecondaryButton>
            </div>
          </form>
        </DashboardCard>
      </div>
    </GradientLayout>
  )
}