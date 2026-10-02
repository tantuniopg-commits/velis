// Apple Push Notification servisi - DOĞRUDAN APNs (Firebase/FCM değil,
// sadece iOS hedeflediğimiz için en basit yol, bkz. AGENTS.md "Bildirimler").
//
// Gerekli 3 ortam değişkeni (Render Dashboard → velis-api → Environment,
// bkz. AGENTS.md "Altyapı ve secrets"):
//   APNS_KEY       - .p8 dosyasının TAM İÇERİĞİ (-----BEGIN PRIVATE KEY----- dahil)
//   APNS_KEY_ID    - Apple Developer portalında key oluşturunca verilen Key ID
//   APNS_TEAM_ID   - Apple Developer hesabının Team ID'si
// Üçü de yoksa (henüz kurulmadıysa) bu modül SESSİZCE no-op - push job'ı
// hatasız çalışmaya devam eder, sadece gerçekte hiçbir şey göndermez.
const apn = require('@parse/node-apn')

const BUNDLE_ID = 'com.forsvelis.app'

let provider // lazy, bir kez oluşturulup yeniden kullanılıyor
let sandboxProvider
let triedInit = false

function getProvider() {
  if (triedInit) return provider
  triedInit = true
  const key = process.env.APNS_KEY
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  if (!key || !keyId || !teamId) {
    console.warn('[apn] APNS_KEY/APNS_KEY_ID/APNS_TEAM_ID eksik - push gönderimi devre dışı (local bildirim yok, sadece bu özellik).')
    return null
  }
  // Render'da çok satırlı env değerleri genelde literal "\n" olarak
  // saklanıyor - gerçek satır sonuna çeviriyoruz, gerçek newline'lı
  // girilmişse bu replace zaten no-op.
  const token = { key: key.replace(/\\n/g, '\n'), keyId, teamId }
  try {
    // App Store/TestFlight derlemeleri production APNs kullanır.
    provider = new apn.Provider({ token, production: true })
    // Xcode'dan cihaza kurulan geliştirme derlemelerinin token'ları SADECE
    // sandbox'ta geçerli - production onları BadDeviceToken ile reddediyor.
    // O durumda aynı bildirimi sandbox'a bir kez daha deniyoruz (bkz. sendPush).
    sandboxProvider = new apn.Provider({ token, production: false })
  } catch (err) {
    console.error('[apn] Provider oluşturulamadı', err)
    provider = null
    sandboxProvider = null
  }
  return provider
}

// `target` - istemcinin deep link'te kullandığı yol (ör. '/', '/journey').
async function sendPush(token, { title, body, target }) {
  const p = getProvider()
  if (!p || !token) return
  const note = new apn.Notification()
  note.alert = { title, body }
  note.sound = 'default'
  note.topic = BUNDLE_ID
  note.payload = { target }
  let result = await p.send(note, token)
  const badToken = result.failed?.some((f) => f.response?.reason === 'BadDeviceToken')
  if (badToken && sandboxProvider) result = await sandboxProvider.send(note, token)
  if (result.failed?.length) {
    console.error('[apn] gönderim başarısız', result.failed.map((f) => ({ reason: f.response?.reason, status: f.status })))
  }
  return { sent: result.sent?.length || 0, failed: (result.failed || []).map((f) => f.response?.reason || String(f.status || f.error || 'unknown')) }
}

module.exports = { sendPush }
