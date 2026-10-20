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

  // 增加額外輪次 (如果臨時加賽)
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
        // 若改了開始時間，自動重算預計結束時間
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

  // 複製表格文字至剪貼簿 (方使貼到 Discord / LINE / Excel)
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
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-white">{race.name}</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                寶可夢卡牌 (PTCG) • 25m/輪
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isFinished
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80 animate-pulse'
                }`}
              >
                {isFinished ? '✓ 已封存' : '● 賽事進行中'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-2 flex-wrap">
              <span>📅 {race.date}</span>
              <span>•</span>
              <span>
                賽制：瑞士輪 {race.config?.swissRoundsCount ?? rounds.length} 輪
                {race.config?.hasTopCut ? ` + Top ${race.config.topCutSize} 複賽` : ''}
              </span>
              <span>•</span>
              <span>
                進度：{rounds.filter((r) => r.actualEndTime !== null).length} / {rounds.length} 輪完成
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCopyTableSummary}
              title="複製表格數據"
              className="group relative overflow-hidden text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_rgba(255,255,255,0.08)] active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>複製表格</span>
            </button>

            {!isFinished && (
              <button
                onClick={handleFinishRace}
                className="text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 hover:border-rose-600 px-3.5 py-2 rounded-xl transition-all shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] active:scale-95 flex items-center gap-1.5"
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
        <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 blur-3xl pointer-events-none transition-all duration-700 ${
              isOvertime ? 'bg-rose-500/20' : 'bg-emerald-500/15'
            }`}
          />

          <div className="relative space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOvertime ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="font-bold text-zinc-200">{activeRound.name} 正在進行中</span>
              <span className="text-zinc-500">|</span>
              <span className={isOvertime ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                {isOvertime ? '⚠️ 已超時進入 EoR / 延長回合' : '常規 25 分鐘倒數'}
              </span>
            </div>

            {/* 大數字計時器 */}
            <div>
              <div
                className={`text-6xl sm:text-7xl font-mono font-extrabold tracking-tight drop-shadow-md ${
                  isOvertime ? 'text-rose-400' : 'text-zinc-100'
                }`}
              >
                {formatTimerDisplay(remainingMs).text}
              </div>
              <div className="text-xs text-zinc-500 font-mono mt-2.5 flex items-center justify-center gap-4 flex-wrap">
                <span>配對時間：{formatClock(activeRound.pairingsTime)}</span>
                <span>開始時間：{formatClock(activeRound.startTime)}</span>
                <span>預計結束：{formatClock(activeRound.scheduledEndTime)}</span>
              </div>
            </div>

            {/* 快速結束本輪按鈕 (酷炫按鈕樣式) */}
            <div className="pt-2">
              <button
                onClick={() => handleEndRound(activeRound.id)}
                className="relative group overflow-hidden w-full max-w-sm mx-auto bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-400 active:scale-95 text-white py-3.5 px-6 rounded-2xl font-extrabold text-sm sm:text-base shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:shadow-[0_0_45px_rgba(225,29,72,0.7)] transition-all duration-300 flex items-center justify-center gap-2 border border-rose-400/50"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                <div className="w-3.5 h-3.5 bg-white rounded-xs shadow-sm" />
                <span>記錄實際結束時間 (本輪打完 / EoR)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 如果沒有輪次正在進行，顯示下一輪快速開始卡片 */}
      {!isFinished && !activeRound && nextPendingRound && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/90 p-5 text-center space-y-4">
          <div className="text-xs font-mono text-zinc-400">
            上一輪已結束，準備進行下一輪
          </div>
          <div className="text-xl font-bold text-zinc-100">
            下一輪：{nextPendingRound.name} (單輪 25 分鐘)
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {!nextPendingRound.pairingsTime ? (
              <button
                onClick={() => handleMarkPairings(nextPendingRound.id)}
                className="group relative overflow-hidden bg-sky-950/40 hover:bg-sky-900/60 text-sky-400 hover:text-sky-200 border border-sky-700/60 hover:border-sky-400 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all shadow-[0_0_12px_rgba(56,189,248,0.2)] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-95 flex items-center gap-2"
              >
                <span>📢</span>
                <span>公佈配對時間 (Pairings)</span>
              </button>
            ) : (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                ✓ 配對已公佈 ({formatClock(nextPendingRound.pairingsTime)})
              </span>
            )}

            <button
              onClick={() => handleStartRound(nextPendingRound.id)}
              className="relative group overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-zinc-950 font-extrabold px-6 py-2.5 rounded-xl text-sm transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] flex items-center gap-2 border border-emerald-300/60"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
              <svg className="w-4 h-4 fill-zinc-950" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>開始 {nextPendingRound.name} 計時 (25 分鐘)</span>
            </button>
          </div>
        </div>
      )}

      {/* 核心時間表格 (Table) */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/90 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>📊</span>
              <span>賽事輪次時間紀錄總表</span>
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              自動計算 EoR 時間 (實際-預計)、本輪時長 (實際-開始)、輪間時長 (下輪開始-本輪實際)
            </p>
          </div>

          <button
            onClick={handleAddExtraRound}
            className="text-xs font-semibold text-zinc-300 hover:text-amber-300 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-500/50 px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <span className="text-amber-400 font-bold">＋</span>
            <span>新增額外輪次</span>
          </button>
        </div>

        {/* 響應式可滑動表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-mono tracking-wider border-b border-zinc-800 text-[11px]">
              <tr>
                <th className="py-3 px-3.5 font-semibold sticky left-0 bg-zinc-950 z-10 border-r border-zinc-800/60">
                  輪次
                </th>
                <th className="py-3 px-3.5 font-semibold">配對公布時間</th>
                <th className="py-3 px-3.5 font-semibold">開始時間</th>
                <th className="py-3 px-3.5 font-semibold">預計結束 (+25m)</th>
                <th className="py-3 px-3.5 font-semibold">實際結束時間</th>
                <th className="py-3 px-3.5 font-semibold text-center bg-zinc-900/40">
                  EoR 時間 (延遲/提早)
                </th>
                <th className="py-3 px-3.5 font-semibold text-center">輪長 (總時長)</th>
                <th className="py-3 px-3.5 font-semibold text-center bg-zinc-900/40">
                  輪間時長 (Turnaround)
                </th>
                <th className="py-3 px-3.5 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {rounds.map((round, idx) => {
                const isCurrentActive = round.startTime !== null && round.actualEndTime === null
                const nextRound = rounds[idx + 1]

                // 計算：
                // 1. 預計結束時間 = 開始時間 + 25m
                const scheduled = round.scheduledEndTime

                // 2. EoR時間 = 實際結束時間 - 預計結束時間
                const eorDiff =
                  round.actualEndTime && scheduled
                    ? round.actualEndTime - scheduled
                    : isCurrentActive && scheduled && now > scheduled
                    ? now - scheduled
                    : null

                // 3. 輪長 = 實際結束時間 - 開始時間
                const roundDuration =
                  round.actualEndTime && round.startTime
                    ? round.actualEndTime - round.startTime
                    : isCurrentActive && round.startTime
                    ? now - round.startTime
                    : null

                // 4. 輪間時長 = 下一輪開始時間 - 本輪實際結束時間
                const turnaround =
                  round.actualEndTime && nextRound?.startTime
                    ? nextRound.startTime - round.actualEndTime
                    : round.actualEndTime && !nextRound?.startTime && !isFinished
                    ? now - round.actualEndTime
                    : null

                return (
                  <tr
                    key={round.id}
                    className={`transition-colors hover:bg-zinc-800/30 ${
                      isCurrentActive
                        ? 'bg-amber-500/[0.04]'
                        : round.actualEndTime !== null
                        ? 'bg-zinc-900/20'
                        : ''
                    }`}
                  >
                    {/* 輪次名稱 */}
                    <td className="py-3.5 px-3.5 font-bold text-zinc-200 sticky left-0 bg-zinc-900/90 backdrop-blur-sm z-10 border-r border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCurrentActive
                              ? 'bg-amber-400 animate-ping'
                              : round.actualEndTime !== null
                              ? 'bg-zinc-600'
                              : 'bg-zinc-800'
                          }`}
                        />
                        <span>{round.name}</span>
                        {round.stage === 'topcut' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                            複賽
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 配對公布時間 */}
                    <td className="py-3.5 px-3.5">
                      {round.pairingsTime ? (
                        <span className="text-zinc-300">{formatClock(round.pairingsTime)}</span>
                      ) : (
                        <button
                          onClick={() => handleMarkPairings(round.id)}
                          className="group relative overflow-hidden bg-sky-950/40 hover:bg-sky-900/60 text-sky-400 hover:text-sky-200 border border-sky-700/60 hover:border-sky-400 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-[0_0_8px_rgba(56,189,248,0.15)] hover:shadow-[0_0_15px_rgba(56,189,248,0.35)] active:scale-95 flex items-center gap-1"
                        >
                          <span>📢</span>
                          <span>記配對</span>
                        </button>
                      )}
                    </td>

                    {/* 開始時間 */}
                    <td className="py-3.5 px-3.5">
                      {round.startTime ? (
                        <span className="text-zinc-200 font-semibold">
                          {formatClock(round.startTime)}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartRound(round.id)}
                          className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold px-3 py-1 rounded-lg text-[11px] transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 flex items-center gap-1 border border-emerald-300/50"
                        >
                          <span>▶</span>
                          <span>開始 (25m)</span>
                        </button>
                      )}
                    </td>

                    {/* 預計結束時間 (直接從開始時間+25分鐘) */}
                    <td className="py-3.5 px-3.5 text-zinc-400">
                      {formatClock(scheduled)}
                    </td>

                    {/* 實際結束時間 */}
                    <td className="py-3.5 px-3.5">
                      {round.actualEndTime ? (
                        <span className="text-zinc-200 font-semibold">
                          {formatClock(round.actualEndTime)}
                        </span>
                      ) : isCurrentActive ? (
                        <button
                          onClick={() => handleEndRound(round.id)}
                          className="group relative overflow-hidden bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold px-3 py-1 rounded-lg text-[11px] transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse active:scale-95 flex items-center gap-1 border border-rose-400/50"
                        >
                          <div className="w-2 h-2 bg-white rounded-xs shadow-xs" />
                          <span>記結束 (EoR)</span>
                        </button>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* EoR 時間: 計算 (實際結束時間 - 預計結束時間) */}
                    <td className="py-3.5 px-3.5 text-center bg-zinc-900/30">
                      {eorDiff !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            eorDiff > 0
                              ? 'bg-rose-950/70 text-rose-400 border border-rose-800/80'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                          }`}
                        >
                          {formatEoR(eorDiff)}
                          {isCurrentActive && eorDiff > 0 && ' (進行中)'}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* 輪長: 計算 (實際結束時間 - 開始時間) */}
                    <td className="py-3.5 px-3.5 text-center font-semibold text-zinc-200">
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

                    {/* 輪間時長: 下一輪的開始時間 - 實際結束時間 */}
                    <td className="py-3.5 px-3.5 text-center bg-zinc-900/30 text-zinc-300">
                      {idx === rounds.length - 1 ? (
                        <span className="text-zinc-600 text-[11px]">賽事結束</span>
                      ) : turnaround !== null ? (
                        <span
                          className={`font-semibold ${
                            nextRound?.startTime ? 'text-zinc-300' : 'text-amber-400 animate-pulse'
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
                        <div className="inline-flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 p-1 rounded-lg">
                          <select
                            className="bg-zinc-900 text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none"
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
                            className="w-16 bg-zinc-900 text-zinc-100 px-1 py-0.5 text-[10px] rounded outline-none border border-zinc-700"
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
                            className="bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          >
                            存
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoundId(null)
                              setManualTimeInput(null)
                            }}
                            className="text-zinc-500 hover:text-zinc-300 px-1 text-[10px]"
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
                          className="text-[11px] text-zinc-400 hover:text-amber-300 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 px-2.5 py-1 rounded-lg transition-all duration-200 active:scale-95 shadow-xs"
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
