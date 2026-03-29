/**
 * Same calendar logic as TentativeDashboard / FinalDashboard#getHighlightClass:
 * yellow background always; red text if review date is today, else black text.
 * Missing dates still get yellow + black (task table behavior).
 */
export function getReviewDateHighlightClasses (reviewDate) {
  const today = new Date()
  const review = reviewDate ? new Date(reviewDate) : null
  const isToday =
    review &&
    review.getFullYear() === today.getFullYear() &&
    review.getMonth() === today.getMonth() &&
    review.getDate() === today.getDate()

  return ['yellow-bg-bold', isToday ? 'red-text' : 'black-text']
}

/** Skip yellow pill when there is no date (diff date column omits empty dates; reviewer-only uses `getReviewDateHighlightClasses(null)`). */
export function getReviewDateHighlightClassesIfSet (reviewDate) {
  if (reviewDate == null || reviewDate === '') return []
  const review = new Date(reviewDate)
  if (isNaN(review.getTime())) return []
  return getReviewDateHighlightClasses(reviewDate)
}
