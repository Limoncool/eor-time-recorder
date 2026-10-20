import { useState } from 'react'
import { Tournament, TournamentConfig } from '../types'
import { createTournament, deleteRace } from '../services/raceService'

interface Props {
  races: Tournament[]
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

export default function RaceList({ races, onSelectRace, onNewRace }: Props) {
  const [name, setName] = useState('')
  const [swissRounds, setSwissRounds] = useState<number>(5)
  const [hasTopCut, setHasTopCut] = useState(false)
  const [topCutSize, setTopCutSize] = useState<number>(8)
  const [creating, setCreating] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const today = new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    const tournamentName = name.trim() || `PTCG 道館賽 (${today})`

    const validRounds = Math.max(1, swissRounds || 5)

    const config: TournamentConfig = {
      game: 'ptcg',
      roundDurationMinutes: 25,
      swissRoundsCount: validRounds,
      hasTopCut,
      topCutSize: hasTopCut ? topCutSize : 0,
    }

    setCreating(true)
    try {
      const id = await createTournament(tournamentName, config)
      setName('')
      onNewRace(id)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, raceId: string, raceName: string) {
    e.stopPropagation()
    if (confirm(`確定要刪除「${raceName}」的紀錄嗎？`)) {
      await deleteRace(raceId)
    }
  }

  // 計算預計總輪數
  const topCutRoundCount = hasTopCut ? Math.log2(topCutSize) : 0
  const totalRoundsEstimated = (swissRounds || 5) + topCutRoundCount

  return (
    <div className="space-y-8">
      {/* 建立賽事表單 */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-zinc-900/60 border border-zinc-800/90 p-5 sm:p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md relative overflow-hidden space-y-4"
      >
        {/* 背景裝飾光芒 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
            <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              建立新賽事
            </h2>
          </div>
          <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            每輪 25 分鐘
          </span>
        </div>

        {/* 賽事名稱與輪數輸入列 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 賽事名稱 (佔 2 格) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              賽事名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：新竹XXX(店名)道館賽、台北XXX(店名)超級球聯盟賽"
              className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all shadow-inner"
            />
          </div>

          {/* 瑞士輪總輪數 (用輸入的) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              瑞士輪輪數
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="30"
                value={swissRounds}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setSwissRounds(isNaN(val) ? 0 : val)
                }}
                className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-mono font-bold outline-none transition-all shadow-inner text-center"
              />
              <span className="text-xs text-zinc-400 font-mono font-semibold whitespace-nowrap">輪</span>
            </div>
          </div>
        </div>

        {/* 展開完整自訂按鈕 (酷炫賽博按鈕樣式) */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="group relative overflow-hidden bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-95"
          >
            <span className="text-[10px] text-amber-400 font-bold transition-transform duration-200 group-hover:scale-125">
              {showConfig ? '▲' : '▼'}
            </span>
            <span>{showConfig ? '收合自訂賽制' : '展開完整自訂 (單淘汰複賽)'}</span>
            {hasTopCut && (
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 rounded-full shadow-xs">
                Top {topCutSize}
              </span>
            )}
          </button>
        </div>

        {/* 展開的自訂區塊 (根據 showConfig 顯示/隱藏) */}
        {showConfig && (
          <div className="rounded-xl bg-zinc-950/90 border border-zinc-800/90 p-4 space-y-3.5 transition-all shadow-inner">
            {/* 單淘汰複賽設定 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">單淘汰賽複賽 (Top Cut)</div>
                  <div className="text-[10px] text-zinc-500">瑞士輪結束後是否進行淘汰賽晉級</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setHasTopCut(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                      !hasTopCut
                        ? 'bg-gradient-to-r from-zinc-800 to-zinc-700 text-white shadow-md border border-zinc-600/50'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    無複賽
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasTopCut(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                      hasTopCut
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-amber-300/50'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    有複賽
                  </button>
                </div>
              </div>

              {hasTopCut && (
                <div className="mt-3 pl-3 border-l-2 border-amber-500/60 space-y-2">
                  <label className="block text-[11px] font-semibold text-zinc-400">複賽取幾強：</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[4, 8, 16, 32].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setTopCutSize(size)}
                        className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-200 active:scale-95 ${
                          topCutSize === size
                            ? 'bg-gradient-to-br from-amber-500/25 to-orange-500/25 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                            : 'bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        Top {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 預估總輪數 (移至展開框外面，常駐顯示！) */}
        <div className="flex items-center justify-between text-xs font-mono bg-zinc-950/90 border border-zinc-800/80 rounded-xl px-4 py-2.5 shadow-inner">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            <span>預估總賽程：</span>
          </div>
          <div className="font-bold text-zinc-100 flex items-center gap-2">
            <span>瑞士輪 {swissRounds || 0} 輪</span>
            {hasTopCut ? (
              <>
                <span className="text-zinc-600">+</span>
                <span className="text-amber-400">Top {topCutSize} 複賽 ({topCutRoundCount} 輪)</span>
                <span className="text-zinc-600">=</span>
                <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md shadow-xs">
                  共 {totalRoundsEstimated} 輪
                </span>
              </>
            ) : (
              <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                共 {swissRounds || 0} 輪 (純瑞士輪)
              </span>
            )}
          </div>
        </div>

        {/* 提交按鈕列 (酷炫酷感按鈕) */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={creating}
            className="relative group overflow-hidden bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 active:scale-95 text-zinc-950 font-extrabold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-2 border border-amber-300/60 disabled:opacity-50"
          >
            {/* 流動微光掃光動畫效果 */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />

            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>建立中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>建立賽事</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 歷史賽事列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            賽事紀錄列表
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
            <p className="text-xs text-zinc-600 mt-1">在上方輸入賽事名稱並設定輪數即可開始記錄！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {races.map((race) => {
              const totalRounds = race.rounds?.length ?? 0
              const finishedRounds = (race.rounds ?? []).filter((r) => r.actualEndTime !== null).length
              const isOngoing = race.status === 'ongoing'

              return (
                <div
                  key={race.id}
                  onClick={() => onSelectRace(race.id)}
                  className="cursor-pointer w-full text-left rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-4 transition-all duration-200 group relative overflow-hidden shadow-md hover:shadow-[0_0_20px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                          {race.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isOngoing
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {isOngoing ? '● 進行中' : '✓ 已結算'}
                        </span>
                        {race.config?.hasTopCut && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/50">
                            Top {race.config.topCutSize} 複賽
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono mt-2 flex-wrap">
                        <span>📅 {formatDate(race.date)}</span>
                        <span>
                          ⚔️ 輪次進度：{finishedRounds} / {totalRounds} 輪完成
                        </span>
                        <span className="text-zinc-400">⏱ 單輪：25 分鐘</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        title="刪除賽事"
                        onClick={(e) => handleDelete(e, race.id, race.name)}
                        className="text-zinc-600 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-950/30 hover:border hover:border-rose-900/50 transition-all active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="text-zinc-600 group-hover:text-amber-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
