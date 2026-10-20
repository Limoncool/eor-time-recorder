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

// 即時監聽所有比賽紀錄
export function subscribeToRaces(callback: (tournaments: Tournament[]) => void) {
  const q = query(collection(db, TOURNAMENTS_COLLECTION), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const tournaments: Tournament[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      
      const config: TournamentConfig = data.config ?? {
        game: 'ptcg',
        roundDurationMinutes: 25,
        swissRoundsCount: data.rounds?.length ?? 5,
        hasTopCut: false,
        topCutSize: 8,
      }

      // 轉換舊輪次資料確保符合 TournamentRound
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
      }
    })
    callback(tournaments)
  })
}

// 建立新比賽
export async function createTournament(
  name: string,
  config: TournamentConfig
): Promise<string> {
  const initialRounds = generateInitialRounds(config)

  const docRef = await addDoc(collection(db, TOURNAMENTS_COLLECTION), {
    name,
    date: new Date().toISOString().slice(0, 10),
    config,
    rounds: initialRounds,
    createdAt: serverTimestamp(),
    status: 'ongoing',
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
