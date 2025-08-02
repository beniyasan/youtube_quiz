export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">メールを確認してください</h1>
        <p className="text-gray-600 mb-8">
          登録したメールアドレスに確認メールを送信しました。
          メール内のリンクをクリックして、アカウントを有効化してください。
        </p>
        <a
          href="/auth/login"
          className="text-blue-500 hover:text-blue-700"
        >
          ログインページへ戻る
        </a>
      </div>
    </div>
  )
}