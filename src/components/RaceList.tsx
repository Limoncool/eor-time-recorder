import { useState } from 'react'
import { Race } from '../types'
import { createRace } from '../services/raceService'

interface Props {
  races: Race[]
  onSelectRace: (id: string) => void
  onNewRace: (id: string) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RaceList({ races, onSelectRace, onNewRace }: Props) {
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    const name = newName.trim() || `比賽 ${new Date().toLocaleDateString('zh-TW')}`
    setCreating(true)
    const id = await createRace(name)
    setNewName('')
    setCreating(false)
    onNewRace(id)
  }

  return (
    <div className="space-y-6">
      {/* 新增比賽 */}
      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">開始新比賽</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="比賽名稱（可留空）"
            className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {creating ? '建立中...' : '＋ 開始'}
          </button>
        </div>
      </div>

      {/* 比賽列表 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">比賽紀錄</h2>
        {races.length === 0 ? (
          <p className="text-gray-500 text-center py-10">尚無比賽紀錄</p>
        ) : (
          <div className="space-y-3">
            {races.map((race) => {
              const totalRounds = race.rounds.length
              const totalTime = race.rounds.reduce((acc, r) => acc + (r.duration ?? 0), 0)
              return (
                <button
                  key={race.id}
                  onClick={() => onSelectRace(race.id)}
                  className="w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl p-4 text-left transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{race.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      race.status === 'ongoing'
                        ? 'bg-green-900 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {race.status === 'ongoing' ? '進行中' : '已結束'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1 flex gap-4">
                    <span>📅 {formatDate(race.date)}</span>
                    <span>🔄 {totalRounds} 輪</span>
                    {totalRounds > 0 && <span>⏱ 總計 {formatDuration(totalTime)}</span>}
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
