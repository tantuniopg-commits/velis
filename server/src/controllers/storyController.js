const Story = require('../models/Story')
const User = require('../models/User')
const { STORY_TTL_MS } = require('../models/Story')

// Ritüel before/after hikayeleri (24 saat, isteğe bağlı paylaşım). Profil
// fotoğrafıyla aynı güvenlik modeli (bkz. authController decodeAvatar):
// sadece base64 JPEG data URL'i, bayt tavanı ve gerçek JPEG imzası; bayt
// olarak saklanıp image/jpeg + nosniff ile servis ediliyor.
const MAX_STORY_BYTES = 350 * 1024
const DATA_URL_PREFIX = 'data:image/jpeg;base64,'
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

function decodeStory(input) {
  if (typeof input !== 'string' || !input.startsWith(DATA_URL_PREFIX)) return null
  const b64 = input.slice(DATA_URL_PREFIX.length)
  if (b64.length === 0 || b64.length > Math.ceil((MAX_STORY_BYTES * 4) / 3) + 4) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null
  const buf = Buffer.from(b64, 'base64')
  if (buf.length < 4 || buf.length > MAX_STORY_BYTES) return null
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return null
  return buf
}

// TTL index belgeyi en geç ~1 dk gecikmeyle siliyor - o arada süresi dolmuş
// bir hikaye görünmesin diye her okuma bunu da şart koşuyor.
function activeStoryFilter() {
  return { createdAt: { $gt: new Date(Date.now() - STORY_TTL_MS) } }
}

// POST /api/auth/story { image }
async function upsertStory(req, res) {
  const data = decodeStory(req.body?.image)
  if (!data) return res.status(400).json({ error: 'A JPEG image up to 350 KB is required' })
  // Token geçerli ama hesap silinmişse sahipsiz hikaye oluşmasın.
  if (!(await User.exists({ _id: req.userId }))) return res.status(404).json({ error: 'User not found' })
  const story = await Story.findOneAndUpdate(
    { user: req.userId },
    { $set: { imageData: data, hidden: false, createdAt: new Date() } },
    { upsert: true, new: true }
  )
  res.json({ storyVersion: story.createdAt.getTime() })
}

// DELETE /api/auth/story - kullanıcı kendi hikayesini erken kaldırıyor.
async function removeStory(req, res) {
  await Story.deleteOne({ user: req.userId })
  res.json({ ok: true })
}

// GET /api/auth/story/:id - herkese açık (<img src> başlık gönderemiyor),
// leaderboard ve avatarla aynı görünürlükte.
async function getStory(req, res) {
  const id = String(req.params.id || '')
  if (!OBJECT_ID_RE.test(id)) return res.status(404).end()
  const story = await Story.findOne({ user: id, hidden: false, ...activeStoryFilter() }).select('+imageData')
  if (!story) return res.status(404).end()
  res.set({
    'Content-Type': 'image/jpeg',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    // ?v= (createdAt) değişince URL değişiyor. Kısa önbellek: gizlenen/silinen
    // hikaye uzun süre önbellekten servis edilmesin.
    'Cache-Control': 'public, max-age=300',
  })
  res.send(story.imageData)
}

// Leaderboard için: kullanıcı kimliği -> hikaye sürümü (createdAt ms).
async function activeStoryVersions() {
  const stories = await Story.find({ hidden: false, ...activeStoryFilter() }, 'user createdAt').lean()
  const map = new Map()
  for (const s of stories) map.set(String(s.user), s.createdAt.getTime())
  return map
}

// DELETE /api/auth/users/:id/story (admin) - uygunsuz hikayeyi kaldırır.
async function adminRemoveStory(req, res) {
  const id = String(req.params.id || '')
  if (!OBJECT_ID_RE.test(id)) return res.status(400).json({ error: 'A valid user id is required' })
  await Story.deleteOne({ user: id })
  res.json({ ok: true })
}

module.exports = { upsertStory, removeStory, getStory, activeStoryVersions, adminRemoveStory }
