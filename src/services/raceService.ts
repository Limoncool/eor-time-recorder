import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Race, Round } from '../types'

const RACES_COLLECTION = 'races'

// 即時監聽所有比賽紀錄
export function subscribeToRaces(callback: (races: Race[]) => void) {
  const q = query(collection(db, RACES_COLLECTION), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const races: Race[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        date: data.date,
        rounds: data.rounds ?? [],
        createdAt: (data.createdAt as Timestamp)?.toMillis() ?? Date.now(),
        status: data.status,
      }
    })
    callback(races)
  })
}

// 建立新比賽
export async function createRace(name: string): Promise<string> {
  const docRef = await addDoc(collection(db, RACES_COLLECTION), {
    name,
    date: new Date().toISOString().slice(0, 10),
    rounds: [],
    createdAt: serverTimestamp(),
    status: 'ongoing',
  })
  return docRef.id
}

// 更新比賽的 rounds
export async function updateRaceRounds(raceId: string, rounds: Round[]) {
  await updateDoc(doc(db, RACES_COLLECTION, raceId), { rounds })
}

// 標記比賽為結束
export async function finishRace(raceId: string) {
  await updateDoc(doc(db, RACES_COLLECTION, raceId), { status: 'finished' })
}

