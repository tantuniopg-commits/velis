// Ritüel before/after hikaye görseli - Instagram hikayesi oranında (9:16)
// tek bir JPEG. Tasarım: koyu zemin + köşelerden amber ışıma, üstte VELIS
// işareti ve yazısı, solda ÖNCE / sağda SONRA fotoğraf kartları, ortada ince
// amber çizgi ve kıvılcım, altta kullanıcı adı | X. Gün.
//
// İki çıktı: paylaşma/kaydetme için tam çözünürlük (1080x1920) ve liderlik
// tablosuna yüklemek için küçültülmüş (720x1280, sunucu tavanı 350KB - bkz.
// server/src/controllers/storyController.js).

import { FONT_SANS } from './typography'

const W = 1080
const H = 1920

const PANEL_W = 430
const PANEL_H = 860
const PANEL_Y = 520
const PANEL_GAP = 120
const PANEL_RADIUS = 30

const UPLOAD_W = 720
const UPLOAD_MAX_BYTES = 330 * 1024
const UPLOAD_QUALITIES = [0.82, 0.72, 0.62, 0.5]
const DATA_URL_PREFIX = 'data:image/jpeg;base64,'

export type StoryLabels = { before: string; after: string; day: string }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load photo.'))
    img.src = src
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${color}, ${alpha})`)
  g.addColorStop(1, `rgba(${color}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// Harf aralıklı metin - ctx.letterSpacing her WebKit sürümünde yok, elle diziyoruz.
function spacedText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let x = cx - total / 2
  ctx.textAlign = 'left'
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y)
    x += widths[i] + spacing
  })
}

// VELIS işareti (bkz. app/VelisMark.tsx): üstte ve altta boşluklu halka,
// ortasında dikey seramik çubuk ve amber çekirdek.
function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const s = 2.7
  const r = 26 * s
  const gap = (6 * Math.PI) / 180
  ctx.save()
  ctx.strokeStyle = '#F6F2EB'
  ctx.lineWidth = 1.4 * s
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(255, 178, 90, 0.35)'
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2 + gap, Math.PI / 2 - gap)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI / 2 + gap, (3 * Math.PI) / 2 - gap)
  ctx.stroke()
  ctx.restore()

  const barW = 3.5 * s
  const barH = 64 * s
  const bar = ctx.createLinearGradient(cx - barW / 2, 0, cx + barW / 2, 0)
  bar.addColorStop(0, '#DAD5CE')
  bar.addColorStop(0.5, '#F1EEE9')
  bar.addColorStop(1, '#DAD5CE')
  ctx.fillStyle = bar
  roundedRect(ctx, cx - barW / 2, cy - barH / 2, barW, barH, barW / 2)
  ctx.fill()

  ctx.save()
  ctx.shadowColor = 'rgba(255, 160, 60, 0.9)'
  ctx.shadowBlur = 24
  const core = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, 8)
  core.addColorStop(0, '#FFD9A0')
  core.addColorStop(0.5, '#FFB347')
  core.addColorStop(1, '#D9701A')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawPanel(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, label: string) {
  const y = PANEL_Y
  ctx.save()
  roundedRect(ctx, x, y, PANEL_W, PANEL_H, PANEL_RADIUS)
  ctx.clip()
  ctx.fillStyle = '#0d0c0b'
  ctx.fillRect(x, y, PANEL_W, PANEL_H)
  // Kartı tamamen dolduracak şekilde ortadan kırp (object-fit: cover).
  const scale = Math.max(PANEL_W / img.naturalWidth, PANEL_H / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, x + (PANEL_W - dw) / 2, y + (PANEL_H - dh) / 2, dw, dh)
  // Etiket okunsun diye üstte hafif karartma.
  const shade = ctx.createLinearGradient(0, y, 0, y + 160)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = shade
  ctx.fillRect(x, y, PANEL_W, 160)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(227, 192, 140, 0.6)'
  ctx.lineWidth = 2
  roundedRect(ctx, x + 1, y + 1, PANEL_W - 2, PANEL_H - 2, PANEL_RADIUS)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(245, 240, 234, 0.9)'
  ctx.font = `500 26px ${FONT_SANS}`
  ctx.textBaseline = 'middle'
  spacedText(ctx, label.toLocaleUpperCase(), x + PANEL_W / 2, y + 54, 7)
}

function drawDivider(ctx: CanvasRenderingContext2D) {
  const cx = W / 2
  const top = PANEL_Y - 60
  const bottom = PANEL_Y + PANEL_H + 60
  const mid = PANEL_Y + PANEL_H / 2
  const line = ctx.createLinearGradient(0, top, 0, bottom)
  line.addColorStop(0, 'rgba(227, 160, 80, 0)')
  line.addColorStop(0.5, 'rgba(240, 170, 90, 0.75)')
  line.addColorStop(1, 'rgba(227, 160, 80, 0)')
  ctx.fillStyle = line
  ctx.fillRect(cx - 1, top, 2, bottom - top)

  // Ortadaki kıvılcım: yatay ve dikey ince ışık + parlak nokta.
  ctx.save()
  ctx.shadowColor = 'rgba(255, 170, 70, 0.95)'
  ctx.shadowBlur = 30
  const h = ctx.createLinearGradient(cx - 44, 0, cx + 44, 0)
  h.addColorStop(0, 'rgba(255, 190, 110, 0)')
  h.addColorStop(0.5, 'rgba(255, 215, 150, 1)')
  h.addColorStop(1, 'rgba(255, 190, 110, 0)')
  ctx.fillStyle = h
  ctx.fillRect(cx - 44, mid - 1.5, 88, 3)
  const v = ctx.createLinearGradient(0, mid - 60, 0, mid + 60)
  v.addColorStop(0, 'rgba(255, 190, 110, 0)')
  v.addColorStop(0.5, 'rgba(255, 215, 150, 1)')
  v.addColorStop(1, 'rgba(255, 190, 110, 0)')
  ctx.fillStyle = v
  ctx.fillRect(cx - 1.5, mid - 60, 3, 120)
  ctx.fillStyle = '#FFE2B0'
  ctx.beginPath()
  ctx.arc(cx, mid, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFooter(ctx: CanvasRenderingContext2D, name: string, dayLabel: string) {
  const y = 1620
  ctx.font = `500 32px ${FONT_SANS}`
  ctx.textBaseline = 'middle'
  const iconR = 22
  const nameW = ctx.measureText(name).width
  const dayW = ctx.measureText(dayLabel).width
  const sepGap = 34
  const total = iconR * 2 + 18 + nameW + sepGap * 2 + 2 + dayW
  let x = W / 2 - total / 2

  // Kişi ikonu: daire içinde baş + omuz.
  const icx = x + iconR
  ctx.strokeStyle = 'rgba(245, 240, 234, 0.85)'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(icx, y, iconR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(icx, y - 5, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(icx, y + 17, 12, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
  x += iconR * 2 + 18

  ctx.fillStyle = 'rgba(245, 240, 234, 0.92)'
  ctx.textAlign = 'left'
  ctx.fillText(name, x, y)
  x += nameW + sepGap

  ctx.fillStyle = 'rgba(227, 160, 80, 0.85)'
  ctx.fillRect(x, y - 22, 2, 44)
  x += 2 + sepGap

  ctx.fillStyle = 'rgba(245, 240, 234, 0.92)'
  ctx.fillText(dayLabel, x, y)
}

export async function composeStory(opts: {
  before: string
  after: string
  name: string
  labels: StoryLabels
}): Promise<HTMLCanvasElement> {
  const [beforeImg, afterImg] = await Promise.all([loadImage(opts.before), loadImage(opts.after)])
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable.')
  ctx.imageSmoothingQuality = 'high'

  ctx.fillStyle = '#060504'
  ctx.fillRect(0, 0, W, H)
  glow(ctx, 0, H, 820, '214, 120, 30', 0.5)
  glow(ctx, W, H, 820, '214, 120, 30', 0.5)
  glow(ctx, W, 0, 700, '190, 105, 30', 0.28)
  glow(ctx, W / 2, 230, 260, '255, 170, 80', 0.12)

  drawMark(ctx, W / 2, 230)
  ctx.fillStyle = '#EDE6DC'
  ctx.font = `300 52px ${FONT_SANS}`
  ctx.textBaseline = 'middle'
  spacedText(ctx, 'VELIS', W / 2, 390, 22)

  const leftX = (W - PANEL_W * 2 - PANEL_GAP) / 2
  drawPanel(ctx, beforeImg, leftX, opts.labels.before)
  drawPanel(ctx, afterImg, leftX + PANEL_W + PANEL_GAP, opts.labels.after)
  drawDivider(ctx)
  drawFooter(ctx, opts.name, opts.labels.day)
  return canvas
}

// Hikaye Arşivi ızgarası için küçük önizleme (bkz. lib/storyArchive.ts) -
// birleşik görsel küçük kartta okunmuyor, o yüzden "sonra" fotoğrafından,
// 9:16 kırpılmış.
export async function photoToThumbDataUrl(photo: string): Promise<string> {
  const img = await loadImage(photo)
  const small = document.createElement('canvas')
  small.width = 270
  small.height = 480
  const ctx = small.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable.')
  ctx.imageSmoothingQuality = 'high'
  const scale = Math.max(small.width / img.naturalWidth, small.height / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, (small.width - dw) / 2, (small.height - dh) / 2, dw, dh)
  return small.toDataURL('image/jpeg', 0.8)
}

export function storyToShareDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.92)
}

function approxBytes(dataUrl: string): number {
  return Math.floor(((dataUrl.length - DATA_URL_PREFIX.length) * 3) / 4)
}

export function storyToUploadDataUrl(canvas: HTMLCanvasElement): string {
  const small = document.createElement('canvas')
  small.width = UPLOAD_W
  small.height = Math.round((UPLOAD_W * H) / W)
  const ctx = small.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, small.width, small.height)
  for (const q of UPLOAD_QUALITIES) {
    const url = small.toDataURL('image/jpeg', q)
    if (url.startsWith(DATA_URL_PREFIX) && approxBytes(url) <= UPLOAD_MAX_BYTES) return url
  }
  throw new Error('Image is too detailed to compress.')
}
