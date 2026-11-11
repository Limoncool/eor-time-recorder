import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth'
import { auth } from '../firebase'

// 預設管理員清單，可從環境變數 VITE_ADMIN_EMAILS 以逗號分隔擴充
const ADMIN_EMAILS: string[] = (
  import.meta.env.VITE_ADMIN_EMAILS || 'tsaiwk2006@yahoo.com.tw'
)
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean)

export function isUserAdmin(user: User | null): boolean {
  if (!user || !user.email) return false
  return ADMIN_EMAILS.includes(user.email.toLowerCase())
}

// Google 一鍵登入
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  return result.user
}

// Email + 密碼 登入
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass)
  return credential.user
}

// Email + 密碼 註冊
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass)
  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() })
  }
  return credential.user
}

// 登出
export async function logout(): Promise<void> {
  await signOut(auth)
}

// 監聽登入狀態改變
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
