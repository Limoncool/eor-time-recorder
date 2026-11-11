import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Tournament, TournamentRound, TournamentConfig } from '../types'

const TOURNAMENTS_COLLECTION = 'races'

// 輔助函式：根據設定生成初始輪次列表
export function generateInitialRounds(config: TournamentConfig): TournamentRound[] {
  const rounds: TournamentRound[] = []
  const roundMinutes = config.roundDurationMinutes || 25

  // 1. 生成瑞士輪 (Swiss Rounds)
  for (let i = 1; i <= config.swissRoundsCount; i++) {
    rounds.push({
      id: `swiss-${i}`,
      stage: 'swiss',
      roundNumber: i,
      name: `R${i}`,
      scheduledPairingsTime: null,
      scheduledStartTime: null,
      pairingsTime: null,
      startTime: null,
      scheduledEndTime: null,
      actualEndTime: null,
      roundMinutes,
      note: '',
    })
  }

  // 2. 生成單淘汰複賽 (Top Cut)
  if (config.hasTopCut && config.topCutSize >= 2) {
    let currentSize = config.topCutSize
    let topRoundIndex = config.swissRoundsCount + 1

    while (currentSize >= 2) {
      let stageName = ''
      if (currentSize === 2) {
        stageName = '決賽 (Finals)'
      } else if (currentSize === 4) {
        stageName = '4強賽 (Top 4)'
      } else if (currentSize === 8) {
        stageName = '8強賽 (Top 8)'
      } else if (currentSize === 16) {
        stageName = '16強賽 (Top 16)'
      } else if (currentSize === 32) {
        stageName = '32強賽 (Top 32)'
      } else {
        stageName = `${currentSize}強賽`
      }

      rounds.push({
        id: `topcut-${currentSize}`,
        stage: 'topcut',
        roundNumber: topRoundIndex,
        name: stageName,
        scheduledPairingsTime: null,
        scheduledStartTime: null,
        pairingsTime: null,
        startTime: null,
        scheduledEndTime: null,
        actualEndTime: null,
        roundMinutes,
        note: '',
      })

      topRoundIndex++
      currentSize = Math.floor(currentSize / 2)
    }
  }

  return rounds
}

// 自動推算每一輪的「預計配對時間」與「預計開始時間」
// 規則：配對公布後 5 分鐘開賽，每輪結束後 5 分鐘換輪公布下一輪配對 (配對 +5m 開賽 +25m 比賽 +5m 換輪)
export function computeAutoSchedule(
  rounds: TournamentRound[],
  r1PairingsTime: number
): TournamentRound[] {
  let prevEstimatedEnd = 0

  return rounds.map((r, index) => {
    const roundMin = r.roundMinutes || 25
    let scheduledPairingsTime: number
    let scheduledStartTime: number

    if (index === 0) {
      // 第一輪：按下時即為預計配對時間，5 分鐘後預計開賽
      scheduledPairingsTime = r.scheduledPairingsTime ?? r1PairingsTime
      scheduledStartTime = r.scheduledStartTime ?? (scheduledPairingsTime + 5 * 60 * 1000)
    } else {
      // 後續輪次：上一輪預計結束 + 5 分鐘換輪公布配對，再 + 5 分鐘預計開賽
      scheduledPairingsTime = r.scheduledPairingsTime ?? (prevEstimatedEnd + 5 * 60 * 1000)
      scheduledStartTime = r.scheduledStartTime ?? (scheduledPairingsTime + 5 * 60 * 1000)
    }

    prevEstimatedEnd = scheduledStartTime + roundMin * 60 * 1000

    return {
      ...r,
      scheduledPairingsTime,
      scheduledStartTime,
    }
  })
}

// 即時監聽比賽紀錄 (支援權限過濾：管理員看全部，一般使用者只看自己建立的賽事)
export function subscribeToRaces(
  user: { uid: string; email?: string | null } | null,
  isAdmin: boolean,
  callback: (tournaments: Tournament[]) => void
) {
  const q = query(collection(db, TOURNAMENTS_COLLECTION), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const allTournaments: Tournament[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      
      const config: TournamentConfig = data.config ?? {
        game: 'ptcg',
        roundDurationMinutes: 25,
        swissRoundsCount: data.rounds?.length ?? 5,
        hasTopCut: false,
        topCutSize: 8,
      }

      // 轉換輪次資料確保符合 TournamentRound
      const rawRounds = (data.rounds ?? []) as any[]
      const rounds: TournamentRound[] = rawRounds.map((r, index) => {
        const roundNum = r.roundNumber ?? index + 1
        const start = r.startTime ?? null
        const end = r.endTime ?? r.actualEndTime ?? null
        const roundMin = r.roundMinutes ?? 25
        const scheduled =
          r.scheduledEndTime ??
          (start ? start + roundMin * 60 * 1000 : null)

        return {
          id: r.id ?? `round-${roundNum}`,
          stage: r.stage ?? 'swiss',
          roundNumber: roundNum,
          name: r.name ?? `R${roundNum}`,
          scheduledPairingsTime: r.scheduledPairingsTime ?? null,
          scheduledStartTime: r.scheduledStartTime ?? null,
          pairingsTime: r.pairingsTime ?? null,
          startTime: start,
          scheduledEndTime: scheduled,
          actualEndTime: end,
          roundMinutes: roundMin,
          note: r.note ?? '',
        }
      })

      return {
        id: docSnap.id,
        name: data.name ?? '未命名賽事',
        date: data.date ?? new Date().toISOString().slice(0, 10),
        config,
        rounds,
        createdAt: (data.createdAt as Timestamp)?.toMillis?.() ?? data.createdAt ?? Date.now(),
        status: data.status ?? 'ongoing',
        createdBy: data.createdBy,
        creatorEmail: data.creatorEmail,
        creatorName: data.creatorName,
      }
    })

    // 權限篩選：
    // 1. 若為管理員：看所有賽事
    // 2. 若為登入用戶：看自己建立的 (或早期未標記建立者的公開舊紀錄)
    // 3. 若未登入：暫無權限查看私人賽事
    let filtered = allTournaments
    if (isAdmin) {
      filtered = allTournaments
    } else if (user) {
      filtered = allTournaments.filter((t) => !t.createdBy || t.createdBy === user.uid)
    } else {
      filtered = []
    }

    callback(filtered)
  })
}

// 建立新比賽
export async function createTournament(
  name: string,
  config: TournamentConfig,
  user?: { uid: string; email?: string | null; displayName?: string | null } | null
): Promise<string> {
  const initialRounds = generateInitialRounds(config)

  const docRef = await addDoc(collection(db, TOURNAMENTS_COLLECTION), {
    name,
    date: new Date().toISOString().slice(0, 10),
    config,
    rounds: initialRounds,
    createdAt: serverTimestamp(),
    status: 'ongoing',
    createdBy: user?.uid ?? null,
    creatorEmail: user?.email ?? null,
    creatorName: user?.displayName ?? null,
  })
  return docRef.id
}

// 舊版 createRace 相容
export async function createRace(name: string): Promise<string> {
  const defaultConfig: TournamentConfig = {
    game: 'ptcg',
    roundDurationMinutes: 25,
    swissRoundsCount: 5,
    hasTopCut: false,
    topCutSize: 8,
  }
  return createTournament(name, defaultConfig)
}

// 更新輪次
export async function updateRaceRounds(tournamentId: string, rounds: TournamentRound[]) {
  await updateDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId), { rounds })
}

// 標記比賽為結束
export async function finishRace(tournamentId: string) {
  await updateDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId), { status: 'finished' })
}

// 刪除比賽
export async function deleteRace(tournamentId: string) {
  await deleteDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId))
}
