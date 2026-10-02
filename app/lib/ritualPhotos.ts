// Günün ritüelinin before/after fotoğrafları - bileşen DIŞINDA, modül
// seviyesinde tutuluyor: kullanıcı ritüel sırasında başka sekmeye geçince
// Ritual Home unmount oluyor, fotoğraf kaybolmasın (bkz. ritualSession.ts'teki
// aynı gerekçe). Bilerek kalıcı DEĞİL (localStorage yok) - yüz fotoğrafı
// cihazda gereğinden uzun durmasın; uygulama kapanınca gidiyor.

let beforePhoto: string | null = null

export function getBeforePhoto(): string | null {
  return beforePhoto
}

export function setBeforePhoto(dataUrl: string | null) {
  beforePhoto = dataUrl
}

export function clearRitualPhotos() {
  beforePhoto = null
}
