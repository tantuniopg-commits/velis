const mongoose = require('mongoose')

// Ritüel before/after hikayesi - kullanıcı günün ritüelinden sonra
// "Liderlik tablosunda paylaş" derse (bkz. app/story/StoryResult.tsx) burada
// saklanıyor. Kişi başına TEK aktif hikaye (unique user) - yenisi eskisinin
// üstüne yazılıyor. 24 saat sonra MongoDB TTL index'i belgeyi kendiliğinden
// siliyor; TTL görevi ~60 sn'de bir çalıştığı için sorgular ayrıca
// STORY_TTL_MS ile süzüyor (bkz. storyController activeStoryFilter).
const STORY_TTL_SEC = 24 * 60 * 60

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // İstemcinin ürettiği 720x1280 JPEG (bkz. app/lib/storyImage.ts). select:false
  // ki leaderboard sorgusu yüzlerce KB'lık görselleri boşuna çekmesin.
  imageData: { type: Buffer, required: true, select: false },
  // Birkaç farklı kişiden bildirim alınca (bkz. moderationController) gizleniyor.
  hidden: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

storySchema.index({ createdAt: 1 }, { expireAfterSeconds: STORY_TTL_SEC })

module.exports = mongoose.model('Story', storySchema)
module.exports.STORY_TTL_MS = STORY_TTL_SEC * 1000
