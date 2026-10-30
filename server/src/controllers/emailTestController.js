const User = require('../models/User')
const { sendTestEmail, getConfiguredProvider } = require('../lib/mailer')

// POST /api/auth/email-test - giriş yapmış kullanıcı KENDİ e-postasına anında
// bir test maili gönderiyor (bkz. Developer Panel > Email, push-test'in
// aynısı ama e-posta için). Hata YUTULMUYOR - OTP/parola sıfırlama
// gönderiminde (bkz. otpController.js) kullanıcıya sadece jenerik "tekrar
// dene" mesajı dönerken, burada SendGrid/Resend'den gelen GERÇEK hata metni
// olduğu gibi yanıtta dönüyor ki Render loglarına girmeden kök sebep görülsün.
async function sendTestEmailToSelf(req, res) {
  const user = await User.findById(req.userId).select('email locale')
  if (!user) return res.status(404).json({ error: 'User not found' })
  const provider = getConfiguredProvider()
  try {
    await sendTestEmail(user.email, user.locale)
    res.json({ ok: true, provider, to: user.email })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    // `provider`'ı mesajın İÇİNE de gömüyoruz - istemcideki generic hata
    // gösterici (bkz. authApi.ts request()) sadece `error` alanını kullanıcıya
    // gösteriyor, diğer alanlar (provider/to) sessizce düşüyor.
    res.status(502).json({ ok: false, provider, to: user.email, error: `[${provider}] ${reason}` })
  }
}

module.exports = { sendTestEmailToSelf }
