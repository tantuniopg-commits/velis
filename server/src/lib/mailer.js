const nodemailer = require('nodemailer')

// Gerçek e-posta gönderimi için sağlayıcı zinciri (ilk uygun olan kullanılır):
//   1. RESEND_API_KEY set edilmişse -> Resend HTTP API (tek API key yeterli).
//   2. SENDGRID_API_KEY set edilmişse -> SendGrid HTTP API (tek API key
//      yeterli, EMAIL_FROM SendGrid hesabında doğrulanmış bir gönderici
//      olmalı - bkz. Single Sender Verification).
//   3. SMTP_HOST set edilmişse -> herhangi bir SMTP sağlayıcı (Gmail app
//      password, kurumsal SMTP, vb).
//   4. Hiçbiri yoksa -> Ethereal (nodemailer'ın ücretsiz, kayıt gerektirmeyen
//      test SMTP'si). Gerçek bir gelen kutusuna düşmez ama e-posta GERÇEKTEN
//      gönderilir ve önizleme linki sunucu konsoluna yazdırılır - böylece
//      gönderim ucu asla "kırık" değil, sadece prod'da gerçek sağlayıcı
//      eklenene kadar test modunda.
let etherealTransporterPromise = null

function getEtherealTransporter() {
  if (!etherealTransporterPromise) {
    etherealTransporterPromise = nodemailer.createTestAccount().then((account) =>
      nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      })
    )
  }
  return etherealTransporterPromise
}

let smtpTransporter = null

function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  }
  return smtpTransporter
}

async function sendViaResend(to, subject, html, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'VELIS <onboarding@resend.dev>', to, subject, html, text, reply_to: process.env.EMAIL_REPLY_TO }),
  })
  if (!res.ok) {
    const text2 = await res.text().catch(() => '')
    throw new Error(`Resend API error ${res.status}: ${text2}`)
  }
}

async function sendViaSendGrid(to, subject, html, text) {
  const fromEmail = process.env.EMAIL_FROM || process.env.SENDGRID_VERIFIED_SENDER
  if (!fromEmail) {
    throw new Error('SENDGRID_API_KEY is set but EMAIL_FROM (a Single Sender verified in SendGrid) is missing')
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'VELIS' },
      reply_to: { email: process.env.EMAIL_REPLY_TO || fromEmail },
      subject,
      // Spam filtreleri HTML-only mailleri cezalandırıyor - text/plain
      // alternatifi ÖNCE gelmeli (SendGrid content sırasını bu şekilde
      // bekliyor: düz metin, sonra HTML).
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`SendGrid API error ${res.status}: ${errText}`)
  }
}

function emailShell(headline, bodyHtml) {
  return `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#050505;color:#F5F0EA;padding:36px 28px;border-radius:18px;max-width:420px;margin:0 auto">
    <div style="font-size:12px;letter-spacing:2px;color:#8F8A83;text-transform:uppercase;margin-bottom:18px">VELIS</div>
    ${bodyHtml}
  </div>`
}

// Kayıt sırasındaki e-posta doğrulama kodu (bkz. controllers/otpController.js).
// Kullanıcının o anki uygulama dili (locale) client tarafından istek gövdesinde
// gönderiliyor (bkz. lib/otpApi.ts sendOtpRequest) - password reset ile aynı
// desen, çünkü kullanıcı henüz giriş yapmamış olabiliyor.
const VERIFICATION_COPY = {
  en: {
    subject: 'Your VELIS verification code',
    intro: 'Your verification code is:',
    footer: "This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.",
  },
  tr: {
    subject: 'VELIS doğrulama kodun',
    intro: 'Doğrulama kodun:',
    footer: 'Bu kod 5 dakika içinde geçerliliğini yitirir. Bunu sen istemediysen bu e-postayı görmezden gelebilirsin.',
  },
}

function otpEmailHtml(code, copy) {
  return emailShell(
    null,
    `<p style="font-size:14px;color:#D2CCC5;margin:0 0 22px">${copy.intro}</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#E3C08C">${code}</div>
    <p style="font-size:12px;color:#8F8A83;margin-top:26px;line-height:1.5">${copy.footer}</p>`
  )
}

function otpEmailText(code, copy) {
  return `${copy.intro} ${code}\n\n${copy.footer}`
}

// Sağlayıcı zincirini (Resend/SendGrid/SMTP/Ethereal) tek yerde uygulayan
// genel gönderim fonksiyonu - sendVerificationEmail/sendPasswordChangedEmail
// hepsi bunu kullanıyor, provider değiştiğinde sadece burası değişir.
async function sendEmail(to, subject, html, text) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html, text)
    return
  }

  if (process.env.SENDGRID_API_KEY) {
    await sendViaSendGrid(to, subject, html, text)
    return
  }

  if (process.env.SMTP_HOST) {
    await getSmtpTransporter().sendMail({ from: process.env.EMAIL_FROM || 'VELIS <no-reply@velis.app>', to, subject, html, text })
    return
  }

  const transporter = await getEtherealTransporter()
  const info = await transporter.sendMail({ from: 'VELIS <no-reply@velis.app>', to, subject, html, text })
  console.log(`[mailer] No real provider configured (RESEND_API_KEY/SENDGRID_API_KEY/SMTP_HOST) - sent to Ethereal test inbox. Preview: ${nodemailer.getTestMessageUrl(info)}`)
}

async function sendVerificationEmail(to, code, locale) {
  const copy = VERIFICATION_COPY[locale] || VERIFICATION_COPY.en
  await sendEmail(to, copy.subject, otpEmailHtml(code, copy), otpEmailText(code, copy))
}

// Hesap Ayarları > Şifreyi Değiştir sonrası bildirim maili (bkz.
// authController.js updatePassword) - kullanıcının o anki uygulama dili
// (locale) neyse mail de o dilde gidiyor, best-effort (gönderim başarısız
// olsa da şifre değişimi zaten tamamlanmış oluyor).
const PASSWORD_CHANGED_COPY = {
  en: {
    subject: 'Your VELIS password was changed',
    heading: 'Your password was changed successfully.',
    body: "If you didn't make this change, please contact us immediately.",
  },
  tr: {
    subject: 'VELIS şifreniz değiştirildi',
    heading: 'Şifreniz başarıyla değiştirildi.',
    body: 'Bu değişikliği siz yapmadıysanız lütfen bizimle hemen iletişime geçin.',
  },
}

async function sendPasswordChangedEmail(to, locale) {
  const copy = PASSWORD_CHANGED_COPY[locale] || PASSWORD_CHANGED_COPY.en
  const html = emailShell(
    null,
    `<p style="font-size:16px;color:#F5F0EA;margin:0 0 12px;font-weight:600">${copy.heading}</p>
    <p style="font-size:13px;color:#8F8A83;margin:0;line-height:1.5">${copy.body}</p>`
  )
  const text = `${copy.heading}\n\n${copy.body}`
  await sendEmail(to, copy.subject, html, text)
}

// Şifremi Unuttum akışı (bkz. controllers/passwordResetController.js) -
// kullanıcı henüz giriş yapamadığı için isteğin dilini (locale) client
// gövdede gönderiyor (bkz. lib/authApi.ts forgotPasswordRequest).
const PASSWORD_RESET_COPY = {
  en: {
    subject: 'Reset your VELIS password',
    heading: 'Reset your password',
    intro: 'Use the code below to reset your password:',
    footer: "This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.",
  },
  tr: {
    subject: 'VELIS şifreni sıfırla',
    heading: 'Şifreni sıfırla',
    intro: 'Şifreni sıfırlamak için aşağıdaki kodu kullan:',
    footer: 'Bu kod 10 dakika içinde geçerliliğini yitirir. Bunu sen istemediysen bu e-postayı görmezden gelebilirsin.',
  },
}

async function sendPasswordResetEmail(to, code, locale) {
  const copy = PASSWORD_RESET_COPY[locale] || PASSWORD_RESET_COPY.en
  const html = emailShell(
    null,
    `<p style="font-size:16px;color:#F5F0EA;margin:0 0 4px;font-weight:600">${copy.heading}</p>
    <p style="font-size:13px;color:#D2CCC5;margin:0 0 20px">${copy.intro}</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#E3C08C">${code}</div>
    <p style="font-size:12px;color:#8F8A83;margin-top:26px;line-height:1.5">${copy.footer}</p>`
  )
  const text = `${copy.heading}\n\n${copy.intro} ${code}\n\n${copy.footer}`
  await sendEmail(to, copy.subject, html, text)
}

// Günlük Ritüel Hatırlatması (bkz. jobs/cooldownReminder.js) - 24 saatlik
// soğumanın bitmesine 1 saat kala VE tam bittiğinde, iki ayrı e-posta.
// Metin birebir verilen kopya, iki dilde.
const COOLDOWN_REMINDER_COPY = {
  en: {
    subject: 'One hour to go.',
    lines: [
      '<strong>One hour to go.</strong>',
      'Your 24-hour window is almost complete.',
      '<strong>Complete your ritual. Move forward another day.</strong>',
      'When you\'re ready, return to VELIS and take your next moment.',
      '<strong>Your ritual. Your pace. Your choice.</strong>',
      'See you there.',
    ],
  },
  tr: {
    subject: 'Bir saat kaldı.',
    lines: [
      '<strong>Bir saat kaldı.</strong>',
      '24 saatlik sürenin tamamlanmasına çok az kaldı.',
      '<strong>Ritüelini tamamla. Bir gün daha ilerle.</strong>',
      'Hazır olduğunda VELIS\'e dön ve kendin için bir sonraki anı ayır.',
      '<strong>Ritüelin. Kendi hızın. Kendi seçimin.</strong>',
      'Görüşmek üzere.',
    ],
  },
}

const COOLDOWN_READY_COPY = {
  en: {
    subject: 'Your next ritual is ready.',
    lines: [
      '<strong>Your next ritual is ready.</strong>',
      'A new 24-hour window begins with your next ritual.',
      '<strong>Complete your ritual. Move forward another day.</strong>',
      'Take a moment for yourself, return to VELIS, and keep your journey moving.',
      '<strong>One ritual at a time.</strong>',
      'See you in VELIS.',
    ],
  },
  tr: {
    subject: 'Bir sonraki ritüelin hazır.',
    lines: [
      '<strong>Bir sonraki ritüelin hazır.</strong>',
      'Yeni 24 saatlik dönem, bir sonraki ritüelinle başlıyor.',
      '<strong>Ritüelini tamamla. Bir gün daha ilerle.</strong>',
      'Kendin için bir an ayır, VELIS\'e dön ve yolculuğuna devam et.',
      '<strong>Her seferinde bir ritüel.</strong>',
      'VELIS\'te görüşmek üzere.',
    ],
  },
}

// `copy` çözümlendikten sonra ({ subject, lines }) gerçek gönderimi yapan
// tek nokta - hem sabit kopyalı e-postalar (sendCopyEmail) hem de isim gibi
// dinamik içerik gerektirenler (sendWelcomeEmail) bunu paylaşıyor.
async function sendResolvedCopyEmail(to, copy) {
  const html = emailShell(
    null,
    copy.lines.map((line) => `<p style="font-size:14px;color:#D2CCC5;margin:0 0 14px;line-height:1.5">${line}</p>`).join('')
  )
  const text = copy.lines.map((l) => l.replace(/<\/?strong>/g, '')).join('\n\n')
  await sendEmail(to, copy.subject, html, text)
}

async function sendCopyEmail(to, locale, copyTable) {
  await sendResolvedCopyEmail(to, copyTable[locale] || copyTable.en)
}

async function sendCooldownReminderEmail(to, locale) {
  await sendCopyEmail(to, locale, COOLDOWN_REMINDER_COPY)
}

async function sendCooldownReadyEmail(to, locale) {
  await sendCopyEmail(to, locale, COOLDOWN_READY_COPY)
}

// Hediye günü geri sayımı (bkz. jobs/cooldownReminder.js) - kullanıcı bir
// sonraki hediye gününe (her 7 günde bir, bkz. app/journey/page.tsx day % 7)
// 3/2/1 gün kala, soğuma tam bittiği an gönderiliyor. Sayı OTP kodu gibi
// büyük/dikkat çekici gösteriliyor (bkz. talep - "count gibi düşün").
const REWARD_COUNTDOWN_COPY = {
  en: {
    subject: (daysLeft) => `${daysLeft} day${daysLeft === 1 ? '' : 's'} until your reward!`,
    label: 'Days to go',
    heading: (rewardDay) => `Your Day ${rewardDay} reward is getting close.`,
    body: 'Keep showing up. One ritual at a time.',
    footer: 'See you in VELIS.',
  },
  tr: {
    subject: (daysLeft) => `Ödülüne ${daysLeft} gün kaldı!`,
    label: 'Kalan gün',
    heading: (rewardDay) => `${rewardDay}. gün ödülün yaklaşıyor.`,
    body: 'Gelmeye devam et. Bir seferde bir ritüel.',
    footer: "VELIS'te görüşmek üzere.",
  },
}

async function sendRewardCountdownEmail(to, locale, daysLeft, rewardDay) {
  const copy = REWARD_COUNTDOWN_COPY[locale] || REWARD_COUNTDOWN_COPY.en
  const html = emailShell(
    null,
    `<p style="font-size:11px;letter-spacing:2px;color:#8F8A83;text-transform:uppercase;margin:0 0 10px">${copy.label}</p>
    <div style="font-size:64px;font-weight:800;line-height:1;color:#E3C08C">${daysLeft}</div>
    <p style="font-size:16px;color:#F5F0EA;font-weight:600;margin:20px 0 4px">${copy.heading(rewardDay)}</p>
    <p style="font-size:13px;color:#8F8A83;margin:0 0 22px;line-height:1.5">${copy.body}</p>
    <p style="font-size:14px;color:#D2CCC5;margin:0">${copy.footer}</p>`
  )
  const text = `${copy.label}: ${daysLeft}\n\n${copy.heading(rewardDay)}\n${copy.body}\n\n${copy.footer}`
  await sendEmail(to, copy.subject(daysLeft), html, text)
}

// Kullanıcı adı e-posta HTML'ine girdiği için HTML-escape şart - aksi halde
// `<img onerror=...>` gibi bir isimle kayıt olan biri kendi gelen kutusuna
// (ve admin panelinin herhangi bir ham render'ına) script kaçırabilir.
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Kayıt tamamlanır tamamlanmaz (bkz. authController.js register) gönderilen
// hoş geldin maili - başlıkta kullanıcının adı geçtiği için (talep gereği)
// diğerleri gibi sabit bir tablo değil, isimle inşa edilen bir fonksiyon.
const WELCOME_COPY = {
  en: (name) => ({
    subject: `Welcome to VELIS, ${name}.`,
    lines: [
      `<strong>Welcome to VELIS, ${name}.</strong>`,
      'Your journey starts now.',
      '<strong>One ritual. One choice. One day at a time.</strong>',
      "We're glad you're here.",
    ],
  }),
  tr: (name) => ({
    subject: `VELIS'e Hoş Geldin, ${name}.`,
    lines: [
      `<strong>VELIS'e Hoş Geldin, ${name}.</strong>`,
      'Yolculuğun şimdi başlıyor.',
      '<strong>Bir ritüel. Bir seçim. Bir günde bir adım.</strong>',
      'Burada olduğun için mutluyuz.',
    ],
  }),
}

async function sendWelcomeEmail(to, name, locale) {
  const build = WELCOME_COPY[locale] || WELCOME_COPY.en
  // subject düz metin (escape gereksiz, hatta &amp; gibi görünür), lines HTML.
  const safeName = escapeHtml(name)
  const copy = build(name)
  const safeCopy = build(safeName)
  await sendResolvedCopyEmail(to, { subject: copy.subject, lines: safeCopy.lines })
}

// Kullanıcı bildirimi (bkz. controllers/moderationController.js reportUser) -
// destek adresine ANINDA düşüyor (App Store 1.2: bildirimlere zamanında cevap).
// Alıcı MODERATION_EMAIL, yoksa destek adresi. İngilizce, sadece ekibe gidiyor.
// Bildirenin/bildirilenin girdiği metinler HTML'e girdiği için kaçışlanıyor.
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

async function sendModerationReportEmail(info) {
  const to = process.env.MODERATION_EMAIL || 'contact@forsvelis.com'
  const subject = `[VELIS] User reported${info.count > 1 ? ` (${info.count} reports)` : ''}${info.hidden ? ' - photo auto-hidden' : ''}`
  const lines = [
    `Reported user: ${info.reportedName} (${info.reportedId})`,
    `Reported by: ${info.reporterName} (${info.reporterId})`,
    info.reason ? `Reason: ${info.reason}` : null,
    `Reports against this user: ${info.count}`,
    info.hasPhoto ? `Photo: ${info.photoUrl}${info.hidden ? '  (auto-hidden after repeated reports; the link now returns 404)' : ''}` : 'Photo: none',
    '',
    `To delete the photo: DELETE /api/auth/users/${info.reportedId}/avatar (admin token).`,
    'To see all recent reports: GET /api/auth/reports (admin token).',
  ].filter((l) => l !== null)
  const html = emailShell(
    null,
    `<p style="font-size:16px;color:#F5F0EA;margin:0 0 12px;font-weight:600">User reported</p>
    ${lines.map((l) => `<p style="font-size:13px;color:#D2CCC5;margin:0 0 6px;line-height:1.5;word-break:break-word">${escapeHtml(l)}</p>`).join('')}`
  )
  await sendEmail(to, subject, html, lines.join('\n'))
}

module.exports = {
  sendModerationReportEmail,
  sendVerificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendCooldownReminderEmail,
  sendCooldownReadyEmail,
  sendWelcomeEmail,
  sendRewardCountdownEmail,
}
