// Leaderboard servisi - lib/leaderboardData.ts (veri kaynağı) üzerine ince
// bir katman + sıralama/rank hesaplama iş kuralları (daha önce
// app/leaderboard/page.tsx içinde yaşıyordu).
import type { LBUser } from '../lib/leaderboardData'

export * from '../lib/leaderboardData'

export type Metric = 'streak' | 'xp'

export function sortByMetric(users: LBUser[], metric: Metric): LBUser[] {
  return [...users].sort((a, b) => (metric === 'streak' ? b.streakDays - a.streakDays : b.totalXP - a.totalXP))
}

export function formatMetricValue(user: LBUser, metric: Metric): string {
  if (metric === 'xp') return `${user.totalXP.toLocaleString()} XP`
  return `${user.streakDays} day${user.streakDays === 1 ? '' : 's'}`
}

export type Ranking = { top3: LBUser[]; rest: LBUser[]; youRank: number | null }

// Podyum (top3) + geri kalan liste + "You"nun sırası - Leaderboard ekranının
// okuduğu tek türetme noktası. "You" HER ZAMAN sıralamaya dahil edilerek
// hesaplanıyor (önceden top3/rest sadece community'den, youRank ise
// community+you'dan hesaplanıyordu - bu, "You"nun XP'si podyumdaki 1.'den
// yüksek olsa bile tacın yanlış kişide kalmasına yol açan bir tutarsızlıktı).
//
// "You", top3'e girmediyse "rest" içinde GERÇEK sırasındaki yerinde duruyor -
// eskiden listenin en altına sabit bir satır olarak ekleniyordu (rozet doğru
// numarayı gösterse de görsel konumu yanlıştı: 7. sıradaki biri, altındaki
// 8./9./10. sıradaki herkesten SONRA görünüyordu). page.tsx bu satırı
// isYou'ya bakarak vurguluyor (bkz. ListRow).
export function buildRanking(community: LBUser[], you: LBUser | null, metric: Metric): Ranking {
  const combined = sortByMetric(you ? [...community, you] : community, metric)
  const top3 = combined.slice(0, 3)
  const rest = combined.slice(3)
  const youRank = you ? combined.findIndex((u) => u.isYou) + 1 : null

  return { top3, rest, youRank }
}

// Herhangi bir kullanıcının (community veya you) topluluk içindeki sırası -
// profil overlay'inin rozet numarası için.
export function getRankOf(userId: string, community: LBUser[], you: LBUser | null, metric: Metric): number | null {
  const allUsers = you ? [...community, you] : community
  const user = allUsers.find((u) => u.id === userId)
  if (!user) return null
  return sortByMetric(allUsers, metric).findIndex((u) => u.id === userId) + 1
}
