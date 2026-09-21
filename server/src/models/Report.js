const mongoose = require('mongoose')

// Bir kullanıcının başka bir kullanıcıyı (fotoğrafı/adı) bildirmesi - App Store
// Guideline 1.2 (bildirme mekanizması). Aynı kişi aynı kullanıcıyı ikinci kez
// bildiremiyor (unique index) - böylece tek bir kişi tekrar tekrar bildirerek
// otomatik gizleme eşiğine (bkz. moderationController REPORT_HIDE_THRESHOLD)
// tek başına ulaşamıyor.
const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reported: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

reportSchema.index({ reporter: 1, reported: 1 }, { unique: true })

module.exports = mongoose.model('Report', reportSchema)
