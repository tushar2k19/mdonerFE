/**
 * document.execCommand('fontSize', false, n) uses HTML legacy sizes 1–7.
 * Maps preset key to the pt label shown in dropdowns (for syncing the numeric input).
 *
 * Note: implemented as a plain switch (no Object.freeze / ??) to avoid eslint-loader
 * code-path-analysis crashes in this project's ESLint version.
 */
export function legacyFontPresetKeyToPt (presetKey) {
  const k = parseInt(String(presetKey), 10)
  if (!Number.isFinite(k)) {
    return null
  }
  switch (k) {
    case 1:
      return 8
    case 2:
      return 10
    case 3:
      return 12
    case 4:
      return 14
    case 5:
      return 16
    case 6:
      return 18
    case 7:
      return 24
    default:
      return null
  }
}
