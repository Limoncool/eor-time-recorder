import { useState, useEffect } from 'react'
import { Tournament } from './types'
import RaceList from './components/RaceList'
import ActiveRace from './components/ActiveRace'
import { subscribeToRaces } from './services/raceService'
import pokeballImg from '../img/pokeball.png'

type View = 'list' | 'active'

function App() {
  const [view, setView] = useState<View>('list')
  const [races, setRaces] = useState<Tournament[]>([])
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      {/* 強化背景顯著光暈效果 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.22),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[650px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.16),transparent_65%)] blur-3xl" />
      </div>

      {/* 頂部 Header */}
      <header className="relative border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative group flex items-center justify-center">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-rose-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
              <img
                src={pokeballImg}
                alt="Pokéball"
                className="relative w-11 h-11 object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.7)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 cursor-pointer"
              />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                EoR Time Recorder
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono leading-none mt-0.5">
                每輪 25 分鐘 • 輪次時間與輪間時長計時總表
              </p>
            </div>
          </div>

          {view === 'active' && (
            <button
              onClick={() => {
                setView('list')
                setActiveRaceId(null)
              }}
              className="text-xs font-bold text-zinc-200 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-amber-400/50 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回賽事清單
            </button>
          )}
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
