const User = require('../models/User')
const { sendPush } = require('../lib/apn')

// POST /api/auth/push-test - giriş yapmış kullanıcı KENDİ cihazına anında bir
// test bildirimi gönderiyor (bkz. Developer Panel > Notifications). Zamanlanmış
// bildirimler sadece 09:00/15:00/21:00'de gittiği için kurulumu (APNs anahtarı,
// cihaz token'ı, sandbox/production) beklemeden doğrulamanın yolu bu. Sadece
// kendi token'ına gidiyor; sıkı hız limiti var (bkz. index.js).
async function sendTestPush(req, res) {
  const user = await User.findById(req.userId).select('+pushToken locale')
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.pushToken) return res.status(400).json({ error: 'No push token registered for this account' })
  const tr = user.locale === 'tr'
  const result = await sendPush(user.pushToken, {
    title: 'Velis',
    body: tr ? 'Test bildirimi - bildirimler çalışıyor.' : 'Test notification - notifications are working.',
    target: '/',
  })
  if (!result) return res.status(503).json({ error: 'Push is not configured on the server (APNS_* missing)' })
  res.json(result)
}

module.exports = { sendTestPush }
