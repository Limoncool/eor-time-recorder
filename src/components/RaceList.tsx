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
        className="rounded-2xl bg-zinc-900/60 border border-zinc-800/90 p-5 shadow-2xl backdrop-blur-sm relative overflow-hidden space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-bold tracking-wide text-zinc-100 uppercase">
              建立新賽事
            </h2>
          </div>
          <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            每輪 25 分鐘
          </span>
        </div>

        {/* 賽事名稱與輪數輸入列 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 賽事名稱 (佔 2 格) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              賽事名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：新竹道館賽、超級球聯盟賽"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/80 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all shadow-inner"
            />
          </div>

          {/* 瑞士輪總輪數 (用輸入的) */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              瑞士輪輪數
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="30"
                value={swissRounds}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setSwissRounds(isNaN(val) ? 0 : val)
                }}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/80 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono font-bold outline-none transition-all shadow-inner text-center"
              />
              <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">輪</span>
            </div>
          </div>
        </div>

        {/* 展開完整自訂按鈕 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 font-medium py-1"
          >
            <span>{showConfig ? '▲ 收合自訂賽制' : '▼ 展開完整自訂 (單淘汰複賽等)'}</span>
            {hasTopCut && !showConfig && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                Top {topCutSize}
              </span>
            )}
          </button>
        </div>

        {/* 展開的自訂區塊 (根據 showConfig 顯示/隱藏) */}
        {showConfig && (
          <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-3.5 space-y-3.5 transition-all">
            {/* 單淘汰複賽設定 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-medium text-zinc-300">單淘汰賽複賽 (Top Cut)</div>
                  <div className="text-[10px] text-zinc-500">瑞士輪結束後是否進行淘汰賽</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setHasTopCut(false)}
                    className={`px-2.5 py-1 rounded text-xs transition ${
                      !hasTopCut
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    無複賽
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasTopCut(true)}
                    className={`px-2.5 py-1 rounded text-xs transition ${
                      hasTopCut
                        ? 'bg-amber-500 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    有複賽
                  </button>
                </div>
              </div>

              {hasTopCut && (
                <div className="mt-2.5 pl-3 border-l-2 border-amber-500/50 space-y-1.5">
                  <label className="block text-[11px] text-zinc-400">複賽取幾強：</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[4, 8, 16, 32].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setTopCutSize(size)}
                        className={`py-1 rounded-lg text-xs font-mono transition ${
                          topCutSize === size
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        Top {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 總結資訊 */}
            <div className="text-[11px] text-zinc-400 bg-zinc-900/60 rounded-lg px-3 py-2 font-mono flex items-center justify-between">
              <span>預估總輪次：</span>
              <span className="text-zinc-200 font-semibold">
                瑞士輪 {swissRounds || 0} 輪
                {hasTopCut ? ` + Top ${topCutSize} (${topCutRoundCount} 輪) = 共 ${totalRoundsEstimated} 輪` : ' (無複賽)'}
              </span>
            </div>
          </div>
        )}

        {/* 提交按鈕列 (精緻緊湊尺寸) */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={creating}
            className="bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-zinc-950 font-bold py-2 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-1.5"
          >
            {creating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>建立中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="cursor-pointer w-full text-left rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 transition-all duration-200 group relative overflow-hidden"
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
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
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
                        className="text-zinc-600 hover:text-rose-400 p-2 rounded-lg hover:bg-zinc-800 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="text-zinc-600 group-hover:text-zinc-300 transition-colors">
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
