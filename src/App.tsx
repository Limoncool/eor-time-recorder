import { useState, useEffect } from 'react'
import { Tournament } from './types'
import RaceList from './components/RaceList'
import ActiveRace from './components/ActiveRace'
import { subscribeToRaces } from './services/raceService'
import pokeballImg from '../img/pokeball.png'

type View = 'list' | 'active'
type BgMode = 'ambient' | 'pure'

function App() {
  const [view, setView] = useState<View>('list')
  const [races, setRaces] = useState<Tournament[]>([])
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 背景光暗模式切換：ambient (微光氛圍) 或 pure (純黑無光)
  const [bgMode, setBgMode] = useState<BgMode>(() => {
    return (localStorage.getItem('eor_bg_mode') as BgMode) || 'ambient'
  })

  function toggleBgMode() {
    const next = bgMode === 'ambient' ? 'pure' : 'ambient'
    setBgMode(next)
    localStorage.setItem('eor_bg_mode', next)
  }

  useEffect(() => {
    const unsubscribe = subscribeToRaces((updatedRaces) => {
      setRaces(updatedRaces)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const activeRace = races.find((r) => r.id === activeRaceId) ?? null

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-200 relative overflow-x-hidden">
      {/* 背景微光層：依據 bgMode 切換顯示 */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${
          bgMode === 'ambient' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.10),transparent_65%)] blur-3xl" />
      </div>

      {/* 頂部 Header */}
      <header className="relative border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
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
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                EoR Time Recorder
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono leading-none mt-0.5">
                PTCG 25m • 輪次時間與輪間時長總表
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 背景光暗切換模式按鈕 */}
            <button
              onClick={toggleBgMode}
              title={bgMode === 'ambient' ? '切換為極致純黑底' : '切換為氛圍微光底'}
              className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              {bgMode === 'ambient' ? (
                <>
                  <span className="text-amber-400">💡</span>
                  <span className="hidden sm:inline">微光模式</span>
                </>
              ) : (
                <>
                  <span className="text-zinc-400">🌙</span>
                  <span className="hidden sm:inline">純黑模式</span>
                </>
              )}
            </button>

            {view === 'active' && (
              <button
                onClick={() => {
                  setView('list')
                  setActiveRaceId(null)
                }}
                className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                賽事列表
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="relative max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
            <div className="text-xs text-zinc-500 font-mono tracking-wider">載入賽事紀錄中...</div>
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
