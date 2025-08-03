'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function TestPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAuth = async () => {
    setLoading(true)
    const supabase = createClient()

    console.log('=== Auth Test Start ===')
    console.log('All cookies:', document.cookie)

    try {
      // セッション取得テスト
      console.log('Getting session...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      console.log('Session result:', { sessionData, sessionError })
      setSessionInfo({ data: sessionData, error: sessionError })

      // ユーザー取得テスト
      console.log('Getting user...')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('User result:', { userData, userError })
      setUserInfo({ data: userData, error: userError })

    } catch (error) {
      console.error('Test error:', error)
    }

    setLoading(false)
  }

  useEffect(() => {
    testAuth()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">認証テストページ</h1>
      
      <button 
        onClick={testAuth} 
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'テスト中...' : '認証テスト実行'}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">セッション情報</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">ユーザー情報</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-4 border p-4 rounded">
        <h2 className="font-bold mb-2">Cookie情報</h2>
        <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded">
          {typeof document !== 'undefined' ? document.cookie : 'Server side rendering'}
        </pre>
      </div>

      <div className="mt-4">
        <h2 className="font-bold mb-2">ブラウザコンソールでデバッグ情報を確認してください</h2>
        <p className="text-sm text-gray-600">
          F12でデベロッパーツールを開き、Consoleタブでより詳細な情報を確認できます。
        </p>
      </div>
    </div>
  )
}