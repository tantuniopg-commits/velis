const User = require('../models/User')
const Report = require('../models/Report')
const { toPublicUser, displayNameForLeaderboard } = require('./authController')
const { sendModerationReportEmail } = require('../lib/mailer')

// App Store Guideline 1.2 (kullanıcı içeriği): bildirme mekanizması, engelleme,
// zamanında müdahale. Otomatik GÖRSEL filtre YOK - yerine (1) bildirimler
// anında destek adresine e-postayla düşüyor, (2) aynı fotoğraf birkaç FARKLI
// kişiden bildirim alınca otomatik gizleniyor, (3) yönetici bir fotoğrafı
// sunucudan silebiliyor (bkz. adminRemoveAvatar).
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i
// Bu kadar farklı kişi bildirirse fotoğraf otomatik gizlenir. Küçük tutuldu ki
// kötü bir fotoğraf uzun süre görünmesin; kötüye kullanım (sahte hesaplarla
// birinin fotoğrafını gizletmek) sahibi yeni fotoğraf yükleyince sıfırlanıyor.
const REPORT_HIDE_THRESHOLD = 3
const MAX_REASON = 200

function str(v) {
  return typeof v === 'string' ? v.trim() : ''
}
function validId(v) {
  const id = str(v)
  return OBJECT_ID_RE.test(id) ? id : null
}

// POST /api/auth/report  { userId, reason? }
async function reportUser(req, res) {
  const id = validId(req.body?.userId)
  if (!id) return res.status(400).json({ error: 'A valid userId is required' })
  if (id === String(req.userId)) return res.status(400).json({ error: 'You cannot report yourself' })

  const target = await User.findById(id).select('name avatarVersion avatarHidden')
  if (!target) return res.status(404).json({ error: 'User not found' })

  let created = false
  try {
    await Report.create({ reporter: req.userId, reported: id, reason: str(req.body?.reason).slice(0, MAX_REASON) })
    created = true
  } catch (err) {
    // 11000 = unique index: aynı kişi aynı kullanıcıyı zaten bildirmiş. Hata
    // değil - sessizce başarılı sayıyoruz (tekrar sayılmıyor).
    if (err.code !== 11000) throw err
  }
  res.json({ ok: true })
  if (!created) return

  // Yanıt ZATEN gönderildi - kalan iş kullanıcıyı bekletmiyor ve hata verirse
  // istemciye yansımıyor (bildirim kaydedildi, o asıl olan).
  try {
    const count = await Report.countDocuments({ reported: id })
    let hidden = false
    if (count >= REPORT_HIDE_THRESHOLD && target.avatarVersion && !target.avatarHidden) {
      await User.updateOne({ _id: id }, { $set: { avatarHidden: true } })
      hidden = true
    }
    const reporter = await User.findById(req.userId).select('name').lean()
    await sendModerationReportEmail({
      reportedId: id,
      reportedName: target.name,
      reporterId: String(req.userId),
      reporterName: reporter?.name || '',
      reason: str(req.body?.reason).slice(0, MAX_REASON),
      count,
      hidden,
      hasPhoto: !!target.avatarVersion,
      photoUrl: `${req.protocol}://${req.get('host')}/api/auth/avatar/${id}`,
    })
  } catch (err) {
    console.error('[moderation] post-report work failed', err)
  }
}

// POST /api/auth/block/:id
async function blockUser(req, res) {
  const id = validId(req.params.id)
  if (!id) return res.status(400).json({ error: 'A valid user id is required' })
  if (id === String(req.userId)) return res.status(400).json({ error: 'You cannot block yourself' })
  const exists = await User.exists({ _id: id })
  if (!exists) return res.status(404).json({ error: 'User not found' })
  const user = await User.findByIdAndUpdate(req.userId, { $addToSet: { blockedUsers: id } }, { new: true })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ blockedUsers: toPublicUser(user).blockedUsers })
}

// DELETE /api/auth/block/:id - engeli kaldırma. Hedef silinmiş olsa bile
// kimliği listeden çıkarabilmek için varlığını KONTROL ETMİYOR.
async function unblockUser(req, res) {
  const id = validId(req.params.id)
  if (!id) return res.status(400).json({ error: 'A valid user id is required' })
  const user = await User.findByIdAndUpdate(req.userId, { $pull: { blockedUsers: id } }, { new: true })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ blockedUsers: toPublicUser(user).blockedUsers })
}

// GET /api/auth/blocks - Ayarlar > Gizlilik > Engellenen kullanıcılar. Liderlik
// tablosundakiyle aynı KISALTILMIŞ ad (tam ad başkasına gitmiyor).
async function listBlocks(req, res) {
  const me = await User.findById(req.userId).select('blockedUsers').lean()
  if (!me) return res.status(404).json({ error: 'User not found' })
  const users = await User.find({ _id: { $in: me.blockedUsers || [] } }, 'name').lean()
  res.json({ users: users.map((u) => ({ id: u._id, name: displayNameForLeaderboard(u.name) })) })
}

// --- Yönetici (requireAdmin) ----------------------------------------------

// GET /api/auth/reports - son 100 bildirim, en yeni önce.
async function listReports(req, res) {
  const reports = await Report.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('reporter', 'name email')
    .populate('reported', 'name email avatarVersion avatarHidden')
    .lean()
  res.json({
    reports: reports.map((r) => ({
      id: r._id,
      createdAt: r.createdAt,
      reason: r.reason || '',
      reporter: r.reporter ? { id: r.reporter._id, name: r.reporter.name, email: r.reporter.email } : null,
      reported: r.reported
        ? {
            id: r.reported._id,
            name: r.reported.name,
            email: r.reported.email,
            hasPhoto: !!r.reported.avatarVersion,
            photoHidden: !!r.reported.avatarHidden,
          }
        : null,
    })),
  })
}

// DELETE /api/auth/users/:id/avatar - uygunsuz bir fotoğrafı sunucudan siler.
// Kullanıcı yeni bir fotoğraf yükleyebilir. Bu kullanıcı hakkındaki bildirimler
// çözüldü sayılıp temizleniyor.
async function adminRemoveAvatar(req, res) {
  const id = validId(req.params.id)
  if (!id) return res.status(400).json({ error: 'A valid user id is required' })
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { avatarVersion: 0, avatarHidden: false }, $unset: { avatarData: 1 } },
    { new: true }
  )
  if (!user) return res.status(404).json({ error: 'User not found' })
  await Report.deleteMany({ reported: id })
  res.json({ ok: true })
}

module.exports = { reportUser, blockUser, unblockUser, listBlocks, listReports, adminRemoveAvatar, REPORT_HIDE_THRESHOLD }
