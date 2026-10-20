import { useState, useEffect, useRef } from 'react'
import { Race, Round } from '../types'
import { updateRaceRounds, finishRace } from '../services/raceService'

interface Props {
  race: Race
}

function formatStopwatch(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const tenths = Math.floor((ms % 1000) / 100)

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function formatTimestamp(ms: number | null) {
  if (!ms) return '-'
  return new Date(ms).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActiveRace({ race }: Props) {
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const rounds = race.rounds ?? []
  const activeRound = rounds.find((r) => r.startTime !== null && r.endTime === null) ?? null
  const isFinished = race.status === 'finished'

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 100)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // 開始新一輪
  async function handleStartRound() {
    const newRound: Round = {
      roundNumber: rounds.length + 1,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      note: '',
    }
    await updateRaceRounds(race.id, [...rounds, newRound])
  }

  // 結束當前輪次
  async function handleEndRound() {
    if (!activeRound) return
    const endTime = Date.now()
    const duration = Math.floor((endTime - activeRound.startTime!) / 1000)
    const updated = rounds.map((r) =>
      r.roundNumber === activeRound.roundNumber ? { ...r, endTime, duration } : r
    )
    await updateRaceRounds(race.id, updated)
  }

  // 結束賽事
  async function handleFinishRace() {
    if (confirm('確定要結束這場賽事嗎？')) {
      if (activeRound) await handleEndRound()
      await finishRace(race.id)
    }
  }

  const elapsed = activeRound?.startTime ? now - activeRound.startTime : 0
  const isOvertime = activeRound && elapsed > 50 * 60 * 1000 // MTG standard 50 min round

  return (
    <div className="space-y-6">
      {/* 頂部賽事資訊條 */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-white">{race.name}</h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isFinished
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80 animate-pulse'
                }`}
              >
                {isFinished ? '已結案' : '● 賽事進行中'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-1.5">
              <span>📅 {race.date}</span>
              <span>•</span>
              <span>目前總輪數：{rounds.length} 輪</span>
              {rounds.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    總耗時：
                    {formatDuration(rounds.reduce((acc, r) => acc + (r.duration ?? 0), 0))}
                  </span>
                </>
              )}
            </div>
          </div>

          {!isFinished && rounds.length > 0 && !activeRound && (
            <button
              onClick={handleFinishRace}
              className="text-xs font-medium text-zinc-400 hover:text-rose-300 bg-zinc-950 hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-900/50 px-3.5 py-2 rounded-xl transition-all self-start sm:self-auto"
            >
              🏁 結算此賽事
            </button>
          )}
        </div>
      </div>

      {/* 主計時器面板 */}
      {!isFinished && (
        <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 p-7 sm:p-9 shadow-2xl text-center overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 blur-3xl pointer-events-none transition-all duration-700 ${
              activeRound
                ? isOvertime
                  ? 'bg-rose-500/15'
                  : 'bg-amber-500/15'
                : 'bg-zinc-500/5'
            }`}
          />

          {activeRound ? (
            <div className="space-y-6 relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                第 {activeRound.roundNumber} 輪進行中
                {isOvertime && (
                  <span className="text-rose-400 font-bold ml-1">
                    [超過 50 分鐘 - 進入延長回合/Turns]
                  </span>
                )}
              </div>

              {/* 大計時數字 */}
              <div>
                <div className="text-6xl sm:text-7xl font-mono font-extrabold tracking-tight text-zinc-100 drop-shadow-[0_0_35px_rgba(255,255,255,0.08)]">
                  {formatStopwatch(elapsed)}
                </div>
                <div className="text-xs text-zinc-500 font-mono mt-3 flex items-center justify-center gap-2">
                  <span>輪次起始時間：{formatTimestamp(activeRound.startTime)}</span>
                  <span>•</span>
                  <span>MTG 建議輪次：50m 00s</span>
                </div>
              </div>

              {/* 結束輪次按鈕 */}
              <button
                onClick={handleEndRound}
                className="w-full max-w-sm mx-auto bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white py-3.5 px-6 rounded-2xl font-bold text-base shadow-[0_0_25px_rgba(225,29,72,0.35)] transition-all flex items-center justify-center gap-2"
              >
                <div className="w-3 h-3 bg-white rounded-sm" />
                結束第 {activeRound.roundNumber} 輪 (Time & Turns End)
              </button>
            </div>
          ) : (
            <div className="space-y-5 relative py-3">
              <div className="text-zinc-400 text-sm font-medium">
                {rounds.length === 0
                  ? '賽事準備就緒，請在配對公佈後開始第 1 輪'
                  : `第 ${rounds.length} 輪已結束，準備下一輪配對`}
              </div>

              <div className="text-4xl sm:text-5xl font-mono font-bold text-zinc-600">
                00:00.0
              </div>

              <button
                onClick={handleStartRound}
                className="w-full max-w-sm mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-zinc-950 py-3.5 px-6 rounded-2xl font-bold text-base shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                開始第 {rounds.length + 1} 輪計時 (Round Start)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 輪次詳細紀錄 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            輪次歷程與換輪時間 (Round Log)
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
              {rounds.length}
            </span>
          </h3>
        </div>

        {rounds.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-8 text-center text-xs text-zinc-600 font-mono">
            尚未記錄任何輪次
          </div>
        ) : (
          <div className="space-y-2.5">
            {rounds.map((round, idx) => {
              const isRunning = round.endTime === null
              const prevRound = idx > 0 ? rounds[idx - 1] : null
              const turnaround =
                prevRound?.endTime && round.startTime
                  ? Math.floor((round.startTime - prevRound.endTime) / 1000)
                  : null

              return (
                <div key={round.roundNumber} className="space-y-1.5">
                  {/* Turnaround 間隔時間提示 */}
                  {turnaround !== null && (
                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500 py-0.5">
                      <div className="h-px bg-zinc-800/80 flex-1" />
                      <span>換輪間隔 (Turnaround)：{formatDuration(turnaround)}</span>
                      <div className="h-px bg-zinc-800/80 flex-1" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 transition-all border ${
                      isRunning
                        ? 'bg-zinc-900/90 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                            isRunning
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                          }`}
                        >
                          R{round.roundNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200 text-sm">
                              第 {round.roundNumber} 輪
                            </span>
                            {isRunning && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/80 animate-pulse">
                                計時中
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5 flex items-center gap-2">
                            <span>起：{formatTimestamp(round.startTime)}</span>
                            <span>→</span>
                            <span>迄：{round.endTime ? formatTimestamp(round.endTime) : '進行中'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-base ${
                            isRunning
                              ? 'text-amber-400'
                              : (round.duration ?? 0) > 50 * 60
                              ? 'text-rose-400'
                              : 'text-zinc-200'
                          }`}
                        >
                          {isRunning ? formatStopwatch(elapsed) : formatDuration(round.duration)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {isRunning ? '即時時間' : '本輪總時間'}
                        </div>
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
