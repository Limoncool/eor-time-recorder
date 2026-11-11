import { useState } from 'react'
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
} from '../services/authService'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  function translateFirebaseError(error: any): string {
    const code = error?.code || ''
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      return '帳號或密碼錯誤，請重新確認'
    }
    if (code.includes('email-already-in-use')) {
      return '此 Email 已經註冊過帳號，請直接登入'
    }
    if (code.includes('weak-password')) {
      return '密碼強度不足，請設定至少 6 碼'
    }
    if (code.includes('invalid-email')) {
      return '請輸入有效的 Email 地址'
    }
    if (code.includes('popup-closed-by-user')) {
      return 'Google 登入視窗已關閉'
    }
    return error?.message || '操作失敗，請稍候再試'
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setErrorMsg('')
    try {
      await loginWithGoogle()
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setErrorMsg(translateFirebaseError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMsg('請填寫完整 Email 與密碼')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password)
      } else {
        await registerWithEmail(email, password, displayName)
      }
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setErrorMsg(translateFirebaseError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl space-y-5 transition-colors relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          title="關閉"
          className="absolute top-4 right-4 app-btn-neutral w-7 h-7 p-0 rounded-lg active:scale-95 text-xs"
        >
          ✕
        </button>

        {/* 標題與分頁切換 */}
        <div className="text-center space-y-1.5 pt-1">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {mode === 'login' ? '登入賽事計時系統' : '註冊新帳號'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            登入後建立的賽事僅您本人與系統管理員可見
          </p>
        </div>

        {/* 錯誤提示 */}
        {errorMsg && (
          <div className="p-3 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Google 快速登入按鈕 */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-100 font-bold text-xs transition shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>使用 Google 帳號一鍵登入</span>
          </button>
        </div>

        {/* 分隔線 */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
          <span className="bg-white dark:bg-zinc-950 px-3 text-[11px] text-zinc-400 font-medium absolute">
            或使用 Email
          </span>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                姓名 / 店家名稱 (選填)
              </label>
              <input
                type="text"
                placeholder="例如：小智、新竹卡牌店"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Email 地址
            </label>
            <input
              type="text"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              密碼
            </label>
            <input
              type="password"
              required
              placeholder="至少 6 位數密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full app-btn-primary py-2.5 rounded-xl text-xs font-bold active:scale-95 disabled:opacity-50"
            >
              {loading
                ? '處理中...'
                : mode === 'login'
                ? '登入帳號'
                : '註冊新帳號'}
            </button>
          </div>
        </form>

        {/* 切換登入 / 註冊 */}
        <div className="text-center pt-1 border-t border-zinc-100 dark:border-zinc-850">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setErrorMsg('')
            }}
            className="text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400 font-semibold cursor-pointer py-1"
          >
            {mode === 'login'
              ? '還沒有帳號？點此免費註冊'
              : '已經有帳號？點此登入'}
          </button>
        </div>
      </div>
    </div>
  )
}
