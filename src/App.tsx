import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { Tournament } from './types'
import RaceList from './components/RaceList'
import ActiveRace from './components/ActiveRace'
import AuthModal from './components/AuthModal'
import { subscribeToRaces } from './services/raceService'
import { subscribeToAuth, isUserAdmin, logout } from './services/authService'
import pokeballImg from '../img/pokeball.png'

type View = 'list' | 'active'
type Theme = 'light' | 'dark'

function App() {
  const [view, setView] = useState<View>('list')
  const [races, setRaces] = useState<Tournament[]>([])
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 使用者驗證狀態
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // 背景光暗主題切換 (真正切換 html.dark class)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('eor_theme') as Theme | null
    if (saved === 'light' || saved === 'dark') return saved
    return 'dark' // 預設深色
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('eor_theme', theme)
  }, [theme])

  // 監聽 Firebase 登入狀態
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuth((authUser) => {
      setUser(authUser)
      setAuthLoading(false)
    })
    return () => unsubscribeAuth()
  }, [])

  // 根據當前使用者權限訂閱賽事 (管理員看全部，一般使用者只看自己的)
  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    const isAdmin = isUserAdmin(user)
    const unsubscribeRaces = subscribeToRaces(user, isAdmin, (updatedRaces) => {
      setRaces(updatedRaces)
      setLoading(false)
    })
    return () => unsubscribeRaces()
  }, [user, authLoading])

  const activeRace = races.find((r) => r.id === activeRaceId) ?? null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-800 dark:selection:text-amber-200 relative overflow-x-hidden transition-colors duration-200">
      {/* 氛圍背景微光 */}
      <div className="fixed inset-0 pointer-events-none transition-opacity duration-500">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)] blur-2xl dark:bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05),transparent_65%)] blur-3xl dark:bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.10),transparent_65%)]" />
      </div>

      {/* 頂部 Header (柔和圓弧底邊) */}
      <header className="relative border-b border-zinc-200 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md sticky top-0 z-50 transition-colors rounded-b-2xl shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center">
              <img
                src={pokeballImg}
                alt="Pokéball"
                className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                EoR Time Recorder
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono leading-none mt-0.5">
                PTCG 25m • 輪次時間與輪間時長總表
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 單一光暗切換整合按鈕 (純圖標，確保固定尺寸與清晰顯示) */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
              aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
              className="app-btn-neutral app-btn-icon rounded-xl active:scale-95"
            >
              {theme === 'dark' ? (
                /* 精緻立體感明亮黃月亮圖示 (明確指定寬高，保證不被 Tailwind purge 隱藏) */
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ width: '20px', height: '20px', display: 'block', minWidth: '20px', minHeight: '20px' }}
                >
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    fill="#facc15"
                    stroke="#eab308"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M18 4l.5 1.2L19.7 5.7l-1.2.5L18 7.4l-.5-1.2L16.3 5.7l1.2-.5L18 4z"
                    fill="#fef08a"
                  />
                </svg>
              ) : (
                /* 精緻溫暖金色太陽圖示 (明確指定寬高，保證不被 Tailwind purge 隱藏) */
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ width: '20px', height: '20px', display: 'block', minWidth: '20px', minHeight: '20px' }}
                >
                  <circle cx="12" cy="12" r="4.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                  <g stroke="#d97706" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                  </g>
                </svg>
              )}
            </button>

            {view === 'active' && (
              <button
                onClick={() => {
                  setView('list')
                  setActiveRaceId(null)
                }}
                title="返回賽事列表"
                aria-label="返回賽事列表"
                className="app-btn-neutral px-3 py-1.5 rounded-xl active:scale-95 whitespace-nowrap"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ width: '14px', height: '14px', display: 'block' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="whitespace-nowrap font-bold text-xs">賽事列表</span>
              </button>
            )}

            {/* 帳號登入 / 狀態顯示區塊 */}
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-zinc-400 border-t-amber-500 rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-1 px-2.5 rounded-xl">
                {isUserAdmin(user) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-black uppercase tracking-wider">
                    管理員
                  </span>
                )}
                <span
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate"
                  title={user.email || ''}
                >
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  title="登出帳號"
                  className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 font-bold ml-1 transition cursor-pointer"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="app-btn-primary px-3 py-1.5 rounded-xl active:scale-95 whitespace-nowrap text-xs font-bold inline-flex items-center gap-1.5"
              >
                <span>登入 / 註冊</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="relative max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-6 h-6 border-2 border-zinc-400 dark:border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tracking-wider">載入賽事紀錄中...</div>
          </div>
        ) : view === 'list' ? (
          <RaceList
            races={races}
            currentUser={user}
            isAdmin={isUserAdmin(user)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSelectRace={(id) => {
              setActiveRaceId(id)
              setView('active')
            }}
            onNewRace={(id) => {
              setActiveRaceId(id)
              setView('active')
            }}
          />
        ) : activeRace ? (
          <ActiveRace race={activeRace} />
        ) : null}
      </main>

      {/* 登入 / 註冊彈窗 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  )
}

export default App