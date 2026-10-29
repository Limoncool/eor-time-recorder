import { useState, useEffect } from 'react'
import { Tournament } from './types'
import RaceList from './components/RaceList'
import ActiveRace from './components/ActiveRace'
import { subscribeToRaces } from './services/raceService'
import pokeballImg from '../img/pokeball.png'

type View = 'list' | 'active'
type Theme = 'light' | 'dark'

function App() {
  const [view, setView] = useState<View>('list')
  const [races, setRaces] = useState<Tournament[]>([])
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const unsubscribe = subscribeToRaces((updatedRaces) => {
      setRaces(updatedRaces)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const activeRace = races.find((r) => r.id === activeRaceId) ?? null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-800 dark:selection:text-amber-200 relative overflow-x-hidden transition-colors duration-200">
      {/* 氛圍背景微光 */}
      <div className="fixed inset-0 pointer-events-none transition-opacity duration-500">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_70%)] blur-2xl dark:bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05),transparent_65%)] blur-3xl dark:bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.10),transparent_65%)]" />
      </div>

      {/* 頂部 Header */}
      <header className="relative border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
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

          <div className="flex items-center gap-2.5">
            {/* 精美流線型光暗切換膠囊 */}
            <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-900/90 p-0.5 rounded-full border border-zinc-300/80 dark:border-zinc-800 shadow-inner">
              <button
                type="button"
                onClick={() => setTheme('light')}
                title="切換為淺色模式 (亮)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="text-amber-500">☀️</span>
                <span className="hidden sm:inline">淺色</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="切換為深色模式 (暗)"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-800 text-amber-300 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="text-amber-300">🌙</span>
                <span className="hidden sm:inline">深色</span>
              </button>
            </div>

            {view === 'active' && (
              <button
                onClick={() => {
                  setView('list')
                  setActiveRaceId(null)
                }}
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>賽事列表</span>
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
    </div>
  )
}

export default App