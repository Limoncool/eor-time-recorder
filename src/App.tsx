import { useState, useEffect } from 'react'
import { Tournament } from './types'
import RaceList from './components/RaceList'
import ActiveRace from './components/ActiveRace'
import { subscribeToRaces } from './services/raceService'

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
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* 背景微光效果 */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.08),rgba(255,255,255,0))]" />

      {/* 頂部 Header */}
      <header className="relative border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              {/* 精緻寶可夢球圖示 */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a10 10 0 0 0-10 9.2h6.1a4 4 0 0 1 7.8 0H22A10 10 0 0 0 12 2z" fill="#EF4444" />
                <path d="M12 22a10 10 0 0 0 10-9.2h-6.1a4 4 0 0 1-7.8 0H2A10 10 0 0 0 12 22z" fill="#F4F4F5" />
                <line x1="2" y1="12" x2="22" y2="12" stroke="#18181B" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="3.2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
                <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                EoR Time Recorder
              </h1>
              <p className="text-[11px] text-zinc-500 leading-none">
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
              className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
