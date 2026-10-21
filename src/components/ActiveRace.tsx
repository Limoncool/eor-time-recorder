import { useState, useEffect, useRef } from 'react'
import { Tournament, TournamentRound } from '../types'
import { updateRaceRounds, finishRace } from '../services/raceService'

interface Props {
  race: Tournament
}

// 格式化時間點 (14:30:15)
function formatClock(ms: number | null) {
  if (!ms) return '-'
  return new Date(ms).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// 格式化經過時長 (25m 30s)
function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined || ms < 0) return '-'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

// 格式化 EoR 差距時間 (+04m 12s / -02m 30s)
function formatEoR(diffMs: number | null) {
  if (diffMs === null || diffMs === undefined) return '-'
  const totalSec = Math.round(Math.abs(diffMs) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const sign = diffMs >= 0 ? '+' : '-'
  return `${sign}${m}m ${String(s).padStart(2, '0')}s`
}

// 大計時器倒數/正數格式化
function formatTimerDisplay(diffMs: number) {
  const isOvertime = diffMs < 0
  const totalSec = Math.floor(Math.abs(diffMs) / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const tenths = Math.floor((Math.abs(diffMs) % 1000) / 100)
  return {
    isOvertime,
    text: `${isOvertime ? '+' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`,
  }
}

export default function ActiveRace({ race }: Props) {
  const [now, setNow] = useState(Date.now())
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null)
  const [manualTimeInput, setManualTimeInput] = useState<{
    field: 'pairingsTime' | 'startTime' | 'actualEndTime'
    value: string
  } | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const rounds = race.rounds ?? []
  const isFinished = race.status === 'finished'

  // 找目前進行中的輪次 (有開始時間但還沒結束)
  const activeRound = rounds.find((r) => r.startTime !== null && r.actualEndTime === null) ?? null

  // 找下一個待開始的輪次
  const nextPendingRound = rounds.find((r) => r.startTime === null) ?? null

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 100)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // 記錄：公布配對
  async function handleMarkPairings(roundId: string) {
    const updated = rounds.map((r) =>
      r.id === roundId ? { ...r, pairingsTime: Date.now() } : r
    )
    await updateRaceRounds(race.id, updated)
  }

  // 記錄：本輪開始 (自動推算 預計結束時間 = 開始 + 25m)
  async function handleStartRound(roundId: string) {
    const startTime = Date.now()
    const updated = rounds.map((r) => {
      if (r.id === roundId) {
        const roundMin = r.roundMinutes || 25
        return {
          ...r,
          startTime,
          scheduledEndTime: startTime + roundMin * 60 * 1000,
          actualEndTime: null,
        }
      }
      return r
    })
    await updateRaceRounds(race.id, updated)
  }

  // 記錄：本輪實際結束 (EoR)
  async function handleEndRound(roundId: string) {
    const actualEndTime = Date.now()
    const updated = rounds.map((r) =>
      r.id === roundId ? { ...r, actualEndTime } : r
    )
    await updateRaceRounds(race.id, updated)
  }

  // 增加額外輪次
  async function handleAddExtraRound() {
    const lastRound = rounds[rounds.length - 1]
    const nextNum = (lastRound?.roundNumber ?? 0) + 1
    const newRound: TournamentRound = {
      id: `extra-${nextNum}`,
      stage: 'swiss',
      roundNumber: nextNum,
      name: `R${nextNum} (加賽)`,
      pairingsTime: null,
      startTime: null,
      scheduledEndTime: null,
      actualEndTime: null,
      roundMinutes: 25,
      note: '',
    }
    await updateRaceRounds(race.id, [...rounds, newRound])
  }

  // 手動校正時間儲存
  async function handleSaveManualTime(roundId: string) {
    if (!manualTimeInput) return
    const [hh, mm, ss] = manualTimeInput.value.split(':').map(Number)
    if (isNaN(hh) || isNaN(mm)) {
      alert('請輸入正確時間格式 (例如 14:30 或 14:30:00)')
      return
    }

    const targetDate = new Date()
    targetDate.setHours(hh, mm, ss || 0, 0)
    const timestamp = targetDate.getTime()

    const updated = rounds.map((r) => {
      if (r.id === roundId) {
        const updatedRound = { ...r, [manualTimeInput.field]: timestamp }
        if (manualTimeInput.field === 'startTime') {
          updatedRound.scheduledEndTime = timestamp + (r.roundMinutes || 25) * 60 * 1000
        }
        return updatedRound
      }
      return r
    })

    await updateRaceRounds(race.id, updated)
    setEditingRoundId(null)
    setManualTimeInput(null)
  }

  // 結束比賽
  async function handleFinishRace() {
    if (confirm('確定要結束這場賽事並封存紀錄嗎？')) {
      if (activeRound) await handleEndRound(activeRound.id)
      await finishRace(race.id)
    }
  }

  // 複製表格文字至剪貼簿
  function handleCopyTableSummary() {
    const lines = [
      `【${race.name}】時間紀錄表`,
      `日期：${race.date}`,
      '--------------------------------------------------------------------------------',
      '輪次\t配對公布\t開始時間\t預計結束\t實際結束\tEoR時間\t輪長\t輪間時長',
    ]

    rounds.forEach((r, idx) => {
      const nextR = rounds[idx + 1]
      const eor =
        r.actualEndTime && r.scheduledEndTime ? r.actualEndTime - r.scheduledEndTime : null
      const duration =
        r.actualEndTime && r.startTime ? r.actualEndTime - r.startTime : null
      const turnaround =
        r.actualEndTime && nextR?.startTime ? nextR.startTime - r.actualEndTime : null

      lines.push(
        `${r.name}\t${formatClock(r.pairingsTime)}\t${formatClock(r.startTime)}\t${formatClock(
          r.scheduledEndTime
        )}\t${formatClock(r.actualEndTime)}\t${formatEoR(eor)}\t${formatDuration(
          duration
        )}\t${formatDuration(turnaround)}`
      )
    })

    navigator.clipboard.writeText(lines.join('\n'))
    alert('已複製賽事表格資料至剪貼簿！可直接貼上至 Excel 或通訊軟體。')
  }

  // 計算即時倒數
  let remainingMs = 0
  let isOvertime = false
  if (activeRound?.startTime && activeRound.scheduledEndTime) {
    remainingMs = activeRound.scheduledEndTime - now
    isOvertime = remainingMs < 0
  }

  return (
    <div className="space-y-6">
      {/* 頂部賽事資訊橫幅 */}
      <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-black border border-white/10 p-5 backdrop-blur-xl shadow-[0_0_35px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] relative overflow-hidden">
        {/* 背景微光 */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm">{race.name}</h2>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                寶可夢卡牌 (PTCG) • 25m/輪
              </span>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                  isFinished
                    ? 'bg-zinc-800 text-zinc-400 border-white/10'
                    : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                }`}
              >
                {isFinished ? '✓ 已封存' : '● 賽事進行中'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-2.5 flex-wrap">
              <span>📅 {race.date}</span>
              <span>•</span>
              <span>
                賽制：瑞士輪 {race.config?.swissRoundsCount ?? rounds.length} 輪
                {race.config?.hasTopCut ? ` + Top ${race.config.topCutSize} 複賽` : ''}
              </span>
              <span>•</span>
              <span className="text-zinc-300 font-semibold">
                進度：{rounds.filter((r) => r.actualEndTime !== null).length} / {rounds.length} 輪完成
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleCopyTableSummary}
              title="複製表格數據"
              className="group relative overflow-hidden text-xs font-bold text-zinc-200 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-white/30 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>複製表格</span>
            </button>

            {!isFinished && (
              <button
                onClick={handleFinishRace}
                className="text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600/80 border border-rose-500/50 hover:border-rose-400 px-3.5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] active:scale-95 flex items-center gap-1.5"
              >
                <span>🏁</span>
                <span>結算此賽事</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主即時計時器看板 (當有正在進行中的輪次時顯眼呈現) */}
      {!isFinished && activeRound && (
        <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-white/10 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.1)] text-center overflow-hidden">
          {/* 強烈顯著的光暈動畫 */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-[550px] h-48 blur-3xl pointer-events-none transition-all duration-700 ${
              isOvertime
                ? 'bg-rose-500/35 shadow-[0_0_100px_rgba(244,63,94,0.5)] animate-pulse'
                : 'bg-emerald-500/25 shadow-[0_0_90px_rgba(16,185,129,0.35)]'
            }`}
          />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-950/90 border border-white/10 text-xs font-mono shadow-md">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOvertime ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)] animate-ping' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse'
                }`}
              />
              <span className="font-extrabold text-white tracking-wide">{activeRound.name} 進行中</span>
              <span className="text-zinc-600">|</span>
              <span className={isOvertime ? 'text-rose-400 font-extrabold' : 'text-zinc-300'}>
                {isOvertime ? '⚠️ 已超時進入 EoR / 延長回合' : '常規 25 分鐘倒數'}
              </span>
            </div>

            {/* 大數字計時器 */}
            <div>
              <div
                className={`text-6xl sm:text-7xl font-mono font-black tracking-tight ${
                  isOvertime
                    ? 'text-rose-400 drop-shadow-[0_0_35px_rgba(244,63,94,0.65)]'
                    : 'text-zinc-100 drop-shadow-[0_0_30px_rgba(255,255,255,0.35)]'
                }`}
              >
                {formatTimerDisplay(remainingMs).text}
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-3 flex items-center justify-center gap-4 flex-wrap">
                <span>配對時間：<strong className="text-zinc-200">{formatClock(activeRound.pairingsTime)}</strong></span>
                <span>•</span>
                <span>開始時間：<strong className="text-zinc-200">{formatClock(activeRound.startTime)}</strong></span>
                <span>•</span>
                <span>預計結束：<strong className="text-zinc-200">{formatClock(activeRound.scheduledEndTime)}</strong></span>
              </div>
            </div>

            {/* 快速結束本輪按鈕 */}
            <div className="pt-2">
              <button
                onClick={() => handleEndRound(activeRound.id)}
                className="relative group overflow-hidden w-full max-w-sm mx-auto bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 active:scale-95 text-white py-3 px-6 rounded-2xl font-black text-sm sm:text-base shadow-[0_0_30px_rgba(225,29,72,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_45px_rgba(225,29,72,0.85)] transition-all duration-200 flex items-center justify-center gap-2 border border-rose-300/60 cursor-pointer"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                <div className="w-3.5 h-3.5 bg-white rounded-xs shadow-xs" />
                <span>記錄實際結束時間 (本輪打完 / EoR)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 如果沒有輪次正在進行，顯示下一輪快速開始卡片 */}
      {!isFinished && !activeRound && nextPendingRound && (
        <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 via-zinc-950 to-black border border-white/10 p-6 text-center space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] relative overflow-hidden">
          <div className="text-xs font-mono text-zinc-400">
            上一輪已結束，準備進行下一輪
          </div>
          <div className="text-2xl font-black text-white drop-shadow-sm">
            下一輪：{nextPendingRound.name} (單輪 25 分鐘)
          </div>

          <div className="flex items-center justify-center gap-3.5 flex-wrap pt-1">
            {/* ActiveRace 341行：精簡字數 */}
            {!nextPendingRound.pairingsTime ? (
              <button
                onClick={() => handleMarkPairings(nextPendingRound.id)}
                className="group relative overflow-hidden bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-white border border-sky-400/50 hover:border-sky-300 px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>📢</span>
                <span>公佈配對</span>
              </button>
            ) : (
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/50 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                ✓ 配對已公佈 ({formatClock(nextPendingRound.pairingsTime)})
              </span>
            )}

            {/* ActiveRace 357行：改成 {nextPendingRound.name} 開始 */}
            <button
              onClick={() => handleStartRound(nextPendingRound.id)}
              className="relative group overflow-hidden bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 active:scale-95 text-black font-black px-6 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-[0_0_25px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.75)] flex items-center gap-2 border border-emerald-300/80 cursor-pointer"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
              <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{nextPendingRound.name} 開始</span>
            </button>
          </div>
        </div>
      )}

      {/* 核心時間表格 (Table) */}
      <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 via-zinc-950/95 to-black border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 drop-shadow-sm">
              <span>📊</span>
              <span>賽事輪次時間紀錄總表</span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              自動計算 EoR 時間 (實際-預計)、本輪時長 (實際-開始)、輪間時長 (下輪開始-本輪實際)
            </p>
          </div>

          <button
            onClick={handleAddExtraRound}
            className="text-xs font-bold text-zinc-200 hover:text-amber-300 bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-amber-400/50 px-3.5 py-1.5 rounded-xl transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-amber-400 font-extrabold">＋</span>
            <span>新增額外輪次</span>
          </button>
        </div>

        {/* 響應式可滑動表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-950/90 text-zinc-400 uppercase font-mono tracking-wider border-b border-white/10 text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold sticky left-0 bg-zinc-950 z-10 border-r border-white/10">
                  輪次
                </th>
                <th className="py-3.5 px-3.5 font-bold">配對公布時間</th>
                <th className="py-3.5 px-3.5 font-bold">開始時間</th>
                <th className="py-3.5 px-3.5 font-bold">預計結束 (+25m)</th>
                <th className="py-3.5 px-3.5 font-bold">實際結束時間</th>
                <th className="py-3.5 px-3.5 font-bold text-center bg-zinc-900/30">
                  EoR 時間 (延遲/提早)
                </th>
                <th className="py-3.5 px-3.5 font-bold text-center">輪長 (總時長)</th>
                <th className="py-3.5 px-3.5 font-bold text-center bg-zinc-900/30">
                  輪間時長 (Turnaround)
                </th>
                <th className="py-3.5 px-3.5 font-bold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {rounds.map((round, idx) => {
                const isCurrentActive = round.startTime !== null && round.actualEndTime === null
                const nextRound = rounds[idx + 1]

                const scheduled = round.scheduledEndTime
                const eorDiff =
                  round.actualEndTime && scheduled
                    ? round.actualEndTime - scheduled
                    : isCurrentActive && scheduled && now > scheduled
                    ? now - scheduled
                    : null

                const roundDuration =
                  round.actualEndTime && round.startTime
                    ? round.actualEndTime - round.startTime
                    : isCurrentActive && round.startTime
                    ? now - round.startTime
                    : null

                const turnaround =
                  round.actualEndTime && nextRound?.startTime
                    ? nextRound.startTime - round.actualEndTime
                    : round.actualEndTime && !nextRound?.startTime && !isFinished
                    ? now - round.actualEndTime
                    : null

                return (
                  <tr
                    key={round.id}
                    className={`transition-colors hover:bg-white/[0.03] ${
                      isCurrentActive
                        ? 'bg-amber-500/[0.06]'
                        : round.actualEndTime !== null
                        ? 'bg-zinc-900/20'
                        : ''
                    }`}
                  >
                    {/* 輪次名稱 */}
                    <td className="py-3.5 px-4 font-bold text-zinc-100 sticky left-0 bg-zinc-950/95 backdrop-blur-md z-10 border-r border-white/10">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCurrentActive
                              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)] animate-ping'
                              : round.actualEndTime !== null
                              ? 'bg-zinc-500'
                              : 'bg-zinc-800'
                          }`}
                        />
                        <span className="text-sm font-extrabold">{round.name}</span>
                        {round.stage === 'topcut' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-xs">
                            複賽
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 配對公布時間 */}
                    <td className="py-3.5 px-3.5">
                      {round.pairingsTime ? (
                        <span className="text-zinc-200 font-semibold">{formatClock(round.pairingsTime)}</span>
                      ) : (
                        <button
                          onClick={() => handleMarkPairings(round.id)}
                          className="group relative overflow-hidden bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-400/50 hover:border-sky-300 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <span>📢</span>
                          <span>記配對</span>
                        </button>
                      )}
                    </td>

                    {/* 開始時間 */}
                    <td className="py-3.5 px-3.5">
                      {round.startTime ? (
                        <span className="text-zinc-100 font-bold">
                          {formatClock(round.startTime)}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartRound(round.id)}
                          className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold px-3.5 py-1 rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)] active:scale-95 flex items-center gap-1 border border-emerald-300/80 cursor-pointer"
                        >
                          <span>▶</span>
                          <span>開始 (25m)</span>
                        </button>
                      )}
                    </td>

                    {/* 預計結束時間 */}
                    <td className="py-3.5 px-3.5 text-zinc-400 font-semibold">
                      {formatClock(scheduled)}
                    </td>

                    {/* 實際結束時間 */}
                    <td className="py-3.5 px-3.5">
                      {round.actualEndTime ? (
                        <span className="text-zinc-100 font-bold">
                          {formatClock(round.actualEndTime)}
                        </span>
                      ) : isCurrentActive ? (
                        <button
                          onClick={() => handleEndRound(round.id)}
                          className="group relative overflow-hidden bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 text-white font-extrabold px-3.5 py-1 rounded-lg text-xs transition-all shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:shadow-[0_0_30px_rgba(244,63,94,0.9)] animate-pulse active:scale-95 flex items-center gap-1 border border-rose-400/80 cursor-pointer"
                        >
                          <div className="w-2 h-2 bg-white rounded-xs shadow-xs" />
                          <span>記結束 (EoR)</span>
                        </button>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* EoR 時間 */}
                    <td className="py-3.5 px-3.5 text-center bg-zinc-900/30">
                      {eorDiff !== null ? (
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold inline-block ${
                            eorDiff > 0
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          }`}
                        >
                          {formatEoR(eorDiff)}
                          {isCurrentActive && eorDiff > 0 && ' (進行中)'}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 輪長 */}
                    <td className="py-3.5 px-3.5 text-center font-bold text-zinc-100">
                      {roundDuration !== null ? (
                        <span>
                          {formatDuration(roundDuration)}
                          {isCurrentActive && (
                            <span className="text-[10px] text-amber-400 font-normal ml-1">
                              (進行中)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 輪間時長 */}
                    <td className="py-3.5 px-3.5 text-center bg-zinc-900/30 text-zinc-200">
                      {idx === rounds.length - 1 ? (
                        <span className="text-zinc-500 text-[11px] font-semibold">賽事結束</span>
                      ) : turnaround !== null ? (
                        <span
                          className={`font-bold ${
                            nextRound?.startTime ? 'text-zinc-200' : 'text-amber-300 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          }`}
                        >
                          {formatDuration(turnaround)}
                          {!nextRound?.startTime && ' (換輪中...)'}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 操作 (補登/校正) */}
                    <td className="py-3.5 px-3.5 text-right">
                      {editingRoundId === round.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-black border border-white/20 p-1.5 rounded-xl shadow-lg">
                          <select
                            className="bg-zinc-900 text-zinc-200 text-xs rounded-lg px-1.5 py-1 outline-none border border-white/10"
                            value={manualTimeInput?.field || 'actualEndTime'}
                            onChange={(e) =>
                              setManualTimeInput({
                                field: e.target.value as any,
                                value: manualTimeInput?.value || '',
                              })
                            }
                          >
                            <option value="pairingsTime">配對</option>
                            <option value="startTime">開始</option>
                            <option value="actualEndTime">結束</option>
                          </select>
                          <input
                            type="text"
                            placeholder="14:30:00"
                            className="w-20 bg-zinc-900 text-zinc-100 px-2 py-1 text-xs rounded-lg outline-none border border-white/10 font-mono"
                            value={manualTimeInput?.value || ''}
                            onChange={(e) =>
                              setManualTimeInput({
                                field: manualTimeInput?.field || 'actualEndTime',
                                value: e.target.value,
                              })
                            }
                          />
                          <button
                            onClick={() => handleSaveManualTime(round.id)}
                            className="bg-amber-400 hover:bg-amber-300 text-black px-2 py-1 rounded-lg text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
                          >
                            存
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoundId(null)
                              setManualTimeInput(null)
                            }}
                            className="text-zinc-400 hover:text-white px-1.5 text-xs transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingRoundId(round.id)
                            setManualTimeInput({
                              field: 'actualEndTime',
                              value: '',
                            })
                          }}
                          title="手動校正時間"
                          className="text-xs font-semibold text-zinc-400 hover:text-amber-300 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-amber-400/40 px-2.5 py-1 rounded-lg transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                        >
                          ✎ 校正
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
