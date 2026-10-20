// 比賽與輪次的資料型別定義 (PTCG 寶可夢卡牌賽事專用)

export interface TournamentRound {
  id: string
  stage: 'swiss' | 'topcut'
  roundNumber: number
  name: string                  // 例如 "R1", "R2", "8強賽", "4強賽", "決賽"
  
  pairingsTime: number | null   // 配對公布時間 (Unix timestamp ms)
  startTime: number | null      // 開始時間 (Unix timestamp ms)
  scheduledEndTime: number | null // 預計結束時間 = startTime + roundMinutes * 60 * 1000
  actualEndTime: number | null  // 實際結束時間 (Unix timestamp ms)
  
  roundMinutes: number          // 預設 25 分鐘
  note?: string
}

export interface TournamentConfig {
  game: 'ptcg'
  roundDurationMinutes: number  // 預設 25 分鐘
  swissRoundsCount: number      // 瑞士輪總輪數
  hasTopCut: boolean            // 是否有單淘汰複賽
  topCutSize: number            // 複賽取幾強 (例如 4, 8, 16, 32)
}

export interface Tournament {
  id: string
  name: string
  date: string                  // YYYY-MM-DD
  config: TournamentConfig
  rounds: TournamentRound[]
  createdAt: number             // Unix timestamp ms
  status: 'ongoing' | 'finished'
}

// 兼容舊格式
export type Race = Tournament
export type Round = TournamentRound
