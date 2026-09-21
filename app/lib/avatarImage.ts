// Profil fotoğrafı hazırlama: kullanıcının seçtiği herhangi bir görseli
// ortadan kare kırpıp 320x320 JPEG'e küçültüyor (~25KB). Hem yükleme boyutunu
// hem DB'deki yer kaplamasını (Atlas M0: 512MB) küçük tutuyor; 320px, 104px'lik
// en büyük gösterimde 3x retina için yeterli. Sunucu bu sınırları ayrıca
// zorluyor (bkz. server/src/controllers/authController.js decodeAvatar).

const AVATAR_SIZE = 320
// Sunucu tavanı 100KB - burada altında kalıyoruz ki sınırda reddedilmesin.
const MAX_BYTES = 90 * 1024
const QUALITIES = [0.85, 0.75, 0.65, 0.5]
const DATA_URL_PREFIX = 'data:image/jpeg;base64,'

export class AvatarImageError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new AvatarImageError('Could not read that image.'))
    }
    img.src = url
  })
}

function approxBytes(dataUrl: string): number {
  return Math.floor(((dataUrl.length - DATA_URL_PREFIX.length) * 3) / 4)
}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AvatarImageError('Not an image.')

  const img = await loadImage(file)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  if (!side) throw new AvatarImageError('Empty image.')

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AvatarImageError('Canvas unavailable.')

  // Saydam PNG'ler JPEG'e çevrilince siyaha dönerdi - uygulamanın zeminiyle
  // aynı koyu renge boyuyoruz ki fark edilmesin.
  ctx.fillStyle = '#0d0c0b'
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.imageSmoothingQuality = 'high'
  // Ortadan kare kırpma. (Modern WebKit/Blink EXIF yönünü drawImage'da zaten
  // uyguluyor - telefonla çekilen dik fotoğraflar yan dönmüyor.)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

  for (const q of QUALITIES) {
    const dataUrl = canvas.toDataURL('image/jpeg', q)
    if (dataUrl.startsWith(DATA_URL_PREFIX) && approxBytes(dataUrl) <= MAX_BYTES) return dataUrl
  }
  throw new AvatarImageError('Image is too detailed to compress.')
}
