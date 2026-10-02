// Hikaye Arşivi - her oluşan before/after görseli, oluştuğu günün tarihiyle
// (YYYY-MM-DD, cihazın yerel saati) SADECE bu cihazda saklanıyor; sunucuya
// hiçbir şey gitmiyor (bkz. app/journey/StoryArchive.tsx). Gün başına tek
// kayıt - aynı gün yenisi gelirse üstüne yazılıyor.
//
// Kullanıcı kimliğine göre ayrı klasör: çıkış yapınca cihaz sıfırlanıyor (bkz.
// AuthService.resetDeviceToFirstLaunch) ama arşiv silinmiyor - aynı hesapla
// tekrar girilince geri geliyor, başka bir hesap ise görmüyor. Hesap
// silinince o kullanıcının arşivi de siliniyor (deleteArchiveForUser).
//
// Her kayıt iki dosya: tam görsel (1080x1920, kaydetmek/büyük göstermek için)
// ve küçük önizleme (ızgarada 30 tam görseli belleğe yüklememek için).
// iOS uygulamasında Capacitor Filesystem (Directory.Data), tarayıcıda IndexedDB.

import { Capacitor } from '@capacitor/core'
import { getLeaderboardRequest, storyUrl } from './authApi'

const DATA_URL_PREFIX = 'data:image/jpeg;base64,'
const ROOT = 'story-archive'
const DB_NAME = 'velis-story-archive'
const STORE = 'entries'

export type ArchiveEntry = { dateKey: string; thumb: string }

export function dateKeyFor(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

// ---- iOS (Capacitor Filesystem) ----

async function fs() {
  return import('@capacitor/filesystem')
}

async function nativeSave(userId: string, dateKey: string, full: string, thumb: string) {
  const { Filesystem, Directory } = await fs()
  const dir = `${ROOT}/${safeUserId(userId)}`
  await Filesystem.writeFile({ path: `${dir}/${dateKey}.jpg`, data: full.slice(DATA_URL_PREFIX.length), directory: Directory.Data, recursive: true })
  await Filesystem.writeFile({ path: `${dir}/${dateKey}.thumb.jpg`, data: thumb.slice(DATA_URL_PREFIX.length), directory: Directory.Data, recursive: true })
}

async function nativeFileSrc(path: string): Promise<string> {
  const { Filesystem, Directory } = await fs()
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Data })
  return Capacitor.convertFileSrc(uri)
}

async function nativeList(userId: string): Promise<string[]> {
  const { Filesystem, Directory } = await fs()
  try {
    const res = await Filesystem.readdir({ path: `${ROOT}/${safeUserId(userId)}`, directory: Directory.Data })
    return res.files.map((f) => f.name).filter((n) => n.endsWith('.thumb.jpg')).map((n) => n.slice(0, 10))
  } catch {
    return [] // klasör henüz yok
  }
}

// ---- Tarayıcı (IndexedDB) ----

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idb<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

type IdbRecord = { full: string; thumb: string }

// ---- Ortak API ----

export async function saveArchiveEntry(userId: string, dateKey: string, full: string, thumb: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return nativeSave(userId, dateKey, full, thumb)
  await idb('readwrite', (s) => s.put({ full, thumb } satisfies IdbRecord, `${userId}/${dateKey}`))
}

// Bir ayın kayıtları (month: 0-11) - ızgara için sadece önizlemeler.
export async function listArchiveMonth(userId: string, year: number, month: number): Promise<ArchiveEntry[]> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  if (Capacitor.isNativePlatform()) {
    const keys = (await nativeList(userId)).filter((k) => k.startsWith(prefix))
    return Promise.all(
      keys.map(async (dateKey) => ({ dateKey, thumb: await nativeFileSrc(`${ROOT}/${safeUserId(userId)}/${dateKey}.thumb.jpg`) }))
    )
  }
  const range = IDBKeyRange.bound(`${userId}/${prefix}`, `${userId}/${prefix}￿`)
  const [keys, values] = await Promise.all([
    idb('readonly', (s) => s.getAllKeys(range)),
    idb('readonly', (s) => s.getAll(range) as IDBRequest<IdbRecord[]>),
  ])
  return keys.map((k, i) => ({ dateKey: String(k).slice(userId.length + 1), thumb: values[i].thumb }))
}

// Arşivdeki en eski günün anahtarı - ay gezintisinin geriye ne kadar
// gidebileceğini belirliyor. Kayıt yoksa null.
export async function earliestArchiveKey(userId: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const keys = (await nativeList(userId)).sort()
    return keys[0] ?? null
  }
  const range = IDBKeyRange.bound(`${userId}/`, `${userId}/￿`)
  const keys = await idb('readonly', (s) => s.getAllKeys(range))
  const sorted = keys.map((k) => String(k).slice(userId.length + 1)).sort()
  return sorted[0] ?? null
}

// Büyük gösterim/kaydetme için tam görsel: iOS'ta dosya adresi, tarayıcıda data URL.
export async function getArchiveFull(userId: string, dateKey: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await fs()
      const res = await Filesystem.readFile({ path: `${ROOT}/${safeUserId(userId)}/${dateKey}.jpg`, directory: Directory.Data })
      return typeof res.data === 'string' ? DATA_URL_PREFIX + res.data : null
    } catch {
      return null
    }
  }
  const rec = await idb('readonly', (s) => s.get(`${userId}/${dateKey}`) as IDBRequest<IdbRecord | undefined>)
  return rec?.full ?? null
}

export async function deleteArchiveForUser(userId: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await fs()
      await Filesystem.rmdir({ path: `${ROOT}/${safeUserId(userId)}`, directory: Directory.Data, recursive: true })
      return
    }
    await idb('readwrite', (s) => s.delete(IDBKeyRange.bound(`${userId}/`, `${userId}/￿`)))
  } catch {
    // arşiv hiç yoksa sorun değil
  }
}

// Sunucudaki birleşik hikaye görselinde (720x1280, bkz. lib/storyImage.ts)
// "sonra" kartının yeri - arşiv önizlemesi için oradan kırpılıyor.
const SERVER_STORY_AFTER_PANEL = { x: 600 / 1.5, y: 520 / 1.5, w: 430 / 1.5, h: 860 / 1.5 }

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

function thumbFromServerStory(full: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 270
      c.height = 480
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable.'))
      const p = SERVER_STORY_AFTER_PANEL
      // Kart 1:2, önizleme 9:16 - alttan hizalı kırp ki kartın üstündeki
      // "SONRA" etiketi önizlemeye girmesin.
      const srcH = p.w * (480 / 270)
      ctx.drawImage(img, p.x, p.y + p.h - srcH, p.w, srcH, 0, 0, 270, 480)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Could not load story.'))
    img.src = full
  })
}

// Kullanıcının sunucudaki aktif (son 24 saat) hikayesini, o günün arşiv kaydı
// yoksa arşive ekler. true = yeni kayıt eklendi.
export async function importServerStory(userId: string): Promise<boolean> {
  const res = await getLeaderboardRequest()
  const mine = res.users.find((u) => u.id === userId)
  const url = storyUrl(mine?.id, mine?.storyVersion)
  if (!url || !mine?.storyVersion) return false
  const dateKey = dateKeyFor(new Date(mine.storyVersion))
  const existing = await listArchiveMonth(userId, Number(dateKey.slice(0, 4)), Number(dateKey.slice(5, 7)) - 1)
  if (existing.some((e) => e.dateKey === dateKey)) return false
  const blob = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.blob()
  })
  const full = await blobToDataUrl(blob)
  if (!full.startsWith(DATA_URL_PREFIX)) return false
  await saveArchiveEntry(userId, dateKey, full, await thumbFromServerStory(full))
  return true
}
