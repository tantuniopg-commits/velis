// Before/after görselini film rulosuna kaydetme. iOS uygulamasında (Capacitor)
// görsel önbellek klasörüne dosya olarak yazılıp doğrudan Fotoğraflar'a
// kaydediliyor (@capacitor-community/media; izin metni Info.plist
// NSPhotoLibraryAddUsageDescription). Tarayıcı bir web sayfasından Fotoğraflar'a
// doğrudan yazamıyor - orada (iPhone Safari) paylaşım menüsü açılıyor, oradaki
// "Görüntüyü Kaydet" film rulosuna kaydediyor; o da yoksa dosya indiriliyor.

import { Capacitor } from '@capacitor/core'

const DATA_URL_PREFIX = 'data:image/jpeg;base64,'

async function writeCacheFile(dataUrl: string): Promise<string> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const res = await Filesystem.writeFile({
    path: `velis-ritual-${Date.now()}.jpg`,
    data: dataUrl.slice(DATA_URL_PREFIX.length),
    directory: Directory.Cache,
  })
  return res.uri
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const bin = atob(dataUrl.slice(DATA_URL_PREFIX.length))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], name, { type: 'image/jpeg' })
}

function download(dataUrl: string, name: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function saveStoryImage(dataUrl: string): Promise<'saved' | 'cancelled' | 'failed'> {
  try {
    if (Capacitor.isNativePlatform()) {
      const uri = await writeCacheFile(dataUrl)
      const { Media } = await import('@capacitor-community/media')
      await Media.savePhoto({ path: uri })
      return 'saved'
    }
    const file = dataUrlToFile(dataUrl, 'velis-ritual.jpg')
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return 'saved'
    }
    download(dataUrl, 'velis-ritual.jpg')
    return 'saved'
  } catch (err) {
    // Paylaşım menüsünü kapatmak hata değil - kaydedilmedi ama uyarı da yok.
    const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err)
    return /cancel|abort/i.test(msg) ? 'cancelled' : 'failed'
  }
}
