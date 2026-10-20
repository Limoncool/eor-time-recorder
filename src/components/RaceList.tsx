import { useState } from 'react'
import { Race } from '../types'
import { createRace } from '../services/raceService'

interface Props {
  races: Race[]
  onSelectRace: (id: string) => void
  onNewRace: (id: string) => void
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-')
    if (y && m && d) return `${y}/${m}/${d}`
    return new Date(dateStr).toLocaleDateString('zh-TW')
  } catch {
    return dateStr
  }
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export default function RaceList({ races, onSelectRace, onNewRace }: Props) {
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    const today = new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    const name = newName.trim() || `MTG 賽事 (${today})`
    setCreating(true)
    try {
      const id = await createRace(name)
      setNewName('')
      onNewRace(id)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 新增賽事卡片 */}
      <div className="relative rounded-2xl bg-zinc-900/60 border border-zinc-800/90 p-5 shadow-2xl backdrop-blur-sm overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            建立新賽事
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Swiss / Tournament</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="例如：RCQ 現代賽 / 週五 FNM / 台北公開賽"
            className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all shadow-inner"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-zinc-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>建立中</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>開賽記錄</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 賽事列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            歷史賽事紀錄
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
              {races.length}
            </span>
          </h2>
        </div>

        {races.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400 font-medium">尚無賽事紀錄</p>
            <p className="text-xs text-zinc-600 mt-1">在上方輸入賽事名稱即可開始計時第一場比賽</p>
          </div>
        ) : (
          <div className="space-y-3">
            {races.map((race) => {
              const totalRounds = race.rounds?.length ?? 0
              const totalTime = (race.rounds ?? []).reduce((acc, r) => acc + (r.duration ?? 0), 0)
              const isOngoing = race.status === 'ongoing'

              return (
                <button
                  key={race.id}
                  onClick={() => onSelectRace(race.id)}
                  className="w-full text-left rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                          {race.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isOngoing
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {isOngoing ? '● 進行中' : '✓ 已結算'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono mt-2">
                        <span>📅 {formatDate(race.date)}</span>
                        <span>⚔️ {totalRounds} 輪 (Rounds)</span>
                        {totalRounds > 0 && (
                          <span className="text-zinc-400 font-medium">⏱ 累計 {formatDuration(totalTime)}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-zinc-600 group-hover:text-zinc-300 transition-colors pt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
