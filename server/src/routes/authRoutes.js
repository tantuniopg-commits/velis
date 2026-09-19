const express = require('express')
const requireAuth = require('../middleware/auth')
const requireAdmin = require('../middleware/requireAdmin')
const {
  register,
  login,
  me,
  updateStats,
  updateProfile,
  updatePreferences,
  updatePassword,
  updateAvatar,
  removeAvatar,
  getAvatar,
  removeAccount,
  leaderboard,
  listUsers,
  checkEmail,
  checkPhone,
} = require('../controllers/authController')
const { forgotPassword, verifyResetCode, resetPassword } = require('../controllers/passwordResetController')

const router = express.Router()

const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next)

router.post('/register', asyncHandler(register))
router.post('/login', asyncHandler(login))
router.get('/me', requireAuth, asyncHandler(me))
router.patch('/stats', requireAuth, asyncHandler(updateStats))
router.patch('/profile', requireAuth, asyncHandler(updateProfile))
router.patch('/preferences', requireAuth, asyncHandler(updatePreferences))
router.patch('/password', requireAuth, asyncHandler(updatePassword))
router.patch('/avatar', requireAuth, asyncHandler(updateAvatar))
router.delete('/avatar', requireAuth, asyncHandler(removeAvatar))
// Herkese açık - <img src> Authorization başlığı gönderemez, leaderboard'daki
// başkalarının fotoğrafları da buradan geliyor (bkz. getAvatar).
router.get('/avatar/:id', asyncHandler(getAvatar))
router.delete('/account', requireAuth, asyncHandler(removeAccount))
router.post('/forgot-password', asyncHandler(forgotPassword))
router.post('/verify-reset-code', asyncHandler(verifyResetCode))
router.post('/reset-password', asyncHandler(resetPassword))
router.get('/leaderboard', asyncHandler(leaderboard))
router.get('/check-email', asyncHandler(checkEmail))
router.get('/check-phone', asyncHandler(checkPhone))
// Admin panelindeki kayıtlı hesaplar görünümü - SADECE admin e-postalarıyla
// (bkz. middleware/requireAdmin.js, lib/admins.js).
router.get('/users', requireAdmin, asyncHandler(listUsers))

module.exports = router
