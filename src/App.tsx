import { useState, useEffect } from 'react'
import { Race } from './types'
import RaceList from './components/RaceList'
import ActiveRace from './components/ActiveRace'
import { subscribeToRaces } from './services/raceService'

type View = 'list' | 'active'

function App() {
  const [view, setView] = useState<View>('list')
  const [races, setRaces] = useState<Race[]>([])
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToRaces((updatedRaces) => {
      setRaces(updatedRaces)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const activeRace = races.find(r => r.id === activeRaceId) ?? null

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide text-blue-400">
          ⏱ EOR Time Recorder
        </h1>
        {view === 'active' && (
          <button
            onClick={() => { setView('list'); setActiveRaceId(null) }}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← 返回列表
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center text-gray-400 mt-20">載入中...</div>
        ) : view === 'list' ? (
          <RaceList
            races={races}
            onSelectRace={(id) => { setActiveRaceId(id); setView('active') }}
            onNewRace={(id) => { setActiveRaceId(id); setView('active') }}
          />
        ) : activeRace ? (
          <ActiveRace race={activeRace} />
        ) : null}
      </main>
    </div>
  )
}

export default App
