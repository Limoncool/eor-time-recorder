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
    <div className="space-y-6">
      {/* 建立賽事表單 */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/90 p-5 sm:p-6 shadow-sm space-y-4 transition-colors"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <h2 className="text-xs font-bold tracking-wider text-zinc-800 dark:text-zinc-200 uppercase">
              建立新賽事
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-full font-medium">
            每輪 25 分鐘
          </span>
        </div>

        {/* 賽事名稱與輪數輸入列 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 賽事名稱 (佔 2 格) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              賽事名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：新竹XXX(店名)道館賽、台北XXX(店名)超級球聯盟賽"
              className="w-full bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 focus:border-amber-500 dark:focus:border-amber-400/80 focus:bg-white dark:focus:bg-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition shadow-2xs"
            />
          </div>

          {/* 瑞士輪總輪數 (下拉式選單) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              瑞士輪輪數
            </label>
            <div className="relative">
              <select
                value={swissRounds}
                onChange={(e) => setSwissRounds(Number(e.target.value))}
                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 focus:border-amber-500 dark:focus:border-amber-400/80 focus:bg-white dark:focus:bg-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none transition cursor-pointer pr-10 shadow-2xs"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    {num} 輪
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 dark:text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 展開完整自訂按鈕 */}
        <div>
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer py-1"
          >
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{showConfig ? '▲' : '▼'}</span>
            <span>{showConfig ? '收合進階賽制' : '展開完整自訂 (單淘汰複賽)'}</span>
            {hasTopCut && (
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-1.5 py-0.2 rounded-full font-bold">
                Top {topCutSize}
              </span>
            )}
          </button>
        </div>

        {/* 展開的自訂區塊 */}
        {showConfig && (
          <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-4 space-y-3.5 transition">
            {/* 單淘汰複賽設定 */}
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">單淘汰賽複賽 (Top Cut)</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">瑞士輪結束後是否進行淘汰賽晉級</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-200/80 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-300/80 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setHasTopCut(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      !hasTopCut
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    無複賽
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasTopCut(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      hasTopCut
                        ? 'bg-amber-400 text-zinc-950 font-bold shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    有複賽
                  </button>
                </div>
              </div>

              {/* 複賽取幾強 (下拉選單) */}
              {hasTopCut && (
                <div className="mt-3 pl-3 border-l-2 border-zinc-300 dark:border-zinc-700 space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    複賽取幾強 (Top Cut)：
                  </label>
                  <div className="relative max-w-xs">
                    <select
                      value={topCutSize}
                      onChange={(e) => setTopCutSize(Number(e.target.value))}
                      className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-amber-500 dark:focus:border-amber-400/80 rounded-xl px-3.5 py-2 text-xs text-zinc-800 dark:text-zinc-200 font-mono outline-none cursor-pointer pr-10 shadow-2xs"
                    >
                      <option value={4} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Top 4 (4強賽、決賽 - 共2輪)</option>
                      <option value={8} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Top 8 (8強、4強、決賽 - 共3輪)</option>
                      <option value={16} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Top 16 (16強～決賽 - 共4輪)</option>
                      <option value={32} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Top 32 (32強～決賽 - 共5輪)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 dark:text-zinc-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 預估總輪數 (常駐顯示) */}
        <div className="flex items-center justify-between text-xs font-mono bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-3.5 py-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>預估總賽程：</span>
          </div>
          <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 flex-wrap">
            <span>瑞士輪 {swissRounds || 0} 輪</span>
            {hasTopCut ? (
              <>
                <span className="text-zinc-400 dark:text-zinc-600">+</span>
                <span className="text-amber-600 dark:text-amber-400">Top {topCutSize} 複賽 ({topCutRoundCount} 輪)</span>
                <span className="text-zinc-400 dark:text-zinc-600">=</span>
                <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg">
                  共 {totalRoundsEstimated} 輪
                </span>
              </>
            ) : (
              <span className="text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-lg">
                共 {swissRounds || 0} 輪 (純瑞士輪)
              </span>
            )}
          </div>
        </div>

        {/* 建立賽事按鈕 (統一精美樣式) */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={creating}
            className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-950 font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {creating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>建立中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>建立賽事</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 歷史賽事列表 */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            賽事紀錄列表
            <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              {races.length}
            </span>
          </h2>
        </div>

        {races.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 p-12 text-center">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">尚無賽事紀錄</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">在上方輸入賽事名稱並設定輪數即可開始記錄！</p>
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
                  className="cursor-pointer w-full text-left rounded-2xl bg-white dark:bg-zinc-950/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 p-4 sm:p-5 transition-all duration-150 group shadow-xs hover:shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors truncate text-sm sm:text-base">
                          {race.name}
                        </span>

                        {/* 狀態標籤：比賽正在進行中 (綠色) / 比賽已完成 (紅色) */}
                        <span
                          className={`font-mono px-3 py-1 rounded-full text-xs font-bold ${
                            isOngoing ? 'status-badge-ongoing' : 'status-badge-completed'
                          }`}
                          style={{
                            color: isOngoing ? '#16a34a' : '#dc2626',
                            backgroundColor: isOngoing ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.16)',
                            borderColor: isOngoing ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.45)',
                          }}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${isOngoing ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: isOngoing ? '#16a34a' : '#dc2626' }}
                          />
                          <span>{isOngoing ? '比賽正在進行中' : '比賽已完成'}</span>
                        </span>

                        {race.config?.hasTopCut && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 font-medium">
                            Top {race.config.topCutSize}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-2 flex-wrap">
                        <span>📅 {formatDate(race.date)}</span>
                        <span>
                          ⚔️ 輪次：{finishedRounds} / {totalRounds} 完成
                        </span>
                        <span>⏱ 單輪 25m</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* 清晰明顯的刪除按鈕 */}
                      <button
                        type="button"
                        title={`刪除「${race.name}」紀錄`}
                        onClick={(e) => handleDelete(e, race.id, race.name)}
                        className="btn-delete-race active:scale-95"
                      >
                        <svg
                          className="w-4.5 h-4.5 stroke-[2] shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>刪除賽事</span>
                      </button>

                      <div className="text-zinc-300 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors pl-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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