// 比賽與輪次的資料型別定義

export interface Round {
  roundNumber: number
  startTime: number | null   // Unix timestamp (ms)
  endTime: number | null     // Unix timestamp (ms)
  duration: number | null    // 秒數
  note: string
}

export interface Race {
  id: string
  name: string
  date: string               // ISO 格式日期
  rounds: Round[]
  createdAt: number          // Unix timestamp (ms)
  status: 'ongoing' | 'finished'
}
