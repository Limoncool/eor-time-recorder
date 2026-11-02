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
            {/* 單一光暗切換整合按鈕 (清晰高對比向量圖標) */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? '當前為深色模式，點擊切換為淺色模式' : '當前為淺色模式，點擊切換為深色模式'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all shadow-xs hover:shadow active:scale-95 cursor-pointer text-xs sm:text-sm font-bold"
            >
              {theme === 'dark' ? (
                <>
                  {/* 精緻立體感明亮黃月亮圖示 */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
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
                  <span className="text-zinc-100">深色模式</span>
                </>
              ) : (
                <>
                  {/* 精緻溫暖金色太陽圖示 */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
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
                  <span className="text-zinc-800">淺色模式</span>
                </>
              )}
            </button>

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