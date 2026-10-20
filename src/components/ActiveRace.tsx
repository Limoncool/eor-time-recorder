import { useState, useEffect, useRef } from 'react'
import { Race, Round } from '../types'
import { updateRaceRounds, finishRace } from '../services/raceService'

interface Props {
  race: Race
}

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatTimestamp(ms: number | null) {
  if (!ms) return '-'
  return new Date(ms).toLocaleTimeString('zh-TW')
}

export default function ActiveRace({ race }: Props) {
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 找到最後一個還在進行中的 round（有 startTime 但沒有 endTime）
  const rounds = race.rounds
  const activeRound = rounds.find(r => r.startTime !== null && r.endTime === null) ?? null
  const isFinished = race.status === 'finished'

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
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
    const updated = rounds.map(r =>
      r.roundNumber === activeRound.roundNumber
        ? { ...r, endTime, duration }
        : r
    )
    await updateRaceRounds(race.id, updated)
  }

  // 結束比賽
  async function handleFinishRace() {
    if (activeRound) await handleEndRound()
    await finishRace(race.id)
  }

  const elapsed = activeRound ? now - activeRound.startTime! : 0

  return (
    <div className="space-y-5">
      {/* 比賽標題 */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{race.name}</h2>
            <p className="text-sm text-gray-400">{race.date}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isFinished ? 'bg-gray-700 text-gray-400' : 'bg-green-900 text-green-400'
          }`}>
            {isFinished ? '已結束' : '進行中'}
          </span>
        </div>
      </div>

      {/* 當前輪次計時器 */}
      {!isFinished && (
        <div className="bg-gray-800 rounded-xl p-6 text-center space-y-4">
          {activeRound ? (
            <>
              <p className="text-gray-400 text-sm">第 {activeRound.roundNumber} 輪 — 進行中</p>
              <div className="text-5xl font-mono font-bold text-blue-400">
                {formatTime(elapsed)}
              </div>
              <p className="text-xs text-gray-500">開始於 {formatTimestamp(activeRound.startTime)}</p>
              <button
                onClick={handleEndRound}
                className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-semibold text-lg transition"
              >
                🔴 結束第 {activeRound.roundNumber} 輪
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm">
                {rounds.length === 0 ? '尚未開始' : `第 ${rounds.length} 輪已結束`}
              </p>
              <button
                onClick={handleStartRound}
                className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold text-lg transition"
              >
                🟢 開始第 {rounds.length + 1} 輪
              </button>
            </>
          )}
          {rounds.length > 0 && !activeRound && (
            <button
              onClick={handleFinishRace}
              className="w-full bg-gray-600 hover:bg-gray-500 py-2 rounded-xl text-sm transition"
            >
              ✅ 結束比賽
            </button>
          )}
        </div>
      )}

      {/* 輪次紀錄 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">輪次紀錄</h3>
        {rounds.length === 0 ? (
          <p className="text-gray-600 text-center py-6 text-sm">尚無輪次</p>
        ) : (
          <div className="space-y-2">
            {rounds.map((round) => (
              <div
                key={round.roundNumber}
                className={`bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between ${
                  round.endTime === null ? 'border border-blue-600' : ''
                }`}
              >
                <div>
                  <span className="font-medium">第 {round.roundNumber} 輪</span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatTimestamp(round.startTime)} → {formatTimestamp(round.endTime)}
                  </div>
                </div>
                <div className="text-right">
                  {round.endTime === null ? (
                    <span className="text-blue-400 font-mono text-sm">{formatTime(elapsed)}</span>
                  ) : (
                    <span className="text-green-400 font-mono font-bold">
                      {formatTime((round.duration ?? 0) * 1000)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
